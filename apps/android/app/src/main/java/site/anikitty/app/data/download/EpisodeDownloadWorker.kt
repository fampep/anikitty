// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.hls.playlist.HlsMultivariantPlaylist
import androidx.media3.exoplayer.hls.playlist.HlsPlaylistParser
import androidx.work.CoroutineWorker
import androidx.work.ForegroundInfo
import androidx.work.WorkerParameters
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.withContext
import site.anikitty.app.AnikittyApp
import site.anikitty.app.data.servers.PlaybackHttp
import java.io.File
import java.io.IOException
import okhttp3.Request

@OptIn(UnstableApi::class)
class EpisodeDownloadWorker(
    context: Context,
    params: WorkerParameters,
) : CoroutineWorker(context, params) {
    override suspend fun doWork(): Result {
        val anilistId = inputData.getInt(DOWNLOAD_ANILIST_ID, 0)
        val episode = inputData.getInt(DOWNLOAD_EPISODE, 0)
        if (anilistId <= 0 || episode < 0) return Result.failure()
        val dao = (applicationContext as AnikittyApp).database.episodeDownloadDao()
        val row = dao.get(anilistId, episode) ?: return Result.success()
        if (!row.url.startsWith("http://") && !row.url.startsWith("https://")) {
            publish(dao, row, DownloadPhase.FAILED.name, 0, null, "Can't save this source")
            return Result.failure()
        }
        try {
            setForeground(foreground(row, 0))
        } catch (_: Exception) {
            // A blocked notification still leaves the save running. The shelf shows it.
        }
        if (!publish(dao, row, DownloadPhase.RUNNING.name, 0, null, null)) return Result.success()
        return try {
            if (row.hls) downloadHls(dao, row) else downloadFile(dao, row)
        } catch (cancelled: CancellationException) {
            throw cancelled
        } catch (error: Exception) {
            val retryable = error is IOException && runAttemptCount < 3
            val wrote = publish(
                dao,
                row,
                phase = if (retryable) DownloadPhase.QUEUED.name else DownloadPhase.FAILED.name,
                percent = 0,
                localPath = null,
                error = if (retryable) null else downloadErrorMessage(error),
            )
            if (!wrote) return Result.success()
            if (retryable) Result.retry() else Result.failure()
        }
    }

    private suspend fun downloadFile(dao: EpisodeDownloadDao, row: EpisodeDownloadEntity): Result {
        val headers = decodeHeaders(row.headersJson)
        val userAgent = headers["User-Agent"] ?: DOWNLOAD_USER_AGENT
        val dest = progressiveFile(EpisodeDownloads.filesRoot(applicationContext), row.anilistId, row.episode, row.url)
        dest.parentFile?.mkdirs()
        val part = File(dest.path + ".part")
        try {
            withContext(Dispatchers.IO) {
                val request = Request.Builder().url(row.url)
                headers.forEach { (key, value) ->
                    if (!key.equals("User-Agent", ignoreCase = true)) request.header(key, value)
                }
                request.header("User-Agent", userAgent)
                PlaybackHttp.client.newCall(request.build()).execute().use { response ->
                    if (!response.isSuccessful) {
                        throw DownloadRejectedException(httpFailure(response.code))
                    }
                    val type = response.header("Content-Type").orEmpty()
                    if (type.contains("mpegurl", ignoreCase = true) || type.contains("m3u8", ignoreCase = true)) {
                        throw DownloadRejectedException("Couldn't save this episode")
                    }
                    val body = response.body ?: throw DownloadRejectedException("Couldn't save this episode")
                    val total = body.contentLength()
                    var stopped = false
                    body.byteStream().use { input ->
                        part.outputStream().use { output ->
                            val buffer = ByteArray(64 * 1024)
                            var readTotal = 0L
                            var lastPercent = 0
                            var lastAt = 0L
                            while (true) {
                                ensureActive()
                                val n = input.read(buffer)
                                if (n < 0) break
                                output.write(buffer, 0, n)
                                readTotal += n
                                val percent = if (total > 0L) ((readTotal * 100) / total).toInt() else 0
                                val now = System.currentTimeMillis()
                                if (percent != lastPercent && (percent >= 99 || now - lastAt >= 400L)) {
                                    lastPercent = percent
                                    lastAt = now
                                    val clamped = percent.coerceIn(0, 99)
                                    if (!publish(dao, row, DownloadPhase.RUNNING.name, clamped, null, null)) {
                                        stopped = true
                                        break
                                    }
                                    notify(row, clamped)
                                }
                            }
                        }
                    }
                    if (stopped) part.delete()
                }
            }
        } catch (error: Exception) {
            part.delete()
            throw error
        }
        if (!part.exists()) return Result.success()
        if (part.length() <= 0L) {
            part.delete()
            throw DownloadRejectedException("Couldn't save this episode")
        }
        if (dest.exists()) dest.delete()
        if (!part.renameTo(dest)) {
            part.copyTo(dest, overwrite = true)
            part.delete()
        }
        val wrote = publish(dao, row, DownloadPhase.READY.name, 100, dest.absolutePath, null)
        if (!wrote) dest.delete()
        return Result.success()
    }

    private suspend fun downloadHls(dao: EpisodeDownloadDao, row: EpisodeDownloadEntity): Result {
        val headers = decodeHeaders(row.headersJson)
        val userAgent = headers["User-Agent"] ?: DOWNLOAD_USER_AGENT
        val streams = when (val chosen = hlsPlanFor(dao, row, headers, userAgent)) {
            HlsPlanChoice.Stopped -> return Result.success()
            HlsPlanChoice.EveryRendition -> null
            is HlsPlanChoice.One -> encodeHlsStreams(chosen.plan)
        }
        val downloader = hlsDownloader(
            applicationContext,
            row.anilistId,
            row.episode,
            row.url,
            headers,
            userAgent,
            row.stripBytes,
            hlsStreamKeys(streams),
        )
        var lastPercent = -1
        var lastAt = 0L
        val dropped = java.util.concurrent.atomic.AtomicBoolean(false)
        try {
            withContext(Dispatchers.IO) {
                downloader.download { _, _, percentDownloaded ->
                    val percent = percentDownloaded.toInt().coerceIn(0, 99)
                    val now = System.currentTimeMillis()
                    if (percent == lastPercent || (percent < 99 && now - lastAt < 400L)) return@download
                    lastPercent = percent
                    lastAt = now
                    val keep = kotlinx.coroutines.runBlocking {
                        publish(dao, row, DownloadPhase.RUNNING.name, percent, null, null)
                    }
                    if (!keep || isStopped) {
                        dropped.set(true)
                        downloader.cancel()
                    } else {
                        notify(row, percent)
                    }
                }
            }
        } catch (error: InterruptedException) {
            if (isStopped || dropped.get()) return stopOrRetry(dao, row)
            throw IOException("Couldn't save this episode", error)
        }
        if (isStopped || dropped.get()) return stopOrRetry(dao, row)
        val wrote = publish(dao, row, DownloadPhase.READY.name, 100, null, null)
        if (!wrote) {
            try {
                downloader.remove()
            } catch (_: Exception) {
            }
        }
        return Result.success()
    }

    /**
     * A multivariant playlist is narrowed to one video rendition and its audio.
     * A media playlist, or a playlist we could not read, keeps every rendition.
     * A row that changed while we wrote the plan stops the save.
     */
    private sealed interface HlsPlanChoice {
        data class One(val plan: HlsSavePlan) : HlsPlanChoice
        data object EveryRendition : HlsPlanChoice
        data object Stopped : HlsPlanChoice
    }

    private suspend fun hlsPlanFor(
        dao: EpisodeDownloadDao,
        row: EpisodeDownloadEntity,
        headers: Map<String, String>,
        userAgent: String,
    ): HlsPlanChoice {
        decodeHlsStreams(row.hlsStreams)?.let { return HlsPlanChoice.One(it) }
        val plan = readHlsPlan(row.url, headers, userAgent) ?: return HlsPlanChoice.EveryRendition
        val wrote = dao.setHlsStreams(
            row.anilistId,
            row.episode,
            row.url,
            row.updatedAtEpochMs,
            encodeHlsStreams(plan),
        )
        return if (wrote == 0) HlsPlanChoice.Stopped else HlsPlanChoice.One(plan)
    }

    private fun readHlsPlan(
        url: String,
        headers: Map<String, String>,
        userAgent: String,
    ): HlsSavePlan? = try {
        val request = Request.Builder().url(url).header("User-Agent", userAgent)
        headers.forEach { (key, value) ->
            if (!key.equals("User-Agent", ignoreCase = true)) request.header(key, value)
        }
        PlaybackHttp.client.newCall(request.build()).execute().use { response ->
            if (!response.isSuccessful) return null
            val body = response.body ?: return null
            val playlist = HlsPlaylistParser().parse(android.net.Uri.parse(url), body.byteStream())
            if (playlist !is HlsMultivariantPlaylist) return null
            hlsPlanFromPlaylist(playlist)
        }
    } catch (_: Exception) {
        null
    }

    private suspend fun stopOrRetry(dao: EpisodeDownloadDao, row: EpisodeDownloadEntity): Result {
        if (!stillCurrent(dao, row)) return Result.success()
        publish(dao, row, DownloadPhase.QUEUED.name, 0, null, null)
        return Result.retry()
    }

    private suspend fun stillCurrent(dao: EpisodeDownloadDao, row: EpisodeDownloadEntity): Boolean {
        val latest = dao.get(row.anilistId, row.episode) ?: return false
        return latest.updatedAtEpochMs == row.updatedAtEpochMs && latest.url == row.url
    }

    private suspend fun publish(
        dao: EpisodeDownloadDao,
        row: EpisodeDownloadEntity,
        phase: String,
        percent: Int,
        localPath: String?,
        error: String?,
    ): Boolean = dao.updateIfCurrent(
        anilistId = row.anilistId,
        episode = row.episode,
        url = row.url,
        updatedAtEpochMs = row.updatedAtEpochMs,
        phase = phase,
        progressPercent = percent,
        localPath = localPath,
        error = error,
    ) > 0

    private fun foreground(row: EpisodeDownloadEntity, percent: Int): ForegroundInfo {
        val notification = buildNotification(row, percent)
        val id = notificationId(row)
        return if (Build.VERSION.SDK_INT >= 29) {
            ForegroundInfo(id, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            ForegroundInfo(id, notification)
        }
    }

    private fun notify(row: EpisodeDownloadEntity, percent: Int) {
        val manager = applicationContext.getSystemService(NotificationManager::class.java) ?: return
        manager.notify(notificationId(row), buildNotification(row, percent))
    }

    private fun buildNotification(row: EpisodeDownloadEntity, percent: Int): android.app.Notification {
        val manager = applicationContext.getSystemService(NotificationManager::class.java)
        if (Build.VERSION.SDK_INT >= 26 && manager != null) {
            manager.createNotificationChannel(
                NotificationChannel(CHANNEL_ID, "Downloads", NotificationManager.IMPORTANCE_LOW),
            )
        }
        val text = if (percent <= 0) "Saving episode ${row.episode}" else "Saving episode ${row.episode} · $percent%"
        val cancel = Intent(applicationContext, DownloadCancelReceiver::class.java)
            .setAction(DOWNLOAD_CANCEL_ACTION)
            .putExtra(DOWNLOAD_ANILIST_ID, row.anilistId)
            .putExtra(DOWNLOAD_EPISODE, row.episode)
        val stop = PendingIntent.getBroadcast(
            applicationContext,
            downloadNotificationId(row.anilistId, row.episode),
            cancel,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(applicationContext, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.stat_sys_download)
            .setContentTitle(row.title)
            .setContentText(text)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setProgress(100, percent.coerceIn(0, 100), percent <= 0)
            .addAction(0, "Cancel", stop)
            .build()
    }

    private fun notificationId(row: EpisodeDownloadEntity): Int =
        downloadNotificationId(row.anilistId, row.episode)

    private companion object {
        const val CHANNEL_ID = "episode-downloads"
    }
}
