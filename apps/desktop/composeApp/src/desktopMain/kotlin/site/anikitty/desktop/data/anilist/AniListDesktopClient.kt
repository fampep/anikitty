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
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicLong

data class AniListMedia(
    val id: Int,
    val title: String,
    val coverUrl: String?,
    val bannerUrl: String? = null,
    val episodes: Int?,
    val season: String? = null,
    val seasonYear: Int?,
    val averageScore: Int?,
    val format: String? = null,
    val status: String? = null,
    val description: String? = null,
    val genres: List<String> = emptyList(),
    val studios: List<String> = emptyList(),
    val relations: List<AniListRelation> = emptyList(),
    val streamingEpisodes: List<AniListStreamingEpisode> = emptyList(),
    val detailLoaded: Boolean = false,
) {
    fun seasonLabel(): String? {
        val s = season?.lowercase()?.replaceFirstChar { it.titlecase() }
        return when {
            s != null && seasonYear != null -> "$s $seasonYear"
            seasonYear != null -> seasonYear.toString()
            s != null -> s
            else -> null
        }
    }

    /** AniList PREQUEL/SEQUEL TV/ONA only — catalog seasons, not TMDB. */
    fun seasonEntries(): List<AniListRelation> {
        val self = AniListRelation(
            id = id,
            title = title,
            coverUrl = coverUrl,
            relationType = "Current",
            format = format,
            episodes = episodes,
            season = season,
            seasonYear = seasonYear,
        )
        val formats = setOf("TV", "TV_SHORT", "ONA")
        val chain = relations.filter { rel ->
            val fmt = rel.format?.uppercase()
            val kind = rel.relationType.uppercase().replace(' ', '_')
            (fmt == null || fmt in formats) && kind in setOf("PREQUEL", "SEQUEL")
        }
        return (listOf(self) + chain)
            .distinctBy { it.id }
            .sortedWith(
                compareBy<AniListRelation> { it.seasonYear ?: Int.MAX_VALUE }
                    .thenBy { it.id },
            )
    }

    fun relatedOutsideSeasons(): List<AniListRelation> {
        val seasonIds = seasonEntries().map { it.id }.toSet()
        return relations.filterNot { it.id in seasonIds }
    }

    fun episodeItems(): List<AniListEpisodeItem> {
        val byNumber = LinkedHashMap<Int, AniListStreamingEpisode>()
        streamingEpisodes.forEachIndexed { index, ep ->
            val n = parseAniListEpisodeNumber(ep.title) ?: (index + 1)
            byNumber.putIfAbsent(n, ep)
        }
        val maxFromStream = byNumber.keys.maxOrNull() ?: 0
        val max = (episodes ?: maxFromStream).coerceAtLeast(maxFromStream).coerceAtLeast(1)
            .coerceAtMost(2000)
        return (1..max).map { n ->
            val stream = byNumber[n]
            AniListEpisodeItem(
                number = n,
                title = stream?.title?.takeIf { it.isNotBlank() } ?: "Episode $n",
                thumbnailUrl = stream?.thumbnailUrl ?: coverUrl,
            )
        }
    }
}

data class AniListRelation(
    val id: Int,
    val title: String,
    val coverUrl: String?,
    val relationType: String,
    val format: String? = null,
    val episodes: Int? = null,
    val season: String? = null,
    val seasonYear: Int? = null,
) {
    fun seasonLabel(): String? {
        val s = season?.lowercase()?.replaceFirstChar { it.titlecase() }
        return when {
            s != null && seasonYear != null -> "$s $seasonYear"
            seasonYear != null -> seasonYear.toString()
            s != null -> s
            else -> null
        }
    }
}

data class AniListStreamingEpisode(
    val title: String,
    val thumbnailUrl: String? = null,
)

data class AniListEpisodeItem(
    val number: Int,
    val title: String,
    val thumbnailUrl: String?,
)

/**
 * JVM AniList GraphQL — sole catalog source for desktop (titles / seasons / episodes / related).
 * Extensions later provide stream URLs only.
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

    private val cardFields = """
        id
        title { romaji english }
        coverImage { large }
        bannerImage
        episodes
        format
        status
        season
        seasonYear
        averageScore
    """.trimIndent()

    suspend fun trending(page: Int = 1, perPage: Int = 24): List<AniListMedia> =
        pageMedia(
            """
            query (${'$'}page: Int, ${'$'}perPage: Int) {
              Page(page: ${'$'}page, perPage: ${'$'}perPage) {
                media(type: ANIME, sort: TRENDING_DESC, isAdult: false) {
                  $cardFields
                }
              }
            }
            """.trimIndent(),
            JSONObject().put("page", page).put("perPage", perPage),
        )

    suspend fun search(query: String, page: Int = 1): List<AniListMedia> {
        val q = query.trim()
        if (q.length < 2) return emptyList()
        return pageMedia(
            """
            query (${'$'}page: Int, ${'$'}search: String) {
              Page(page: ${'$'}page, perPage: 24) {
                media(type: ANIME, search: ${'$'}search, sort: SEARCH_MATCH, isAdult: false) {
                  $cardFields
                }
              }
            }
            """.trimIndent(),
            JSONObject().put("page", page).put("search", q),
        )
    }

    suspend fun media(id: Int): AniListMedia? = withContext(Dispatchers.IO) {
        val graphql = """
            query (${'$'}id: Int) {
              Media(id: ${'$'}id, type: ANIME) {
                $cardFields
                description(asHtml: false)
                genres
                studios(isMain: true) { nodes { name } }
                streamingEpisodes { title thumbnail }
                relations {
                  edges {
                    relationType
                    node {
                      id
                      type
                      title { romaji english }
                      coverImage { large }
                      format
                      episodes
                      season
                      seasonYear
                    }
                  }
                }
              }
            }
        """.trimIndent()
        val payload = JSONObject()
            .put("query", graphql)
            .put("variables", JSONObject().put("id", id))
            .toString()
        val body = execute(payload)
        val item = JSONObject(body).optJSONObject("data")?.optJSONObject("Media")
            ?: return@withContext null
        parseMedia(item, detail = true)
    }

    private suspend fun pageMedia(graphql: String, variables: JSONObject): List<AniListMedia> =
        withContext(Dispatchers.IO) {
            val payload = JSONObject()
                .put("query", graphql)
                .put("variables", variables)
                .toString()
            val body = execute(payload)
            val media = JSONObject(body)
                .optJSONObject("data")
                ?.optJSONObject("Page")
                ?.optJSONArray("media")
                ?: return@withContext emptyList()
            buildList {
                for (i in 0 until media.length()) {
                    add(parseMedia(media.getJSONObject(i), detail = false))
                }
            }
        }

    private fun parseMedia(item: JSONObject, detail: Boolean): AniListMedia {
        val titles = item.optJSONObject("title")
        val title = titles.nullableString("english")
            ?: titles.nullableString("romaji")
            ?: "Untitled"
        val genres = if (detail) {
            item.optJSONArray("genres")?.toStringList().orEmpty()
        } else {
            emptyList()
        }
        val studios = if (detail) {
            item.optJSONObject("studios")
                ?.optJSONArray("nodes")
                ?.toObjectList()
                ?.mapNotNull { it.nullableString("name") }
                .orEmpty()
        } else {
            emptyList()
        }
        val relations = if (detail) {
            item.optJSONObject("relations")
                ?.optJSONArray("edges")
                ?.toObjectList()
                ?.mapNotNull { edge ->
                    val node = edge.optJSONObject("node") ?: return@mapNotNull null
                    if (node.optString("type") != "ANIME") return@mapNotNull null
                    val nodeTitles = node.optJSONObject("title")
                    val relTitle = nodeTitles.nullableString("english")
                        ?: nodeTitles.nullableString("romaji")
                        ?: return@mapNotNull null
                    AniListRelation(
                        id = node.getInt("id"),
                        title = relTitle,
                        coverUrl = node.optJSONObject("coverImage")?.nullableString("large"),
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
        } else {
            emptyList()
        }
        val streaming = if (detail) {
            item.optJSONArray("streamingEpisodes")
                ?.toObjectList()
                ?.mapNotNull { row ->
                    val epTitle = row.nullableString("title") ?: return@mapNotNull null
                    AniListStreamingEpisode(
                        title = epTitle,
                        thumbnailUrl = row.nullableString("thumbnail"),
                    )
                }
                .orEmpty()
        } else {
            emptyList()
        }
        return AniListMedia(
            id = item.getInt("id"),
            title = title,
            coverUrl = item.optJSONObject("coverImage")?.nullableString("large"),
            bannerUrl = item.nullableString("bannerImage"),
            episodes = item.nullableInt("episodes"),
            season = item.nullableString("season"),
            seasonYear = item.nullableInt("seasonYear"),
            averageScore = item.nullableInt("averageScore"),
            format = item.nullableString("format"),
            status = item.nullableString("status"),
            description = item.nullableString("description")
                ?.replace(Regex("<[^>]+>"), " ")
                ?.replace(Regex("\\s+"), " ")
                ?.trim(),
            genres = genres,
            studios = studios,
            relations = relations,
            streamingEpisodes = streaming,
            detailLoaded = detail,
        )
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
                "AniKitty-Desktop/1.0 (https://github.com/fampep/anikitty)",
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

    private companion object {
        fun JSONObject?.nullableString(key: String): String? {
            if (this == null || !has(key) || isNull(key)) return null
            return getString(key).takeIf { it.isNotBlank() && it != "null" }
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

internal fun parseAniListEpisodeNumber(raw: String): Int? {
    val patterns = listOf(
        Regex("""(?i)episode\s*(\d+)"""),
        Regex("""(?i)\bep\.?\s*(\d+)"""),
        Regex("""#\s*(\d+)"""),
    )
    for (p in patterns) {
        val m = p.find(raw) ?: continue
        return m.groupValues[1].toIntOrNull()?.takeIf { it > 0 }
    }
    return null
}
