package site.anikitty.app.data.fribb

/**
 * Crosswalk row from [Fribb/anime-lists](https://github.com/Fribb/anime-lists):
 * AniList id → TMDB TV/movie + optional IMDb + season/episode offset.
 */
data class FribbMapping(
    val anilistId: Int,
    val tmdbTvId: Int? = null,
    val tmdbMovieId: Int? = null,
    val imdbId: String? = null,
    /** TMDB season number (0 = specials). Null means season 1 for TV. */
    val tmdbSeason: Int? = null,
    /** Added to AniList episode numbers when querying TMDB. */
    val tmdbEpisodeOffset: Int = 0,
    val type: String? = null,
) {
    fun tmdbEpisodeNumber(anilistEpisode: Int): Int =
        (anilistEpisode + tmdbEpisodeOffset).coerceAtLeast(1)

    fun resolvedSeason(): Int = tmdbSeason ?: 1
}
