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
import android.os.IBinder
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import site.anikitty.app.MainActivity
import site.anikitty.app.R

/**
 * Keeps the phone-side cast relay in the foreground for the life of the TV
 * session. The player composition does not own this service, so leaving the
 * episode or switching episodes does not stop the stream.
 */
class CastPlaybackService : Service() {
    private var shownTitle: String? = null
    private var shownEpisode: Int = 0

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val title = intent?.getStringExtra(EXTRA_TITLE)
        val episode = intent?.getIntExtra(EXTRA_EPISODE, 0) ?: 0
        enterForeground(title, episode)
        if (intent?.action == ACTION_END) {
            running = false
            CastLifetime.current()?.endSession()
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        running = true
        val helper = CastLifetime.current()
        val keep = castForegroundShouldRun(
            casting = helper?.casting == true,
            loadInFlight = helper?.isLoadInFlight() == true,
        )
        if (!keep) {
            running = false
            stopForeground(STOP_FOREGROUND_REMOVE)
            stopSelf()
            return START_NOT_STICKY
        }
        return START_STICKY
    }

    override fun onDestroy() {
        running = false
        super.onDestroy()
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
        private const val CHANNEL_ID = "anikitty_cast"
        private const val NOTIFICATION_ID = 0xA11
        private const val EXTRA_TITLE = "title"
        private const val EXTRA_EPISODE = "episode"
        private const val ACTION_END = "site.anikitty.app.cast.END"

        @Volatile
        var running: Boolean = false
            private set

        fun promote(context: Context, title: String?, episode: Int) {
            val intent = Intent(context, CastPlaybackService::class.java)
                .putExtra(EXTRA_TITLE, title)
                .putExtra(EXTRA_EPISODE, episode)
            // The player is in front when a load starts. A later call from the
            // background must not crash the cast that is already on the TV.
            runCatching { ContextCompat.startForegroundService(context, intent) }
        }

        fun demoteIfIdle(context: Context) {
            if (!running) return
            val helper = CastLifetime.current()
            if (castForegroundShouldRun(
                    casting = helper?.casting == true,
                    loadInFlight = helper?.isLoadInFlight() == true,
                )
            ) {
                return
            }
            val intent = Intent(context, CastPlaybackService::class.java)
            runCatching { context.startService(intent) }
        }
    }
}
