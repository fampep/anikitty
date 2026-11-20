// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.download

import androidx.room.Dao
import androidx.room.Entity
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.Query
import kotlinx.coroutines.flow.Flow

@Entity(
    tableName = "episode_download",
    primaryKeys = ["anilistId", "episode"],
)
data class EpisodeDownloadEntity(
    val anilistId: Int,
    val episode: Int,
    val title: String,
    val url: String,
    val headersJson: String,
    val hls: Boolean,
    val stripBytes: Int,
    val phase: String,
    val progressPercent: Int,
    val localPath: String?,
    val error: String?,
    val updatedAtEpochMs: Long,
)

@Dao
interface EpisodeDownloadDao {
    @Query("SELECT * FROM episode_download WHERE anilistId = :anilistId AND episode = :episode")
    fun observe(anilistId: Int, episode: Int): Flow<EpisodeDownloadEntity?>

    @Query("SELECT * FROM episode_download WHERE anilistId = :anilistId AND episode = :episode")
    suspend fun get(anilistId: Int, episode: Int): EpisodeDownloadEntity?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun upsert(row: EpisodeDownloadEntity)

    /**
     * Progress writes only land on the generation that queued them.
     * A newer save or a delete leaves this at zero so the old worker stops.
     */
    @Query(
        """
        UPDATE episode_download
        SET phase = :phase,
            progressPercent = :progressPercent,
            localPath = :localPath,
            error = :error
        WHERE anilistId = :anilistId
          AND episode = :episode
          AND url = :url
          AND updatedAtEpochMs = :updatedAtEpochMs
        """,
    )
    suspend fun updateIfCurrent(
        anilistId: Int,
        episode: Int,
        url: String,
        updatedAtEpochMs: Long,
        phase: String,
        progressPercent: Int,
        localPath: String?,
        error: String?,
    ): Int

    @Query("DELETE FROM episode_download WHERE anilistId = :anilistId AND episode = :episode")
    suspend fun delete(anilistId: Int, episode: Int)
}
