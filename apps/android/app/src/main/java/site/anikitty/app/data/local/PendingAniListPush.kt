// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query

/** A finished-episode count that still needs to reach AniList. */
@Entity(tableName = "pending_anilist_push")
data class PendingAniListPush(
    @PrimaryKey val anilistId: Int,
    val episode: Int,
    val totalEpisodes: Int?,
    val updatedAtEpochMs: Long,
)

@Dao
interface PendingAniListPushDao {
    @Query("SELECT * FROM pending_anilist_push")
    suspend fun all(): List<PendingAniListPush>

    @Query("SELECT * FROM pending_anilist_push WHERE anilistId = :anilistId LIMIT 1")
    suspend fun get(anilistId: Int): PendingAniListPush?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(row: PendingAniListPush)

    @Query("DELETE FROM pending_anilist_push WHERE anilistId = :anilistId")
    suspend fun delete(anilistId: Int)
}
