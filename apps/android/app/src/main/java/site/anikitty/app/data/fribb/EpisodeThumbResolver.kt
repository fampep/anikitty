package site.anikitty.app.data.fribb

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.anikitty.app.data.anilist.AnimeEpisodeItem

/**
 * Fills missing Plex-rail episode thumbnails via Fribb (AniList→TMDB/IMDb) + TMDB stills.
 *
 * Priority per episode: real AniList streaming thumb → TMDB still → series cover.
 * Cover URLs from [AnimeSummary.episodeItems] are treated as placeholders and replaced.
 */
class EpisodeThumbResolver(
    context: Context,
    private val fribb: FribbAnimeLists = FribbAnimeLists(context),
    private val tmdb: TmdbImageClient = TmdbImageClient(),
) {
    suspend fun enrich(anilistId: Int, episodes: List<AnimeEpisodeItem>): List<AnimeEpisodeItem> =
        withContext(Dispatchers.IO) {
            if (episodes.isEmpty()) return@withContext episodes
            val placeholders = episodes.filter { isPlaceholderThumb(it.thumbnailUrl) }
            if (placeholders.isEmpty()) return@withContext episodes

            val mapping = fribb.mappingFor(anilistId) ?: return@withContext episodes
            val stills = runCatching {
                tmdb.episodeStills(mapping, placeholders.map { it.number })
            }.getOrDefault(emptyMap())
            if (stills.isEmpty()) return@withContext episodes

            episodes.map { ep ->
                if (!isPlaceholderThumb(ep.thumbnailUrl)) {
                    ep
                } else {
                    stills[ep.number]?.let { url ->
                        ep.copy(thumbnailUrl = url, site = ep.site ?: "TMDB")
                    } ?: ep
                }
            }
        }

    /** AniList cover fallbacks (and blanks) — replace when TMDB has a still. */
    private fun isPlaceholderThumb(url: String?): Boolean {
        if (url.isNullOrBlank()) return true
        return url.contains("anilist.co", ignoreCase = true) &&
            url.contains("/cover/", ignoreCase = true)
    }
}
