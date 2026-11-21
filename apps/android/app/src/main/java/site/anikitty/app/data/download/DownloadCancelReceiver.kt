// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import android.app.NotificationManager
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import site.anikitty.app.AnikittyApp

/** Stops the save named by the download notification's Cancel action. */
class DownloadCancelReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent?) {
        if (intent?.action != DOWNLOAD_CANCEL_ACTION) return
        val anilistId = intent.getIntExtra(DOWNLOAD_ANILIST_ID, 0)
        val episode = intent.getIntExtra(DOWNLOAD_EPISODE, -1)
        if (anilistId <= 0 || episode < 0) return
        val pending = goAsync()
        val app = context.applicationContext
        scope.launch {
            try {
                val row = (app as? AnikittyApp)?.database?.episodeDownloadDao()?.get(anilistId, episode)
                if (row != null && downloadCancelRemovesRow(row.phase)) {
                    EpisodeDownloads.remove(app, row)
                }
                app.getSystemService(NotificationManager::class.java)
                    ?.cancel(downloadNotificationId(anilistId, episode))
            } finally {
                pending.finish()
            }
        }
    }

    private companion object {
        val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    }
}
