// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject

/**
 * Share on-device watch progress as JSON. The AniList token is never included.
 */
fun shareWatchProgress(context: Context, rows: List<WatchHistoryEntity>) {
    val progress = JSONArray()
    rows.forEach { row ->
        progress.put(
            JSONObject()
                .put("anilistId", row.anilistId)
                .put("title", row.title)
                .put("episode", row.episode)
                .put("positionMs", row.positionMs)
                .put("durationMs", row.durationMs)
                .put("updatedAtEpochMs", row.updatedAtEpochMs)
                .put("listStatus", row.listStatus ?: "")
                .put("malId", row.malId ?: 0),
        )
    }
    val body = JSONObject()
        .put("app", "anikitty")
        .put("exportedAtEpochMs", System.currentTimeMillis())
        .put("progress", progress)
        .toString(2)
    val send = Intent(Intent.ACTION_SEND)
        .setType("application/json")
        .putExtra(Intent.EXTRA_SUBJECT, "AniKitty watch progress")
        .putExtra(Intent.EXTRA_TEXT, body)
    context.startActivity(
        Intent.createChooser(send, "Export watch progress")
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK),
    )
}
