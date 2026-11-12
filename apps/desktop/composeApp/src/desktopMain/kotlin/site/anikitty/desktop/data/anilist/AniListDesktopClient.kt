package site.anikitty.desktop.data.anilist

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

data class AniListMedia(
    val id: Int,
    val title: String,
    val coverUrl: String?,
    val episodes: Int?,
    val seasonYear: Int?,
    val averageScore: Int?,
)

/**
 * JVM AniList GraphQL client — first shared-shape port from Android.
 * Public trending catalog only for the desktop scaffold (no MediaList yet).
 */
class AniListDesktopClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build(),
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val gate = Mutex()
    private val lastRequestAt = AtomicLong(0L)

    suspend fun trending(page: Int = 1, perPage: Int = 24): List<AniListMedia> =
        withContext(Dispatchers.IO) {
            val graphql = """
                query (${'$'}page: Int, ${'$'}perPage: Int) {
                  Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                    media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
                      id
                      title { romaji english }
                      coverImage { large }
                      episodes
                      seasonYear
                      averageScore
                    }
                  }
                }
            """.trimIndent()
            val payload = JSONObject()
                .put("query", graphql)
                .put(
                    "variables",
                    JSONObject().put("page", page).put("perPage", perPage),
                )
                .toString()
            val body = execute(payload)
            val media = JSONObject(body)
                .optJSONObject("data")
                ?.optJSONObject("Page")
                ?.optJSONArray("media")
                ?: return@withContext emptyList()
            buildList {
                for (i in 0 until media.length()) {
                    val m = media.getJSONObject(i)
                    val titles = m.optJSONObject("title")
                    val title = titles?.optString("english")
                        ?.takeIf { it.isNotBlank() && it != "null" }
                        ?: titles?.optString("romaji").orEmpty()
                    add(
                        AniListMedia(
                            id = m.getInt("id"),
                            title = title.ifBlank { "Untitled" },
                            coverUrl = m.optJSONObject("coverImage")
                                ?.optString("large")
                                ?.takeIf { it.isNotBlank() && it != "null" },
                            episodes = m.optInt("episodes").takeIf { m.has("episodes") && !m.isNull("episodes") },
                            seasonYear = m.optInt("seasonYear")
                                .takeIf { m.has("seasonYear") && !m.isNull("seasonYear") },
                            averageScore = m.optInt("averageScore")
                                .takeIf { m.has("averageScore") && !m.isNull("averageScore") },
                        ),
                    )
                }
            }
        }

    suspend fun search(query: String, page: Int = 1): List<AniListMedia> =
        withContext(Dispatchers.IO) {
            val q = query.trim()
            if (q.length < 2) return@withContext emptyList()
            val graphql = """
                query (${'$'}page: Int, ${'$'}search: String) {
                  Page(page: ${'$'}page, perPage: 24) {
                    media(type: ANIME, search: ${'$'}search, sort: SEARCH_MATCH, isAdult: false) {
                      id
                      title { romaji english }
                      coverImage { large }
                      episodes
                      seasonYear
                      averageScore
                    }
                  }
                }
            """.trimIndent()
            val payload = JSONObject()
                .put("query", graphql)
                .put(
                    "variables",
                    JSONObject().put("page", page).put("search", q),
                )
                .toString()
            val body = execute(payload)
            val media = JSONObject(body)
                .optJSONObject("data")
                ?.optJSONObject("Page")
                ?.optJSONArray("media")
                ?: return@withContext emptyList()
            buildList {
                for (i in 0 until media.length()) {
                    val m = media.getJSONObject(i)
                    val titles = m.optJSONObject("title")
                    val title = titles?.optString("english")
                        ?.takeIf { it.isNotBlank() && it != "null" }
                        ?: titles?.optString("romaji").orEmpty()
                    add(
                        AniListMedia(
                            id = m.getInt("id"),
                            title = title.ifBlank { "Untitled" },
                            coverUrl = m.optJSONObject("coverImage")
                                ?.optString("large")
                                ?.takeIf { it.isNotBlank() && it != "null" },
                            episodes = m.optInt("episodes").takeIf { m.has("episodes") && !m.isNull("episodes") },
                            seasonYear = m.optInt("seasonYear")
                                .takeIf { m.has("seasonYear") && !m.isNull("seasonYear") },
                            averageScore = m.optInt("averageScore")
                                .takeIf { m.has("averageScore") && !m.isNull("averageScore") },
                        ),
                    )
                }
            }
        }

    private suspend fun execute(payload: String): String = gate.withLock {
        val gap = 350L - (System.currentTimeMillis() - lastRequestAt.get())
        if (gap > 0) delay(gap)
        lastRequestAt.set(System.currentTimeMillis())
        val request = Request.Builder()
            .url("https://graphql.anilist.co")
            .header("Accept", "application/json")
            .header("Content-Type", "application/json")
            .header(
                "User-Agent",
                "AniKitty-Desktop/0.1 (https://github.com/fampep/anikitty)",
            )
            .post(payload.toRequestBody(jsonMedia))
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                error("AniList HTTP ${response.code}: ${body.take(200)}")
            }
            body
        }
    }
}
