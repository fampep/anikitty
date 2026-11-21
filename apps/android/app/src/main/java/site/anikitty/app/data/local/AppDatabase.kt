// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.migration.Migration
import androidx.sqlite.db.SupportSQLiteDatabase
import site.anikitty.app.data.download.EpisodeDownloadDao
import site.anikitty.app.data.download.EpisodeDownloadEntity

@Database(
    entities = [WatchHistoryEntity::class, PendingAniListPush::class, EpisodeDownloadEntity::class],
    version = 5,
    exportSchema = false,
)
abstract class AppDatabase : RoomDatabase() {
    abstract fun watchHistoryDao(): WatchHistoryDao

    abstract fun pendingAniListPushDao(): PendingAniListPushDao

    abstract fun episodeDownloadDao(): EpisodeDownloadDao

    companion object {
        private val MIGRATION_4_5 = object : Migration(4, 5) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL("ALTER TABLE episode_download ADD COLUMN hlsStreams TEXT")
            }
        }

        private val MIGRATION_3_4 = object : Migration(3, 4) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS `episode_download` (
                        `anilistId` INTEGER NOT NULL,
                        `episode` INTEGER NOT NULL,
                        `title` TEXT NOT NULL,
                        `sourceKey` TEXT NOT NULL,
                        `url` TEXT NOT NULL,
                        `headersJson` TEXT NOT NULL,
                        `hls` INTEGER NOT NULL,
                        `stripBytes` INTEGER NOT NULL,
                        `phase` TEXT NOT NULL,
                        `progressPercent` INTEGER NOT NULL,
                        `localPath` TEXT,
                        `error` TEXT,
                        `updatedAtEpochMs` INTEGER NOT NULL,
                        PRIMARY KEY(`anilistId`, `episode`)
                    )
                    """.trimIndent(),
                )
            }
        }

        private val MIGRATION_2_3 = object : Migration(2, 3) {
            override fun migrate(db: SupportSQLiteDatabase) {
                db.execSQL(
                    """
                    CREATE TABLE IF NOT EXISTS pending_anilist_push (
                        anilistId INTEGER NOT NULL PRIMARY KEY,
                        episode INTEGER NOT NULL,
                        totalEpisodes INTEGER,
                        updatedAtEpochMs INTEGER NOT NULL
                    )
                    """.trimIndent(),
                )
            }
        }

        fun create(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "anikitty-local.db")
                .addMigrations(MIGRATION_2_3, MIGRATION_3_4, MIGRATION_4_5)
                .fallbackToDestructiveMigration()
                .build()
    }
}
