// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

package site.anikitty.app.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase

@Database(entities = [WatchHistoryEntity::class], version = 2, exportSchema = false)
abstract class AppDatabase : RoomDatabase() {
    abstract fun watchHistoryDao(): WatchHistoryDao

    companion object {
        fun create(context: Context): AppDatabase =
            Room.databaseBuilder(context, AppDatabase::class.java, "anikitty-local.db")
                .fallbackToDestructiveMigration()
                .build()
    }
}
