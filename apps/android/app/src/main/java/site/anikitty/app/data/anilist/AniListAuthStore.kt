// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/** Encrypted AniList OAuth access token + viewer profile. */
class AniListAuthStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "anikitty_anilist",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var accessToken: String?
        get() = prefs.getString(KEY_TOKEN, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_TOKEN) else putString(KEY_TOKEN, value)
            }.apply()
        }

    var userId: Int
        get() = prefs.getInt(KEY_USER_ID, 0)
        set(value) {
            prefs.edit().putInt(KEY_USER_ID, value).apply()
        }

    var username: String?
        get() = prefs.getString(KEY_USERNAME, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_USERNAME) else putString(KEY_USERNAME, value)
            }.apply()
        }

    var avatarUrl: String?
        get() = prefs.getString(KEY_AVATAR, null)
        set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_AVATAR) else putString(KEY_AVATAR, value)
            }.apply()
        }

    var bannerUrl: String?
        get() = prefs.getString(KEY_BANNER, null)
        private set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_BANNER) else putString(KEY_BANNER, value)
            }.apply()
        }

    var about: String?
        get() = prefs.getString(KEY_ABOUT, null)
        private set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_ABOUT) else putString(KEY_ABOUT, value)
            }.apply()
        }

    var animeCount: Int
        get() = prefs.getInt(KEY_ANIME_COUNT, 0)
        private set(value) { prefs.edit().putInt(KEY_ANIME_COUNT, value).apply() }

    var episodesWatched: Int
        get() = prefs.getInt(KEY_EPISODES, 0)
        private set(value) { prefs.edit().putInt(KEY_EPISODES, value).apply() }

    var minutesWatched: Int
        get() = prefs.getInt(KEY_MINUTES, 0)
        private set(value) { prefs.edit().putInt(KEY_MINUTES, value).apply() }

    var meanScore: Float
        get() = prefs.getFloat(KEY_SCORE, 0f)
        private set(value) { prefs.edit().putFloat(KEY_SCORE, value).apply() }

    var watchingCount: Int
        get() = prefs.getInt(KEY_WATCHING, 0)
        private set(value) { prefs.edit().putInt(KEY_WATCHING, value).apply() }

    var completedCount: Int
        get() = prefs.getInt(KEY_COMPLETED, 0)
        private set(value) { prefs.edit().putInt(KEY_COMPLETED, value).apply() }

    var planningCount: Int
        get() = prefs.getInt(KEY_PLANNING, 0)
        private set(value) { prefs.edit().putInt(KEY_PLANNING, value).apply() }

    var pausedCount: Int
        get() = prefs.getInt(KEY_PAUSED, 0)
        private set(value) { prefs.edit().putInt(KEY_PAUSED, value).apply() }

    var droppedCount: Int
        get() = prefs.getInt(KEY_DROPPED, 0)
        private set(value) { prefs.edit().putInt(KEY_DROPPED, value).apply() }

    val isLinked: Boolean get() = !accessToken.isNullOrBlank()

    fun saveViewer(token: String, viewer: AniListViewer) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putInt(KEY_USER_ID, viewer.id)
            .putString(KEY_USERNAME, viewer.name)
            .putInt(KEY_ANIME_COUNT, viewer.animeCount)
            .putInt(KEY_EPISODES, viewer.episodesWatched)
            .putInt(KEY_MINUTES, viewer.minutesWatched)
            .putFloat(KEY_SCORE, viewer.meanScore.toFloat())
            .putInt(KEY_WATCHING, viewer.watching)
            .putInt(KEY_COMPLETED, viewer.completed)
            .putInt(KEY_PLANNING, viewer.planning)
            .putInt(KEY_PAUSED, viewer.paused)
            .putInt(KEY_DROPPED, viewer.dropped)
            .apply {
                if (viewer.avatarUrl.isNullOrBlank()) remove(KEY_AVATAR)
                else putString(KEY_AVATAR, viewer.avatarUrl)
                if (viewer.bannerUrl.isNullOrBlank()) remove(KEY_BANNER)
                else putString(KEY_BANNER, viewer.bannerUrl)
                if (viewer.about.isNullOrBlank()) remove(KEY_ABOUT)
                else putString(KEY_ABOUT, viewer.about)
            }
            .apply()
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val KEY_TOKEN = "access_token"
        const val KEY_USER_ID = "user_id"
        const val KEY_USERNAME = "username"
        const val KEY_AVATAR = "avatar"
        const val KEY_BANNER = "banner"
        const val KEY_ABOUT = "about"
        const val KEY_ANIME_COUNT = "anime_count"
        const val KEY_EPISODES = "episodes_watched"
        const val KEY_MINUTES = "minutes_watched"
        const val KEY_SCORE = "mean_score"
        const val KEY_WATCHING = "watching_count"
        const val KEY_COMPLETED = "completed_count"
        const val KEY_PLANNING = "planning_count"
        const val KEY_PAUSED = "paused_count"
        const val KEY_DROPPED = "dropped_count"
    }
}
