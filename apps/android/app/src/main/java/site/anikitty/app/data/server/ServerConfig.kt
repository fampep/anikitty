package site.anikitty.app.data.server

import android.content.Context

/**
 * Go auth server on the VPS. URL is fixed — not user-editable.
 * Cleartext for this host is permitted in release via network_security_config.xml.
 */
class ServerConfig(@Suppress("UNUSED_PARAMETER") context: Context) {
    val baseUrl: String get() = DEFAULT

    companion object {
        /** Deployed VPS (not the Cloudflare-gated website hosts). */
        const val DEFAULT = "http://198.50.123.153:8788"
    }
}
