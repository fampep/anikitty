package site.anikitty.desktop.data.server

/**
 * Go auth server on the VPS — same fixed URL as the Android app.
 * Not user-editable; password accounts stay on the dedicated server.
 */
object ServerConfig {
    /** Deployed VPS (not Cloudflare-gated website hosts). */
    const val DEFAULT = "http://198.50.123.153:8788"
}
