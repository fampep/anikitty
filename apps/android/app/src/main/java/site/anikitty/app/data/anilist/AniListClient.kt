package site.anikitty.app.data.anilist

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Public AniList GraphQL — catalog metadata only.
 * Playback comes from the selected built-in watch server.
 */
class AniListClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

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
            """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: TRENDING_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun popular(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: POPULARITY_DESC) { $mediaFields }
              }
            }
            """.trimIndent(),
            mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun seasonal(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: SCORE_DESC, status_in: [RELEASING]) { $mediaFields }
              }
            }
            """.trimIndent(),
            mapOf("page" to page, "perPage" to perPage),
        )

    suspend fun search(query: String, page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            """
            query (${'$'}page: Int, ${'$'}perPage: Int, ${'$'}search: String) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, search: ${'$'}search, sort: SEARCH_MATCH) { $mediaFields }
              }
            }
            """.trimIndent(),
            mapOf("page" to page, "perPage" to perPage, "search" to query),
        )

    suspend fun media(id: Int): AnimeSummary? = withContext(Dispatchers.IO) {
        val graphql = """
            query (${'$'}id: Int) {
              Media(id: ${'$'}id, type: ANIME) { $mediaFields }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject().put("id", id))
            .toString()
        val request = Request.Builder()
            .url(ENDPOINT)
            .post(payload.toRequestBody(jsonMedia))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("AniList HTTP ${response.code}: ${body.take(200)}")
            }
            val media = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
                ?: return@use null
            parseMedia(media)
        }
    }

    private suspend fun queryMedia(
        graphql: String,
        variables: Map<String, Any>,
    ): List<AnimeSummary> = withContext(Dispatchers.IO) {
        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject(variables))
            .toString()
        val request = Request.Builder()
            .url(ENDPOINT)
            .post(payload.toRequestBody(jsonMedia))
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                throw IllegalStateException("AniList HTTP ${response.code}: ${body.take(200)}")
            }
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
