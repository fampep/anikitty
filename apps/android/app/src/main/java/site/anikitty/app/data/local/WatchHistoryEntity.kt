package site.anikitty.app.data.local

import androidx.room.Entity
import androidx.room.PrimaryKey

/** On-device watch history — optionally mirrored from / to AniList. */
@Entity(tableName = "watch_history")
data class WatchHistoryEntity(
    @PrimaryKey val anilistId: Int,
    val title: String,
    val coverImageUrl: String?,
    val episode: Int,
    val positionMs: Long,
    val durationMs: Long,
    val updatedAtEpochMs: Long,
    /** AniList MediaListStatus when synced (CURRENT, COMPLETED, …). */
    val listStatus: String? = null,
    val malId: Int? = null,
) {
    /**
     * Episodes actually finished. Opening a title from the catalog seeds episode 1
     * with no playback and no list status; that is not progress. AniList progress 0 stays 0.
     */
    fun episodesFinished(): Int {
        val openedOnly = listStatus.isNullOrBlank() &&
            positionMs == 0L &&
            durationMs == 0L &&
            episode <= 1
        return if (openedOnly) 0 else episode.coerceAtLeast(0)
    }
}
