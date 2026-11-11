package site.anikitty.app.data.anilist

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import site.anikitty.app.BuildConfig

/**
 * AniList OAuth helpers.
 *
 * Uses the implicit token grant (`response_type=token`) so the APK does not need
 * a client secret. Register redirect URI [REDIRECT_URI] on the AniList API client.
 */
object AniListOAuth {
    const val REDIRECT_URI = "anikitty://anilist"
    private const val AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize"

    fun clientId(): String = BuildConfig.ANILIST_CLIENT_ID.trim()

    fun isConfigured(): Boolean = clientId().isNotEmpty()

    fun authorizeUrl(clientId: String = clientId()): String {
        require(clientId.isNotEmpty()) { "AniList client id not configured" }
        return Uri.parse(AUTHORIZE).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("response_type", "token")
            .build()
            .toString()
    }

    fun openAuthorize(context: Context, clientId: String = clientId()) {
        val url = authorizeUrl(clientId)
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    /** Parse `anikitty://anilist#access_token=…&token_type=Bearer` (or query). */
    fun parseRedirect(uri: Uri?): String? {
        if (uri == null) return null
        if (uri.scheme != "anikitty" || uri.host != "anilist") return null
        val fragment = uri.fragment.orEmpty()
        if (fragment.isNotBlank()) {
            val map = fragment.split('&').mapNotNull { part ->
                val i = part.indexOf('=')
                if (i <= 0) null else part.substring(0, i) to Uri.decode(part.substring(i + 1))
            }.toMap()
            map["access_token"]?.takeIf { it.isNotBlank() }?.let { return it }
            map["error"]?.let { err ->
                error(map["error_description"] ?: err)
            }
        }
        return uri.getQueryParameter("access_token")?.takeIf { it.isNotBlank() }
    }

    fun matchesCallback(intent: Intent?): Boolean {
        val data = intent?.data ?: return false
        return data.scheme == "anikitty" && data.host == "anilist"
    }
}
