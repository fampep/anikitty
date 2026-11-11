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

    val isLinked: Boolean get() = !accessToken.isNullOrBlank()

    fun saveViewer(token: String, viewer: AniListViewer) {
        prefs.edit()
            .putString(KEY_TOKEN, token)
            .putInt(KEY_USER_ID, viewer.id)
            .putString(KEY_USERNAME, viewer.name)
            .apply {
                if (viewer.avatarUrl.isNullOrBlank()) remove(KEY_AVATAR)
                else putString(KEY_AVATAR, viewer.avatarUrl)
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
    }
}
