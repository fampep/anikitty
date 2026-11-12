package site.anikitty.app.data.anilist

data class AnimeTrailer(
    val id: String,
    val site: String,
    val thumbnailUrl: String? = null,
) {
    fun watchUrl(): String? = when (site.lowercase()) {
        "youtube" -> "https://www.youtube.com/watch?v=$id"
        "dailymotion" -> "https://www.dailymotion.com/video/$id"
        else -> null
    }
}

data class AnimeExternalLink(
    val site: String,
    val url: String,
)

data class AnimeRelation(
    val id: Int,
    val title: String,
    val coverImageUrl: String?,
    val relationType: String,
    val format: String? = null,
)

data class AnimeSummary(
    val id: Int,
    val title: String,
    val coverImageUrl: String?,
    val bannerImageUrl: String? = null,
    val episodes: Int?,
    val format: String?,
    val averageScore: Int?,
    val description: String? = null,
    /** AniList romaji — often matches Anikoto page titles better than English. */
    val romajiTitle: String? = null,
    val nativeTitle: String? = null,
    /** MyAnimeList id — used for AniSkip intro/credits timestamps. */
    val malId: Int? = null,
    val status: String? = null,
    val season: String? = null,
    val seasonYear: Int? = null,
    val durationMinutes: Int? = null,
    val popularity: Int? = null,
    val genres: List<String> = emptyList(),
    val studios: List<String> = emptyList(),
    val trailer: AnimeTrailer? = null,
    val externalLinks: List<AnimeExternalLink> = emptyList(),
    val relations: List<AnimeRelation> = emptyList(),
    /** True when this payload came from the richer Media(id) query. */
    val detailLoaded: Boolean = false,
) {
    /** Titles to try when mapping a watch page / search (romaji first — matches Anikoto). */
    fun searchTitles(): List<String> =
        listOfNotNull(romajiTitle, title, nativeTitle)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()

    fun seasonLabel(): String? {
        val s = season?.lowercase()?.replaceFirstChar { it.titlecase() }
        return when {
            s != null && seasonYear != null -> "$s $seasonYear"
            seasonYear != null -> seasonYear.toString()
            s != null -> s
            else -> null
        }
    }

    fun statusLabel(): String? = when (status?.uppercase()) {
        "FINISHED" -> "Finished"
        "RELEASING" -> "Airing"
        "NOT_YET_RELEASED" -> "Upcoming"
        "CANCELLED" -> "Cancelled"
        "HIATUS" -> "Hiatus"
        else -> status?.replace('_', ' ')?.lowercase()?.replaceFirstChar { it.titlecase() }
    }

    fun scoreLabel(): String? = averageScore?.let { String.format("%.1f", it / 10f) }
}

data class AniListViewer(
    val id: Int,
    val name: String,
    val avatarUrl: String? = null,
)

data class AniListMediaListEntry(
    val status: String,
    val progress: Int,
    val media: AnimeSummary,
)
