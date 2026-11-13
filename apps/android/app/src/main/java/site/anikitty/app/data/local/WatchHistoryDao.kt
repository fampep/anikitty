// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

package site.anikitty.app.data.local

import androidx.room.Dao
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow
import site.anikitty.app.data.anilist.AnimeSummary

@Dao
interface WatchHistoryDao {
    @Query("SELECT * FROM watch_history ORDER BY updatedAtEpochMs DESC")
    fun observeAll(): Flow<List<WatchHistoryEntity>>

    @Query("SELECT * FROM watch_history WHERE anilistId = :anilistId LIMIT 1")
    suspend fun get(anilistId: Int): WatchHistoryEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(entry: WatchHistoryEntity)

    @Query("DELETE FROM watch_history WHERE anilistId = :anilistId")
    suspend fun delete(anilistId: Int)

    @Query("DELETE FROM watch_history")
    suspend fun clear()
}

/**
 * Add or bump recency without wiping episode / playback progress.
 */
suspend fun WatchHistoryDao.touchFromCatalog(anime: AnimeSummary) {
    val existing = get(anime.id)
    val now = System.currentTimeMillis()
    if (existing != null) {
        upsert(
            existing.copy(
                title = anime.title,
                coverImageUrl = anime.coverImageUrl ?: existing.coverImageUrl,
                updatedAtEpochMs = now,
                malId = anime.malId ?: existing.malId,
            ),
        )
    } else {
        upsert(
            WatchHistoryEntity(
                anilistId = anime.id,
                title = anime.title,
                coverImageUrl = anime.coverImageUrl,
                episode = 1,
                positionMs = 0L,
                durationMs = 0L,
                updatedAtEpochMs = now,
                malId = anime.malId,
            ),
        )
    }
}
