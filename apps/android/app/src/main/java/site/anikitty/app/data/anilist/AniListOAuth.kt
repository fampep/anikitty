package site.anikitty.app.data.anilist

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import site.anikitty.app.BuildConfig
import java.util.UUID

/**
 * AniList OAuth helpers.
 *
 * Uses the implicit token grant (`response_type=token`) so the APK does not need
 * a client secret. Register redirect URI [REDIRECT_URI] on the AniList API client.
 *
 * Deep-link callbacks are only accepted after [markLinkStarted] (user tapped Link),
 * so a crafted `anikitty://anilist` intent cannot silently bind another identity
 * to a signed-in password session.
 */
object AniListOAuth {
    const val REDIRECT_URI = "anikitty://anilist"
    private const val AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize"
    private const val PREFS = "anikitty_anilist_oauth"
    private const val KEY_STARTED_AT = "link_started_at_ms"
    private const val KEY_NONCE = "link_nonce"
    /** How long a user-initiated Link AniList tap remains valid for a callback. */
    private const val LINK_TTL_MS = 10 * 60_000L

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

    /** Record that the signed-in user just started linking from Account. */
    fun markLinkStarted(context: Context) {
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .putString(KEY_NONCE, UUID.randomUUID().toString())
            .apply()
    }

    /**
     * Returns true once if a recent [markLinkStarted] is still within [LINK_TTL_MS].
     * Clears the expectation either way so stray callbacks cannot reuse it.
     */
    fun consumeLinkStarted(context: Context): Boolean {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val startedAt = prefs.getLong(KEY_STARTED_AT, 0L)
        val nonce = prefs.getString(KEY_NONCE, null)
        prefs.edit().remove(KEY_STARTED_AT).remove(KEY_NONCE).apply()
        if (nonce.isNullOrBlank() || startedAt <= 0L) return false
        val age = System.currentTimeMillis() - startedAt
        return age in 0..LINK_TTL_MS
    }

    fun openAuthorize(context: Context, clientId: String = clientId()) {
        markLinkStarted(context)
        val url = authorizeUrl(clientId)
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    /**
     * Parse `anikitty://anilist#access_token=…&token_type=Bearer`.
     * Only the fragment is accepted (AniList implicit grant). Query
     * `access_token` is ignored so crafted VIEW intents cannot inject a token.
     */
    fun parseRedirect(uri: Uri?): String? {
        if (uri == null) return null
        if (uri.scheme != "anikitty" || uri.host != "anilist") return null
        val fragment = uri.fragment.orEmpty()
        if (fragment.isBlank()) return null
        val map = fragment.split('&').mapNotNull { part ->
            val i = part.indexOf('=')
            if (i <= 0) null else part.substring(0, i) to Uri.decode(part.substring(i + 1))
        }.toMap()
        map["access_token"]?.takeIf { it.isNotBlank() }?.let { return it }
        map["error"]?.let { err ->
            error(map["error_description"] ?: err)
        }
        return null
    }

    fun matchesCallback(intent: Intent?): Boolean {
        val data = intent?.data ?: return false
        return data.scheme == "anikitty" && data.host == "anilist"
    }
}
