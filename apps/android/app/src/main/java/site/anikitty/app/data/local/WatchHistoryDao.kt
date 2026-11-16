// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

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
 * Mark [number] watched and point the series at the following episode.
 *
 * Returns the completed episode count just stored, or null when this toggle
 * did not move the frontier. AniList must use that count. Reading the row
 * again can see a playhead save that landed in between and would send the
 * wrong episode.
 */
suspend fun WatchHistoryDao.markEpisode(anime: AnimeSummary, number: Int): Int? {
    val existing = get(anime.id)
    val frontier = existing?.episode ?: 0
    val finishedThrough = (frontier - 1).coerceAtLeast(0)
    val already = existing != null && existing.episodesFinished() > 0 && number <= finishedThrough
    val nextEpisode: Int
    val nextPosition: Long
    if (already) {
        if (number != finishedThrough) return null
        nextEpisode = number.coerceAtLeast(1)
        nextPosition = 0L
    } else {
        nextEpisode = maxOf(frontier, number + 1)
        nextPosition = if (number + 1 > frontier) 0L else existing?.positionMs ?: 0L
    }
    upsert(
        WatchHistoryEntity(
            anilistId = anime.id,
            title = anime.title,
            coverImageUrl = anime.coverImageUrl ?: existing?.coverImageUrl,
            episode = nextEpisode,
            positionMs = nextPosition,
            durationMs = if (nextPosition == 0L) 0L else existing?.durationMs ?: 0L,
            updatedAtEpochMs = System.currentTimeMillis(),
            listStatus = existing?.listStatus ?: "CURRENT",
            malId = anime.malId ?: existing?.malId,
        ),
    )
    return (nextEpisode - 1).coerceAtLeast(0)
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
