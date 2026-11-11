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
 * Public AniList GraphQL — no AniKitty account required.
 * Catalog metadata only; playback comes from local extensions later.
 */
class AniListClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()

    suspend fun trending(page: Int = 1, perPage: Int = 24): List<AnimeSummary> =
        queryMedia(
            """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: TRENDING_DESC) {
                  id
                  title { romaji english }
                  coverImage { large }
                  episodes
                  format
                  averageScore
                }
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
                media(type: ANIME, search: ${'$'}search, sort: SEARCH_MATCH) {
                  id
                  title { romaji english }
                  coverImage { large }
                  episodes
                  format
                  averageScore
                }
              }
            }
            """.trimIndent(),
            mapOf("page" to page, "perPage" to perPage, "search" to query),
        )

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
                    val item = media.getJSONObject(i)
                    val titles = item.getJSONObject("title")
                    val title = titles.optString("english").ifBlank { titles.optString("romaji") }
                    add(
                        AnimeSummary(
                            id = item.getInt("id"),
                            title = title.ifBlank { "Anime #${item.getInt("id")}" },
                            coverImageUrl = item.optJSONObject("coverImage")?.optString("large"),
                            episodes = item.optInt("episodes").takeIf { item.has("episodes") && !item.isNull("episodes") },
                            format = item.optString("format").takeIf { it.isNotBlank() },
                            averageScore = item.optInt("averageScore")
                                .takeIf { item.has("averageScore") && !item.isNull("averageScore") },
                        ),
                    )
                }
            }
        }
    }

    private companion object {
        const val ENDPOINT = "https://graphql.anilist.co"
    }
}
