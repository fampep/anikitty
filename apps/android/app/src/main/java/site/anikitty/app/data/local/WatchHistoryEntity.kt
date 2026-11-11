package site.anikitty.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** On-device watch history — no account / cloud sync in the local-first client. */
@Entity(tableName = "watch_history")
data class WatchHistoryEntity(
    @PrimaryKey val anilistId: Int,
    val title: String,
    val coverImageUrl: String?,
    val episode: Int,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAtEpochMs: Long,
)
