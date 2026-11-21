// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import android.app.NotificationManager
import android.content.Context
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.work.Constraints
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.workDataOf
import site.anikitty.app.AnikittyApp
import site.anikitty.app.data.servers.PlayableSource

@OptIn(UnstableApi::class)
internal object EpisodeDownloads {
    fun filesRoot(context: Context): java.io.File =
        java.io.File(context.applicationContext.filesDir, "episode-files")

    suspend fun enqueue(
        context: Context,
        anilistId: Int,
        episode: Int,
        title: String,
        source: PlayableSource,
    ) {
        if (anilistId <= 0 || episode < 0) return
        if (offlineBlockReason(source) != null) return
        val app = context.applicationContext as AnikittyApp
        val dao = app.database.episodeDownloadDao()
        val previous = dao.get(anilistId, episode)
        if (previous != null) {
            removeSavedBytes(context, previous)
        }
        val row = EpisodeDownloadEntity(
            anilistId = anilistId,
            episode = episode,
            title = title.ifBlank { "Episode $episode" },
            sourceKey = sourceKey(source),
            url = source.url,
            headersJson = encodeHeaders(source.headers),
            hls = isHlsSource(source),
            stripBytes = resolvedStripBytes(source),
            phase = DownloadPhase.QUEUED.name,
            progressPercent = 0,
            localPath = null,
            error = null,
            updatedAtEpochMs = System.currentTimeMillis(),
        )
        dao.upsert(row)
        val request = OneTimeWorkRequestBuilder<EpisodeDownloadWorker>()
            .setInputData(
                workDataOf(
                    DOWNLOAD_ANILIST_ID to anilistId,
                    DOWNLOAD_EPISODE to episode,
                ),
            )
            .setConstraints(
                Constraints.Builder()
                    .setRequiredNetworkType(NetworkType.CONNECTED)
                    .build(),
            )
            .build()
        WorkManager.getInstance(context).enqueueUniqueWork(
            downloadWorkName(anilistId, episode),
            ExistingWorkPolicy.REPLACE,
            request,
        )
    }

    suspend fun remove(context: Context, row: EpisodeDownloadEntity) {
        val app = context.applicationContext
        val dao = (app as AnikittyApp).database.episodeDownloadDao()
        // Drop the row before cancelling work. An HLS save that sees a stop
        // while the row is still current would queue itself again.
        dao.delete(row.anilistId, row.episode)
        WorkManager.getInstance(app).cancelUniqueWork(
            downloadWorkName(row.anilistId, row.episode),
        )
        app.getSystemService(NotificationManager::class.java)
            ?.cancel(downloadNotificationId(row.anilistId, row.episode))
        removeSavedBytes(app, row)
    }
}
