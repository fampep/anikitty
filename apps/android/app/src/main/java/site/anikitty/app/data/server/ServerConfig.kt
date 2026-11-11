package site.anikitty.app.data.server

import android.content.Context

/**
 * Dedicated Go auth server. URL is fixed to the deployed VPS — not user-editable.
 */
class ServerConfig(@Suppress("UNUSED_PARAMETER") context: Context) {
    val baseUrl: String get() = DEFAULT

    companion object {
        const val DEFAULT = "http://198.50.123.153:8788"
    }
}
