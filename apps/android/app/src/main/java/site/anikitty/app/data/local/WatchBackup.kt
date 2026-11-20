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

/** One row from an exported watch-progress file. */
internal data class WatchProgressBackupEntry(
    val anilistId: Int,
    val title: String,
    val episode: Int,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAtEpochMs: Long,
    val listStatus: String?,
    val malId: Int?,
)

internal data class WatchBackupFile(
    val entries: List<WatchProgressBackupEntry>,
    val skipped: Int,
)

internal data class WatchProgressMerge(
    val added: Int,
    val updated: Int,
    val kept: Int,
    val writes: List<WatchHistoryEntity>,
)

private const val WATCH_BACKUP_MAX_CHARS = 2_000_000

/**
 * Read the JSON [shareWatchProgress] writes. Null means the file is not a backup.
 * Rows missing an id, title, or a usable number are counted in [WatchBackupFile.skipped].
 */
internal fun readWatchProgressBackup(raw: String): WatchBackupFile? {
    if (raw.length > WATCH_BACKUP_MAX_CHARS) return null
    val root = runCatching { JSONObject(raw.trim().removePrefix("\uFEFF")) }.getOrNull() ?: return null
    val app = root.optString("app", "").trim()
    if (app.isNotEmpty() && !app.equals("anikitty", ignoreCase = true)) return null
    val progress = root.optJSONArray("progress") ?: return null
    val entries = ArrayList<WatchProgressBackupEntry>(progress.length())
    var skipped = 0
    for (index in 0 until progress.length()) {
        val row = progress.optJSONObject(index)
        val entry = row?.toBackupEntry()
        if (entry == null) skipped++ else entries += entry
    }
    return WatchBackupFile(entries, skipped)
}

/**
 * Keep the row with the later [WatchHistoryEntity.updatedAtEpochMs]. An older backup
 * must not roll a show back. A newer backup may move the playhead either way, because
 * that device saved later. Cover art stays on the local row. A blank list status does
 * not clear one already stored.
 */
internal fun mergedWatchEntry(
    local: WatchHistoryEntity?,
    incoming: WatchProgressBackupEntry,
): WatchHistoryEntity {
    if (local == null) return incoming.toEntity()
    if (incoming.updatedAtEpochMs <= local.updatedAtEpochMs) {
        return local.copy(malId = local.malId ?: incoming.malId)
    }
    return local.copy(
        title = incoming.title.ifBlank { local.title },
        episode = incoming.episode,
        positionMs = incoming.positionMs,
        durationMs = incoming.durationMs,
        updatedAtEpochMs = incoming.updatedAtEpochMs,
        listStatus = incoming.listStatus ?: local.listStatus,
        malId = incoming.malId ?: local.malId,
    )
}

internal fun mergeWatchProgress(
    local: List<WatchHistoryEntity>,
    incoming: List<WatchProgressBackupEntry>,
): WatchProgressMerge {
    val original = local.associateBy { it.anilistId }
    val rows = original.toMutableMap()
    val touched = LinkedHashSet<Int>()
    for (entry in incoming) {
        val before = rows[entry.anilistId]
        val after = mergedWatchEntry(before, entry)
        if (after != before) rows[entry.anilistId] = after
        touched += entry.anilistId
    }
    var added = 0
    var updated = 0
    var kept = 0
    val writes = ArrayList<WatchHistoryEntity>()
    for (id in touched) {
        val before = original[id]
        val after = rows[id] ?: continue
        when {
            before == null -> {
                added++
                writes += after
            }
            watchProgressDiffers(before, after) -> {
                updated++
                writes += after
            }
            after != before -> {
                kept++
                writes += after
            }
            else -> kept++
        }
    }
    return WatchProgressMerge(added, updated, kept, writes)
}

internal fun watchImportSummary(added: Int, updated: Int, kept: Int, skipped: Int): String {
    if (added == 0 && updated == 0 && kept == 0) {
        return "No watch progress found in that file"
    }
    val lead = if (added == 0 && updated == 0) {
        "Nothing to change"
    } else {
        buildString {
            append("Imported")
            if (added > 0) append(" $added new")
            if (added > 0 && updated > 0) append(",")
            if (updated > 0) append(" $updated updated")
        }
    }
    val tail = buildList {
        if (kept > 0) add("kept $kept already newer")
        if (skipped > 0) add("skipped $skipped")
    }
    if (tail.isEmpty()) return lead
    val extra = tail.joinToString(", ").replaceFirstChar { it.uppercase() }
    return "$lead. $extra"
}

private fun watchProgressDiffers(local: WatchHistoryEntity, next: WatchHistoryEntity): Boolean =
    local.title != next.title ||
        local.episode != next.episode ||
        local.positionMs != next.positionMs ||
        local.durationMs != next.durationMs ||
        local.updatedAtEpochMs != next.updatedAtEpochMs ||
        local.listStatus != next.listStatus

private fun WatchProgressBackupEntry.toEntity() = WatchHistoryEntity(
    anilistId = anilistId,
    title = title,
    coverImageUrl = null,
    episode = episode,
    positionMs = positionMs,
    durationMs = durationMs,
    updatedAtEpochMs = updatedAtEpochMs,
    listStatus = listStatus,
    malId = malId,
)

private fun JSONObject.toBackupEntry(): WatchProgressBackupEntry? {
    val id = optInt("anilistId", 0)
    if (id <= 0) return null
    val title = optString("title", "").trim()
    if (title.isEmpty()) return null
    val episode = if (has("episode")) optInt("episode", -1) else -1
    val positionMs = if (has("positionMs")) optLong("positionMs", -1L) else -1L
    val durationMs = if (has("durationMs")) optLong("durationMs", -1L) else -1L
    val updatedAtEpochMs = if (has("updatedAtEpochMs")) optLong("updatedAtEpochMs", -1L) else -1L
    if (episode < 0 || positionMs < 0L || durationMs < 0L || updatedAtEpochMs < 0L) return null
    val listStatus = optString("listStatus", "").trim().ifEmpty { null }
    val malId = optInt("malId", 0).takeIf { it > 0 }
    return WatchProgressBackupEntry(
        anilistId = id,
        title = title,
        episode = episode,
        positionMs = positionMs,
        durationMs = durationMs,
        updatedAtEpochMs = updatedAtEpochMs,
        listStatus = listStatus,
        malId = malId,
    )
}
