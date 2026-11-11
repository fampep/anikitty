package site.anikitty.app.data.anilist

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

/**
 * Public AniList GraphQL — catalog metadata only.
 * Cached + rate-limited so the app does not trip AniList's public API limits.
 */
class AniListClient(
    context: Context? = null,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    private val cache = context?.let { AniListCache(it) }
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val gate = Mutex()
    private val lastRequestAt = AtomicLong(0L)

    private val mediaFields = """
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        episodes
        format
        averageScore
        description(asHtml: false)
    """.trimIndent()

    suspend fun trending(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            cacheKey = "trending:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: TRENDING_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun popular(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            cacheKey = "popular:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: POPULARITY_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun seasonal(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            cacheKey = "seasonal:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: SCORE_DESC, status_in: [RELEASING]) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun search(query: String, page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            cacheKey = "search:${query.trim().lowercase()}:$page:$perPage",
            ttlMs = AniListCache.TTL_SEARCH_MS,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int, ${'$'}search: String) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, search: ${'$'}search, sort: SEARCH_MATCH) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage, "search" to query),
        )

    suspend fun media(id: Int): AnimeSummary? = withContext(Dispatchers.IO) {
        val cacheKey = "media:$id"
        cache?.get(cacheKey, AniListCache.TTL_MEDIA_MS)?.let { body ->
            val media = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
            if (media != null) return@withContext parseMedia(media)
        }
        val graphql = """
            query (${'$'}id: Int) {
              Media(id: ${'$'}id, type: ANIME) { $mediaFields }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject().put("id", id))
            .toString()
        val body = execute(payload)
        cache?.put(cacheKey, body)
        val media = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
            ?: return@withContext null
        parseMedia(media)
    }

    private suspend fun queryMedia(
        cacheKey: String,
        ttlMs: Long,
        graphql: String,
        variables: Map<String, Any>,
    ): List<AnimeSummary> = withContext(Dispatchers.IO) {
        cache?.getList(cacheKey, ttlMs) { arr ->
            buildList {
                for (i in 0 until arr.length()) add(parseMedia(arr.getJSONObject(i)))
            }
        }?.let { return@withContext it }

        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject(variables))
            .toString()
        val body = execute(payload)
        cache?.putList(cacheKey, body)
        val media = JSONObject(body)
            .getJSONObject("data")
            .getJSONObject("Page")
            .getJSONArray("media")
        buildList {
            for (i in 0 until media.length()) {
                add(parseMedia(media.getJSONObject(i)))
            }
        }
    }

    private suspend fun execute(payload: String): String {
        gate.withLock {
            val now = System.currentTimeMillis()
            val wait = MIN_INTERVAL_MS - (now - lastRequestAt.get())
            if (wait > 0) delay(wait)
            var attempt = 0
            var lastError: Exception? = null
            while (attempt < 3) {
                attempt++
                val request = Request.Builder()
                    .url(ENDPOINT)
                    .post(payload.toRequestBody(jsonMedia))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                    .build()
                data class Attempt(val body: String? = null, val retryAfterSec: Long? = null, val error: Exception? = null)
                val attemptResult = try {
                    http.newCall(request).execute().use { response ->
                        val body = response.body?.string().orEmpty()
                        lastRequestAt.set(System.currentTimeMillis())
                        when {
                            response.code == 429 -> Attempt(
                                retryAfterSec = response.header("Retry-After")?.toLongOrNull()
                                    ?: (attempt * 2L),
                            )
                            !response.isSuccessful -> Attempt(
                                error = IllegalStateException(
                                    "AniList HTTP ${response.code}: ${body.take(200)}",
                                ),
                            )
                            else -> Attempt(body = body)
                        }
                    }
                } catch (e: Exception) {
                    Attempt(error = e)
                }
                when {
                    attemptResult.body != null -> return attemptResult.body
                    attemptResult.retryAfterSec != null -> {
                        lastError = IllegalStateException("AniList rate limited")
                        delay(attemptResult.retryAfterSec.coerceIn(1L, 30L) * 1000L)
                    }
                    else -> {
                        lastError = attemptResult.error
                        delay(attempt * 400L)
                    }
                }
            }
            throw lastError ?: IllegalStateException("AniList request failed")
        }
    }

    private fun parseMedia(item: JSONObject): AnimeSummary {
        val titles = item.getJSONObject("title")
        val title = titles.nullableString("english")
            ?: titles.nullableString("romaji")
            ?: "Anime #${item.getInt("id")}"
        return AnimeSummary(
            id = item.getInt("id"),
            title = title,
            coverImageUrl = item.optJSONObject("coverImage")?.nullableString("large"),
            bannerImageUrl = item.nullableString("bannerImage"),
            episodes = item.nullableInt("episodes"),
            format = item.nullableString("format"),
            averageScore = item.nullableInt("averageScore"),
            description = item.nullableString("description")?.replace(Regex("<[^>]+>"), " ")
                ?.replace(Regex("\\s+"), " ")
                ?.trim(),
        )
    }

    private companion object {
        const val ENDPOINT = "https://graphql.anilist.co"
        const val MIN_INTERVAL_MS = 700L

        fun JSONObject.nullableString(key: String): String? {
            if (!has(key) || isNull(key)) return null
            return getString(key).takeIf { it.isNotBlank() }
        }

        fun JSONObject.nullableInt(key: String): Int? {
            if (!has(key) || isNull(key)) return null
            return getInt(key)
        }
    }
}
