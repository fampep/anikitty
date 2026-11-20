// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import site.anikitty.app.data.local.PendingAniListPush
import site.anikitty.app.data.local.PendingAniListPushDao
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity

/**
 * Pulls AniList MediaList into on-device history and pushes local episode progress back.
 */
class AniListSync(
    private val aniList: AniListClient,
    private val auth: AniListAuthStore,
    private val historyDao: WatchHistoryDao,
    private val pendingPushes: PendingAniListPushDao,
) {
    data class Result(
        val imported: Int,
        val username: String?,
    )

    suspend fun pull(): Result {
        drainPendingPushes()
        val token = auth.accessToken ?: error("AniList not linked")
        val viewer = aniList.viewer(token) ?: error("Could not load AniList profile")
        auth.saveViewer(token, viewer)

        val entries = aniList.mediaListEntries(token, viewer.id)
        var imported = 0
        val now = System.currentTimeMillis()
        for (entry in entries) {
            val media = entry.media
            val existing = historyDao.get(media.id)
            val pending = pendingPushes.get(media.id)?.episode
            historyDao.upsert(
                mergedPullEntry(
                    existing = existing,
                    anilistId = media.id,
                    title = media.title,
                    coverImageUrl = media.coverImageUrl,
                    malId = media.malId,
                    remoteProgress = entry.progress,
                    remoteStatus = entry.status,
                    pendingProgress = pending,
                    syncedAtEpochMs = now - imported,
                ),
            )
            imported++
        }
        return Result(imported = imported, username = viewer.name)
    }

    /**
     * Send queued progress. A newer failure that lands while one attempt is in
     * flight stays queued. Returns how many rows AniList accepted.
     */
    suspend fun drainPendingPushes(): Int {
        if (auth.accessToken.isNullOrBlank()) return 0
        var sent = 0
        for (row in pendingPushes.all()) {
            val saved = pushProgress(
                anilistId = row.anilistId,
                episode = row.episode,
                totalEpisodes = row.totalEpisodes,
            )
            if (saved) sent++
        }
        return sent
    }

    /**
     * Push episodes finished to AniList. [episode] is the completed count, so 0
     * clears progress after unwatching the first episode. Returns false when
     * nothing was saved, including a failed request.
     */
    suspend fun pushProgress(anilistId: Int, episode: Int, totalEpisodes: Int?): Boolean {
        val token = auth.accessToken ?: return false
        if (anilistId <= 0 || episode < 0) return false
        val startedAt = System.currentTimeMillis()
        val plan = aniListPushPlan(episode, totalEpisodes)
        val saved = aniList.saveProgress(token, anilistId, plan.progress, plan.status)
        if (!saved) {
            pendingPushes.upsert(
                PendingAniListPush(
                    anilistId = anilistId,
                    episode = episode,
                    totalEpisodes = totalEpisodes?.takeIf { it > 0 },
                    updatedAtEpochMs = System.currentTimeMillis(),
                ),
            )
            return false
        }
        val queued = pendingPushes.get(anilistId)
        if (queued != null && shouldDeletePendingPush(queued.updatedAtEpochMs, startedAt)) {
            pendingPushes.delete(anilistId)
        }
        val existing = historyDao.get(anilistId) ?: return true
        historyDao.upsert(historyAfterAniListPush(existing, plan.progress, plan.status))
        return true
    }
}

/** What one finished-episode count becomes on AniList. */
internal data class AniListPushPlan(val progress: Int, val status: String)

internal fun aniListPushPlan(episode: Int, totalEpisodes: Int?): AniListPushPlan {
    val completed = totalEpisodes != null && totalEpisodes > 0 && episode >= totalEpisodes
    return if (completed) {
        AniListPushPlan(progress = totalEpisodes ?: episode, status = "COMPLETED")
    } else {
        AniListPushPlan(progress = episode, status = "CURRENT")
    }
}

/**
 * A push that started before the queued row was written may delete it.
 * A newer failure that lands while that attempt is in flight stays queued.
 */
internal fun shouldDeletePendingPush(queuedUpdatedAtEpochMs: Long, pushStartedAtEpochMs: Long): Boolean =
    queuedUpdatedAtEpochMs <= pushStartedAtEpochMs

/**
 * A failed save used to still rewrite the phone. A later frontier (mark watched
 * stores the next episode) or a live playhead stays put.
 */
internal fun historyAfterAniListPush(
    existing: WatchHistoryEntity,
    progress: Int,
    status: String,
): WatchHistoryEntity {
    val keepFrontier = existing.episode > progress || existing.positionMs > 2_000L
    return if (keepFrontier) {
        existing.copy(listStatus = status)
    } else {
        existing.copy(listStatus = status, episode = progress.coerceAtLeast(existing.episode))
    }
}

/**
 * Cloud progress must not rewind a phone that is already further along, or
 * replace a row whose failed push has not landed yet.
 */
internal fun mergedPullEntry(
    existing: WatchHistoryEntity?,
    anilistId: Int,
    title: String,
    coverImageUrl: String?,
    malId: Int?,
    remoteProgress: Int,
    remoteStatus: String,
    pendingProgress: Int?,
    syncedAtEpochMs: Long,
): WatchHistoryEntity {
    val remoteEpisode = remoteProgress.coerceAtLeast(0)
    val localAhead = existing != null && existing.episode > remoteEpisode
    val pendingOwnsRow = existing != null &&
        pendingProgress != null &&
        pendingProgress != remoteEpisode
    val keepLocal = localAhead || pendingOwnsRow
    val keepScrub = existing != null &&
        !keepLocal &&
        existing.episode == remoteEpisode &&
        existing.positionMs > 2_000L
    return WatchHistoryEntity(
        anilistId = anilistId,
        title = title.ifBlank { existing?.title.orEmpty() },
        coverImageUrl = coverImageUrl ?: existing?.coverImageUrl,
        episode = if (keepLocal) existing!!.episode else remoteEpisode,
        positionMs = when {
            keepLocal -> existing!!.positionMs
            keepScrub -> existing!!.positionMs
            else -> 0L
        },
        durationMs = when {
            keepLocal -> existing!!.durationMs
            keepScrub -> existing!!.durationMs
            else -> 0L
        },
        updatedAtEpochMs = maxOf(existing?.updatedAtEpochMs ?: 0L, syncedAtEpochMs),
        listStatus = if (keepLocal) existing!!.listStatus ?: remoteStatus else remoteStatus,
        malId = malId ?: existing?.malId,
    )
}
