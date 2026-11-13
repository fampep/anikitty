// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.anilist

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import site.anikitty.app.BuildConfig
import java.util.UUID

/**
 * AniList sign-in on the phone.
 *
 * Implicit grant, the flow AniList documents for mobile apps: the access token
 * comes back in the redirect fragment. No client secret and no server.
 * The AniList application's redirect URL must be [APP_REDIRECT].
 */
object AniListOAuth {
    const val APP_REDIRECT = "anikitty://anilist"
    private const val AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize"
    private const val PREFS = "anikitty_anilist_oauth"
    private const val KEY_STARTED_AT = "link_started_at_ms"
    private const val KEY_NONCE = "link_nonce"
    /** How long a user-initiated sign-in remains valid for a callback. */
    private const val LINK_TTL_MS = 10 * 60_000L

    fun clientId(): String = BuildConfig.ANILIST_CLIENT_ID.trim().ifBlank { "56768" }

    fun isConfigured(): Boolean = clientId().isNotEmpty()

    fun authorizeUrl(clientId: String = clientId(), state: String): String {
        require(clientId.isNotEmpty()) { "AniList client id not configured" }
        require(state.isNotBlank()) { "OAuth state required" }
        return Uri.parse(AUTHORIZE).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("response_type", "token")
            .appendQueryParameter("state", state)
            .build()
            .toString()
    }

    /** Record that the user just started sign-in; returns the nonce. */
    fun markLinkStarted(context: Context): String {
        val nonce = UUID.randomUUID().toString()
        context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .edit()
            .putLong(KEY_STARTED_AT, System.currentTimeMillis())
            .putString(KEY_NONCE, nonce)
            .apply()
        return nonce
    }

    /**
     * Returns the pending nonce once if a recent [markLinkStarted] is still within [LINK_TTL_MS].
     * Clears the expectation either way so stray callbacks cannot reuse it.
     */
    fun consumeLinkStarted(context: Context): String? {
        val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val startedAt = prefs.getLong(KEY_STARTED_AT, 0L)
        val nonce = prefs.getString(KEY_NONCE, null)
        prefs.edit().remove(KEY_STARTED_AT).remove(KEY_NONCE).apply()
        if (nonce.isNullOrBlank() || startedAt <= 0L) return null
        val age = System.currentTimeMillis() - startedAt
        if (age !in 0..LINK_TTL_MS) return null
        return nonce
    }

    fun openAuthorize(context: Context, clientId: String = clientId()) {
        val state = markLinkStarted(context)
        val url = authorizeUrl(clientId, state)
        CustomTabsIntent.Builder().build().launchUrl(context, Uri.parse(url))
    }

    /**
     * Parse `anikitty://anilist#access_token=…`.
     * AniList puts the token in the fragment. State is checked when AniList echoes it.
     */
    fun parseRedirect(uri: Uri?, expectedState: String): String? {
        if (uri == null) return null
        require(expectedState.isNotBlank()) { "OAuth state required" }
        if (uri.scheme != "anikitty" || uri.host != "anilist") return null
        val map = linkedMapOf<String, String>()
        fun absorb(raw: String?) {
            if (raw.isNullOrBlank()) return
            raw.split('&').forEach { part ->
                val i = part.indexOf('=')
                if (i > 0) map[part.substring(0, i)] = Uri.decode(part.substring(i + 1))
            }
        }
        absorb(uri.fragment)
        absorb(uri.encodedFragment)
        absorb(uri.query)
        map["error"]?.let { err ->
            error(map["error_description"] ?: err)
        }
        val returnedState = map["state"]
        if (!returnedState.isNullOrBlank() && returnedState != expectedState) {
            error("AniList OAuth state mismatch")
        }
        return map["access_token"]?.takeIf { it.isNotBlank() }
    }

    fun matchesCallback(intent: Intent?): Boolean {
        val data = intent?.data ?: return false
        return data.scheme == "anikitty" && data.host == "anilist"
    }
}
