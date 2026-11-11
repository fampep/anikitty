package site.anikitty.app.data.server

import android.content.Context

/** Dedicated Go auth server base URL (no website). */
class ServerConfig(context: Context) {
    private val prefs = context.getSharedPreferences("anikitty_server", Context.MODE_PRIVATE)

    var baseUrl: String
        get() = prefs.getString(KEY, DEFAULT)?.trim()?.trimEnd('/') ?: DEFAULT
        set(value) {
            val cleaned = value.trim().trimEnd('/')
            prefs.edit().putString(KEY, cleaned.ifBlank { DEFAULT }).apply()
        }

    companion object {
        const val DEFAULT = "http://10.0.2.2:8788" // emulator → host laptop
        private const val KEY = "base_url"
    }
}
