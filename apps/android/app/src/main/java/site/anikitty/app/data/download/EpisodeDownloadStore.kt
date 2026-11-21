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
    val sourceKey: String,
    val url: String,
    val headersJson: String,
    val hls: Boolean,
    val stripBytes: Int,
    val phase: String,
    val progressPercent: Int,
    val localPath: String?,
    val error: String?,
    val updatedAtEpochMs: Long,
    /** Null keeps every rendition. A plan string keeps one variant and its audio. */
    val hlsStreams: String? = null,
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

    @Query(
        """
        UPDATE episode_download
        SET hlsStreams = :hlsStreams
        WHERE anilistId = :anilistId
          AND episode = :episode
          AND url = :url
          AND updatedAtEpochMs = :updatedAtEpochMs
        """,
    )
    suspend fun setHlsStreams(
        anilistId: Int,
        episode: Int,
        url: String,
        updatedAtEpochMs: Long,
        hlsStreams: String,
    ): Int

    /**
     * A fresh resolve rotated the signed URL. Keep the file and the generation
     * a worker already captured.
     */
    @Query(
        """
        UPDATE episode_download
        SET url = :url, headersJson = :headersJson
        WHERE anilistId = :anilistId
          AND episode = :episode
          AND sourceKey = :sourceKey
          AND phase = 'READY'
          AND hls = 0
        """,
    )
    suspend fun refreshReadyFileUrl(
        anilistId: Int,
        episode: Int,
        sourceKey: String,
        url: String,
        headersJson: String,
    ): Int
}
