package site.anikitty.app.data.anilist

import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity

/**
 * Pulls AniList MediaList into on-device history and pushes local episode progress back.
 */
class AniListSync(
    private val aniList: AniListClient,
    private val auth: AniListAuthStore,
    private val historyDao: WatchHistoryDao,
) {
    data class Result(
        val imported: Int,
        val username: String?,
    )

    suspend fun pull(): Result {
        val token = auth.accessToken ?: error("AniList not linked")
        val viewer = aniList.viewer(token) ?: error("Could not load AniList profile")
        auth.saveViewer(token, viewer)

        val entries = aniList.mediaListEntries(token, viewer.id)
        var imported = 0
        val now = System.currentTimeMillis()
        for (entry in entries) {
            val media = entry.media
            val existing = historyDao.get(media.id)
            val episode = entry.progress.coerceAtLeast(1)
            // Prefer local in-episode scrub position when same episode; otherwise take AniList episode.
            val keepLocalPosition =
                existing != null &&
                    existing.episode == episode &&
                    existing.positionMs > 2_000L
            historyDao.upsert(
                WatchHistoryEntity(
                    anilistId = media.id,
                    title = media.title,
                    coverImageUrl = media.coverImageUrl ?: existing?.coverImageUrl,
                    episode = episode,
                    positionMs = if (keepLocalPosition) existing!!.positionMs else 0L,
                    durationMs = if (keepLocalPosition) existing!!.durationMs else 0L,
                    updatedAtEpochMs = maxOf(existing?.updatedAtEpochMs ?: 0L, now - imported),
                    listStatus = entry.status,
                    malId = media.malId ?: existing?.malId,
                ),
            )
            imported++
        }
        return Result(imported = imported, username = viewer.name)
    }

    /**
     * Push episode progress to AniList. Completes the list entry when finished.
     */
    suspend fun pushProgress(anilistId: Int, episode: Int, totalEpisodes: Int?) {
        val token = auth.accessToken ?: return
        if (anilistId <= 0 || episode <= 0) return
        val completed = totalEpisodes != null && totalEpisodes > 0 && episode >= totalEpisodes
        val status = if (completed) "COMPLETED" else "CURRENT"
        val progress = if (completed) (totalEpisodes ?: episode) else episode
        runCatching { aniList.saveProgress(token, anilistId, progress, status) }
        val existing = historyDao.get(anilistId) ?: return
        historyDao.upsert(existing.copy(listStatus = status, episode = progress))
    }
}
