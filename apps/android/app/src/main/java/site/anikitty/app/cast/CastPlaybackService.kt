// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import kotlinx.coroutines.runBlocking
import site.anikitty.app.AnikittyApp
import site.anikitty.app.MainActivity
import site.anikitty.app.R
import site.anikitty.app.data.demo.DemoLibrary
import java.util.concurrent.Executors

/**
 * Keeps the phone-side cast relay in the foreground for the life of the TV
 * session. The player composition does not own this service, so leaving the
 * episode or switching episodes does not stop the stream. Session end, the
 * shade's stop button, and a finished item with nobody watching do.
 */
class CastPlaybackService : Service() {
    private var shownTitle: String? = null
    private var shownEpisode: Int = 0
    private val progress = Executors.newSingleThreadExecutor()
    private val ticker = Handler(Looper.getMainLooper())
    private val watch = object : CastServiceWatch {
        override fun onSessionEnded() {
            CastLifetime.current()?.stopCasting()
            leaveForeground()
        }

        override fun onItemFinished() {
            val helper = CastLifetime.current() ?: return
            // The open player shows the end card and may start the next episode.
            if (helper.hasScreen() || helper.isLoadInFlight()) return
            helper.stopCasting()
            leaveForeground()
        }
    }
    private val tick = object : Runnable {
        override fun run() {
            if (!running) return
            flushProgress()
            ticker.postDelayed(this, PROGRESS_INTERVAL_MS)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        // Already running, so idle can stop us without startService. Android 8+
        // rejects startService from the background, which is where a failed
        // load lands after the player has closed.
        stopper = { leaveForeground() }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra(EXTRA_TITLE)
        val episode = intent?.getIntExtra(EXTRA_EPISODE, 0) ?: 0
        enterForeground(title, episode)
        if (intent?.action == ACTION_END) {
            CastLifetime.current()?.endSession()
            leaveForeground()
            return START_NOT_STICKY
        }
        running = true
        val helper = CastLifetime.current()
        helper?.serviceWatch = watch
        helper?.ensureSessionWatch()
        val keep = castForegroundShouldRun(
            casting = helper?.casting == true,
            loadInFlight = helper?.isLoadInFlight() == true,
        )
        if (!keep) {
            leaveForeground()
            return START_NOT_STICKY
        }
        ticker.removeCallbacks(tick)
        ticker.postDelayed(tick, PROGRESS_INTERVAL_MS)
        return START_STICKY
    }

    override fun onDestroy() {
        ticker.removeCallbacks(tick)
        progress.shutdownNow()
        if (CastLifetime.current()?.serviceWatch === watch) {
            CastLifetime.current()?.serviceWatch = null
        }
        if (stopper != null) stopper = null
        running = false
        super.onDestroy()
    }

    private fun leaveForeground() {
        running = false
        ticker.removeCallbacks(tick)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    private fun enterForeground(title: String?, episode: Int) {
        if (!title.isNullOrBlank()) shownTitle = title
        if (episode > 0) shownEpisode = episode
        val notification = notification(shownTitle, shownEpisode)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(
                NOTIFICATION_ID,
                notification,
                ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
            )
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }
    }

    private fun flushProgress() {
        val helper = CastLifetime.current() ?: return
        if (!helper.casting || helper.hasScreen()) return
        val target = helper.progressTarget ?: return
        if (target.anilistId <= 0 || DemoLibrary.find(target.anilistId) != null) return
        val position = helper.receiverPositionMs()
        val duration = helper.receiverDurationMs()
        if (position <= 0L) return
        val app = applicationContext as? AnikittyApp ?: return
        progress.execute {
            val written = runCatching {
                runBlocking {
                    val dao = app.database.watchHistoryDao()
                    val before = dao.get(target.anilistId)
                    val next = castHistoryUpdate(
                        existing = before,
                        target = target,
                        positionMs = position,
                        durationMs = duration,
                        now = System.currentTimeMillis(),
                    ) ?: return@runBlocking null
                    dao.upsert(next)
                    val report = castProgressToReport(before, next, target.episode)
                    if (report != null && helper.reportedThrough < report && app.aniListAuth.isLinked) {
                        val pushed = app.aniListSync.pushProgress(
                            anilistId = target.anilistId,
                            episode = report,
                            totalEpisodes = target.totalEpisodes.takeIf { it > 0 },
                        )
                        if (pushed) helper.reportedThrough = report
                    }
                    next
                }
            }
            written.exceptionOrNull()?.let { error ->
                android.util.Log.w(TAG, "Cast progress save failed", error)
            }
        }
    }

    private fun notification(title: String?, episode: Int): Notification {
        val manager = getSystemService(NotificationManager::class.java)
        if (manager.getNotificationChannel(CHANNEL_ID) == null) {
            manager.createNotificationChannel(
                NotificationChannel(
                    CHANNEL_ID,
                    "Cast",
                    NotificationManager.IMPORTANCE_LOW,
                ).apply {
                    description = "Keeps a Chromecast stream playing from this phone"
                    setShowBadge(false)
                },
            )
        }
        val heading = title?.takeIf { it.isNotBlank() } ?: "AniKitty"
        val body = if (episode > 0) "Episode $episode · playing on your TV" else "Playing on your TV"
        val open = PendingIntent.getActivity(
            this,
            0,
            Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        val stop = PendingIntent.getService(
            this,
            1,
            Intent(this, CastPlaybackService::class.java).setAction(ACTION_END),
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
        )
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setSmallIcon(R.drawable.ic_stat_kitty)
            .setContentTitle(heading)
            .setContentText(body)
            .setContentIntent(open)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setCategory(NotificationCompat.CATEGORY_TRANSPORT)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .addAction(0, "Stop", stop)
            .build()
    }

    companion object {
        private const val TAG = "AniKittyCast"
        private const val CHANNEL_ID = "anikitty_cast"
        private const val NOTIFICATION_ID = 0xA11
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_EPISODE = "episode"
        private const val ACTION_END = "site.anikitty.app.cast.END"
        private const val PROGRESS_INTERVAL_MS = 2_000L
        private val main = Handler(Looper.getMainLooper())

        @Volatile
        var running: Boolean = false
            private set

        @Volatile
        private var stopper: (() -> Unit)? = null

        fun promote(context: Context, title: String?, episode: Int) {
            val intent = Intent(context, CastPlaybackService::class.java)
                .putExtra(EXTRA_TITLE, title)
                .putExtra(EXTRA_EPISODE, episode)
            // The player is in front when a load starts. A later call from the
            // background must not crash the cast that is already on the TV.
            runCatching { ContextCompat.startForegroundService(context, intent) }
        }

        fun demoteIfIdle() {
            if (!running) return
            val helper = CastLifetime.current()
            if (castForegroundShouldRun(
                    casting = helper?.casting == true,
                    loadInFlight = helper?.isLoadInFlight() == true,
                )
            ) {
                return
            }
            val stop = stopper ?: return
            if (Looper.myLooper() == Looper.getMainLooper()) {
                stop()
            } else {
                main.post {
                    val current = CastLifetime.current()
                    if (castForegroundShouldRun(
                            casting = current?.casting == true,
                            loadInFlight = current?.isLoadInFlight() == true,
                        )
                    ) {
                        return@post
                    }
                    stopper?.invoke()
                }
            }
        }
    }
}
