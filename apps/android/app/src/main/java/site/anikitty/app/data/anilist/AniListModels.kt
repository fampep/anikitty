package site.anikitty.app.data.anilist

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
    /** MyAnimeList id — used for AniSkip intro/credits timestamps. */
    val malId: Int? = null,
) {
    /** Titles to try when mapping a watch page / search (romaji first — matches Anikoto). */
    fun searchTitles(): List<String> =
        listOfNotNull(romajiTitle, title)
            .map { it.trim() }
            .filter { it.isNotEmpty() }
            .distinct()
}
