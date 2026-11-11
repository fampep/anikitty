package site.anikitty.app.data.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Optional on-device save of username + passphrase so the phone/tablet can
 * sign in again without retyping. Same passphrase still works against the host.
 */
class SavedPassphraseStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "anikitty_saved_passphrase",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var username: String?
        get() = prefs.getString(KEY_USER, null)
        private set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_USER) else putString(KEY_USER, value)
            }.apply()
        }

    var passphrase: String?
        get() = prefs.getString(KEY_PASS, null)
        private set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_PASS) else putString(KEY_PASS, value)
            }.apply()
        }

    val hasSaved: Boolean
        get() = !username.isNullOrBlank() && !passphrase.isNullOrBlank()

    fun save(username: String, passphrase: String) {
        this.username = username.trim()
        this.passphrase = passphrase
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val KEY_USER = "username"
        const val KEY_PASS = "passphrase"
    }
}
