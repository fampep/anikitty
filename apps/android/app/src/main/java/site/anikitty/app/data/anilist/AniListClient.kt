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
 * AniList GraphQL — public catalog + optional authenticated MediaList sync.
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
        idMal
        title { romaji english native }
        synonyms
        coverImage { large }
        bannerImage
        episodes
        format
        status
        season
        seasonYear
        duration
        popularity
        averageScore
        genres
        description(asHtml: false)
        studios(isMain: true) { nodes { name } }
        trailer { id site thumbnail }
        externalLinks { site url }
    """.trimIndent()

    /** Richer payload for the title detail screen (episodes + relations). */
    private val mediaDetailFields = """
        $mediaFields
        streamingEpisodes { title thumbnail url site }
        relations {
          edges {
            relationType
            node {
              id
              title { romaji english }
              coverImage { large }
              format
              type
              episodes
              season
              seasonYear
            }
          }
        }
    """.trimIndent()

    suspend fun viewer(accessToken: String): AniListViewer? = withContext(Dispatchers.IO) {
        val graphql = """
            query {
              Viewer {
                id
                name
                about
                avatar { large }
                bannerImage
                statistics {
                  anime {
                    count
                    episodesWatched
                    minutesWatched
                    meanScore
                    statuses { status count }
                  }
                }
              }
            }
        """.trimIndent()
        val payload = JSONObject().put("query", graphql).toString()
        val body = execute(payload, accessToken)
        val viewer = JSONObject(body).optJSONObject("data")?.optJSONObject("Viewer")
            ?: return@withContext null
        val animeStats = viewer.optJSONObject("statistics")?.optJSONObject("anime")
        val statuses = animeStats?.optJSONArray("statuses")
        fun statusCount(name: String): Int {
            if (statuses == null) return 0
            for (i in 0 until statuses.length()) {
                val row = statuses.optJSONObject(i) ?: continue
                if (row.optString("status").equals(name, ignoreCase = true)) {
                    return row.optInt("count")
                }
            }
            return 0
        }
        AniListViewer(
            id = viewer.getInt("id"),
            name = viewer.optString("name").ifBlank { "AniList" },
            avatarUrl = viewer.optJSONObject("avatar")?.nullableString("large"),
            bannerUrl = viewer.nullableString("bannerImage"),
            about = viewer.nullableString("about"),
            animeCount = animeStats?.optInt("count") ?: 0,
            episodesWatched = animeStats?.optInt("episodesWatched") ?: 0,
            minutesWatched = animeStats?.optInt("minutesWatched") ?: 0,
            meanScore = animeStats?.optDouble("meanScore", 0.0)?.takeIf { it.isFinite() } ?: 0.0,
            watching = statusCount("CURRENT"),
            completed = statusCount("COMPLETED"),
            planning = statusCount("PLANNING"),
            paused = statusCount("PAUSED"),
            dropped = statusCount("DROPPED"),
        )
    }

    suspend fun mediaListEntries(
        accessToken: String,
        userId: Int,
    ): List<AniListMediaListEntry> = withContext(Dispatchers.IO) {
        val graphql = """
            query (${'$'}userId: Int, ${'$'}type: MediaType) {
              MediaListCollection(userId: ${'$'}userId, type: ${'$'}type) {
                lists {
                  status
                  entries {
                    status
                    progress
                    media { $mediaFields }
                  }
                }
              }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put(
                "variables",
                JSONObject()
                    .put("userId", userId)
                    .put("type", "ANIME"),
            )
            .toString()
        val body = execute(payload, accessToken)
        val lists = JSONObject(body)
            .optJSONObject("data")
            ?.optJSONObject("MediaListCollection")
            ?.optJSONArray("lists")
            ?: return@withContext emptyList()
        buildList {
            for (i in 0 until lists.length()) {
                val list = lists.optJSONObject(i) ?: continue
                val listStatus = list.optString("status").ifBlank { "CURRENT" }
                val entries = list.optJSONArray("entries") ?: continue
                for (j in 0 until entries.length()) {
                    val row = entries.optJSONObject(j) ?: continue
                    val media = row.optJSONObject("media") ?: continue
                    add(
                        AniListMediaListEntry(
                            status = row.optString("status").ifBlank { listStatus },
                            progress = row.optInt("progress", 0).coerceAtLeast(0),
                            media = parseMedia(media),
                        ),
                    )
                }
            }
        }
    }

    suspend fun saveProgress(
        accessToken: String,
        mediaId: Int,
        progress: Int,
        status: String = "CURRENT",
    ): Boolean = withContext(Dispatchers.IO) {
        val graphql = """
            mutation (${'$'}mediaId: Int, ${'$'}status: MediaListStatus, ${'$'}progress: Int) {
              SaveMediaListEntry(mediaId: ${'$'}mediaId, status: ${'$'}status, progress: ${'$'}progress) {
                id
                status
                progress
              }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put(
                "variables",
                JSONObject()
                    .put("mediaId", mediaId)
                    .put("status", status)
                    .put("progress", progress),
            )
            .toString()
        runCatching {
            val body = execute(payload, accessToken)
            JSONObject(body).optJSONObject("data")?.optJSONObject("SaveMediaListEntry") != null
        }.getOrDefault(false)
    }

    fun invalidateCache() {
        cache?.clearAll()
    }

    suspend fun trending(
        page: Int = 1,
        perPage: Int = 24,
        forceRefresh: Boolean = false,
    ): List<AnimeSummary> =
        queryMedia(
            cacheKey = "trending:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            forceRefresh = forceRefresh,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: TRENDING_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun popular(
        page: Int = 1,
        perPage: Int = 24,
        forceRefresh: Boolean = false,
    ): List<AnimeSummary> =
        queryMedia(
            cacheKey = "popular:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            forceRefresh = forceRefresh,
            graphql = """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: POPULARITY_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            variables = mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun seasonal(
        page: Int = 1,
        perPage: Int = 24,
        forceRefresh: Boolean = false,
    ): List<AnimeSummary> =
        queryMedia(
            cacheKey = "seasonal:$page:$perPage",
            ttlMs = AniListCache.TTL_FEED_MS,
            forceRefresh = forceRefresh,
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
        val cacheKey = "mediaDetail:v3:$id"
        cache?.get(cacheKey, AniListCache.TTL_MEDIA_MS)?.let { body ->
            val media = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
            if (media != null) return@withContext parseMedia(media, detail = true)
        }
        val graphql = """
            query (${'$'}id: Int) {
              Media(id: ${'$'}id, type: ANIME) { $mediaDetailFields }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject().put("id", id))
            .toString()
        val body = execute(payload, accessToken = null)
        cache?.put(cacheKey, body)
        val media = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
            ?: return@withContext null
        parseMedia(media, detail = true)
    }

    private suspend fun queryMedia(
        cacheKey: String,
        ttlMs: Long,
        graphql: String,
        variables: Map<String, Any>,
        forceRefresh: Boolean = false,
    ): List<AnimeSummary> = withContext(Dispatchers.IO) {
        if (forceRefresh) {
            cache?.invalidate(cacheKey)
        } else {
            cache?.getList(cacheKey, ttlMs) { arr ->
                buildList {
                    for (i in 0 until arr.length()) add(parseMedia(arr.getJSONObject(i)))
                }
            }?.let { return@withContext it }
        }

        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject(variables))
            .toString()
        val body = execute(payload, accessToken = null)
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

    private suspend fun execute(payload: String, accessToken: String?): String {
        gate.withLock {
            val now = System.currentTimeMillis()
            val wait = MIN_INTERVAL_MS - (now - lastRequestAt.get())
            if (wait > 0) delay(wait)
            var attempt = 0
            var lastError: Exception? = null
            while (attempt < 3) {
                attempt++
                val requestBuilder = Request.Builder()
                    .url(ENDPOINT)
                    .post(payload.toRequestBody(jsonMedia))
                    .header("Accept", "application/json")
                    .header("Content-Type", "application/json")
                if (!accessToken.isNullOrBlank()) {
                    requestBuilder.header("Authorization", "Bearer $accessToken")
                }
                val request = requestBuilder.build()
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
                            else -> {
                                val err = JSONObject(body).optJSONArray("errors")
                                if (err != null && err.length() > 0) {
                                    Attempt(
                                        error = IllegalStateException(
                                            err.optJSONObject(0)?.optString("message")
                                                ?: "AniList GraphQL error",
                                        ),
                                    )
                                } else {
                                    Attempt(body = body)
                                }
                            }
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

    private fun parseMedia(item: JSONObject, detail: Boolean = false): AnimeSummary {
        val titles = item.getJSONObject("title")
        val romaji = titles.nullableString("romaji")
        val english = titles.nullableString("english")
        val native = titles.nullableString("native")
        val title = english ?: romaji ?: "Anime #${item.getInt("id")}"
        val genres = item.optJSONArray("genres")?.toStringList().orEmpty()
        val studios = item.optJSONObject("studios")
            ?.optJSONArray("nodes")
            ?.toObjectList()
            ?.mapNotNull { it.nullableString("name") }
            .orEmpty()
        val trailerObj = item.optJSONObject("trailer")
        val trailer = trailerObj?.nullableString("id")?.let { tid ->
            AnimeTrailer(
                id = tid,
                site = trailerObj.optString("site", "youtube"),
                thumbnailUrl = trailerObj.nullableString("thumbnail"),
            )
        }
        val links = item.optJSONArray("externalLinks")
            ?.toObjectList()
            ?.mapNotNull { link ->
                val site = link.nullableString("site") ?: return@mapNotNull null
                val url = link.nullableString("url") ?: return@mapNotNull null
                AnimeExternalLink(site = site, url = url)
            }
            .orEmpty()
            .distinctBy { it.site.lowercase() }
            .take(8)
        val relations = if (detail) {
            item.optJSONObject("relations")
                ?.optJSONArray("edges")
                ?.toObjectList()
                ?.mapNotNull { edge ->
                    val node = edge.optJSONObject("node") ?: return@mapNotNull null
                    if (node.optString("type") != "ANIME") return@mapNotNull null
                    val nodeTitles = node.optJSONObject("title")
                    val relTitle = nodeTitles?.nullableString("english")
                        ?: nodeTitles?.nullableString("romaji")
                        ?: return@mapNotNull null
                    AnimeRelation(
                        id = node.getInt("id"),
                        title = relTitle,
                        coverImageUrl = node.optJSONObject("coverImage")?.nullableString("large"),
                        relationType = edge.optString("relationType", "RELATED")
                            .replace('_', ' ')
                            .lowercase()
                            .replaceFirstChar { it.titlecase() },
                        format = node.nullableString("format"),
                        episodes = node.nullableInt("episodes"),
                        season = node.nullableString("season"),
                        seasonYear = node.nullableInt("seasonYear"),
                    )
                }
                .orEmpty()
                .distinctBy { it.id }
                .take(24)
        } else {
            emptyList()
        }
        val streaming = if (detail) {
            item.optJSONArray("streamingEpisodes")
                ?.toObjectList()
                ?.mapNotNull { row ->
                    val epTitle = row.nullableString("title") ?: return@mapNotNull null
                    AnimeStreamingEpisode(
                        title = epTitle,
                        thumbnailUrl = row.nullableString("thumbnail"),
                        url = row.nullableString("url"),
                        site = row.nullableString("site"),
                    )
                }
                .orEmpty()
        } else {
            emptyList()
        }
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
            romajiTitle = romaji?.takeIf { it != title },
            nativeTitle = native?.takeIf { it != title && it != romaji },
            malId = item.nullableInt("idMal"),
            status = item.nullableString("status"),
            season = item.nullableString("season"),
            seasonYear = item.nullableInt("seasonYear"),
            durationMinutes = item.nullableInt("duration"),
            popularity = item.nullableInt("popularity"),
            genres = genres,
            studios = studios,
            trailer = trailer,
            externalLinks = links,
            relations = relations,
            streamingEpisodes = streaming,
            detailLoaded = detail,
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

        fun JSONArray.toStringList(): List<String> = buildList {
            for (i in 0 until length()) {
                optString(i)?.takeIf { it.isNotBlank() }?.let { add(it) }
            }
        }

        fun JSONArray.toObjectList(): List<JSONObject> = buildList {
            for (i in 0 until length()) {
                optJSONObject(i)?.let { add(it) }
            }
        }
    }
}
