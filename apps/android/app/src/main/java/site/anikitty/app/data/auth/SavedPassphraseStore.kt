// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.auth

import android.content.Context
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey

/**
 * Optional on-device save of the account password for quick sign-in /
 * device passkey-style unlock later. Same password still works on the host.
 */
class SavedPassphraseStore(context: Context) {
    private val prefs = EncryptedSharedPreferences.create(
        context,
        "anikitty_saved_passphrase",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    var password: String?
        get() = prefs.getString(KEY_PASS, null)
        private set(value) {
            prefs.edit().apply {
                if (value.isNullOrBlank()) remove(KEY_PASS) else putString(KEY_PASS, value)
            }.apply()
        }

    /** Device unlock / optional passkey-style gate enabled. */
    var deviceUnlockEnabled: Boolean
        get() = prefs.getBoolean(KEY_UNLOCK, false)
        set(value) {
            prefs.edit().putBoolean(KEY_UNLOCK, value).apply()
        }

    val hasSaved: Boolean get() = !password.isNullOrBlank()

    fun save(password: String) {
        this.password = password
    }

    fun clear() {
        prefs.edit().clear().apply()
    }

    private companion object {
        const val KEY_PASS = "password"
        const val KEY_UNLOCK = "device_unlock"
    }
}
