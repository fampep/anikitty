package site.anikitty.app.data.fribb

import android.content.Context
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.anikitty.app.data.anilist.AnimeEpisodeItem

/**
 * Image-only enrichment for the episode rail.
 *
 * Catalog truth (titles, seasons, episode counts, related) stays on AniList.
 * Fribb→TMDB/IMDb is used solely to fill missing stills — never as a season/episode source.
 *
 * Priority per episode: AniList streaming thumb → TMDB still → series cover.
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
                        // Keep AniList streaming [site] if present; never label TMDB as a source.
                        ep.copy(thumbnailUrl = url)
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
