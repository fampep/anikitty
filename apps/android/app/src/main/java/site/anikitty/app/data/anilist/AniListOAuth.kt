package site.anikitty.app.data.anilist

import android.content.Context
import android.content.Intent
import android.net.Uri
import androidx.browser.customtabs.CustomTabsIntent
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import site.anikitty.app.BuildConfig
import java.util.UUID
import java.util.concurrent.TimeUnit

/**
 * AniList sign-in.
 *
 * The registered redirect is https://anikitty.site. AniList sends an authorization
 * code there, and the app exchanges that code for an access token.
 * Older implicit callbacks on anikitty://anilist are still accepted.
 */
object AniListOAuth {
    const val REDIRECT_URI = "https://anikitty.site"
    private const val AUTHORIZE = "https://anilist.co/api/v2/oauth/authorize"
    private const val TOKEN = "https://anilist.co/api/v2/oauth/token"
    private const val PREFS = "anikitty_anilist_oauth"
    private const val KEY_STARTED_AT = "link_started_at_ms"
    private const val KEY_NONCE = "link_nonce"
    /** How long a user-initiated sign-in remains valid for a callback. */
    private const val LINK_TTL_MS = 10 * 60_000L

    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    private val jsonMedia = "application/json".toMediaType()

    fun clientId(): String = BuildConfig.ANILIST_CLIENT_ID.trim().ifBlank { "44419" }

    fun clientSecret(): String = BuildConfig.ANILIST_CLIENT_SECRET.trim()

    fun isConfigured(): Boolean = clientId().isNotEmpty()

    fun authorizeUrl(clientId: String = clientId(), state: String): String {
        require(clientId.isNotEmpty()) { "AniList client id not configured" }
        require(state.isNotBlank()) { "OAuth state required" }
        return Uri.parse(AUTHORIZE).buildUpon()
            .appendQueryParameter("client_id", clientId)
            .appendQueryParameter("redirect_uri", REDIRECT_URI)
            .appendQueryParameter("response_type", "code")
            .appendQueryParameter("state", state)
            .build()
            .toString()
    }

    /** Record that the signed-in user just started linking from Account; returns the nonce. */
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
     * Parse `anikitty://anilist#access_token=…&state=…`.
     * Only the fragment is accepted. [expectedState] must match the fragment `state`.
     */
    fun parseRedirect(uri: Uri?, expectedState: String): String? {
        if (uri == null) return null
        require(expectedState.isNotBlank()) { "OAuth state required" }
        if (uri.scheme != "anikitty" || uri.host != "anilist") return null
        val fragment = uri.fragment.orEmpty()
        if (fragment.isBlank()) return null
        val map = fragment.split('&').mapNotNull { part ->
            val i = part.indexOf('=')
            if (i <= 0) null else part.substring(0, i) to Uri.decode(part.substring(i + 1))
        }.toMap()
        map["error"]?.let { err ->
            error(map["error_description"] ?: err)
        }
        val returnedState = map["state"]
        if (returnedState.isNullOrBlank() || returnedState != expectedState) {
            error("AniList OAuth state mismatch")
        }
        return map["access_token"]?.takeIf { it.isNotBlank() }
    }

    /**
     * Exchange an authorization code from the registered redirect for an access token.
     * [expectedState] must match when AniList returns a state value.
     */
    fun exchangeCode(code: String, expectedState: String, returnedState: String?): String {
        require(code.isNotBlank()) { "AniList did not finish sign-in" }
        require(expectedState.isNotBlank()) { "OAuth state required" }
        if (!returnedState.isNullOrBlank() && returnedState != expectedState) {
            error("AniList sign-in did not match this attempt")
        }
        val secret = clientSecret()
        if (secret.isEmpty()) error("AniList sign-in is not set up on this build")
        val payload = JSONObject()
            .put("grant_type", "authorization_code")
            .put("client_id", clientId())
            .put("client_secret", secret)
            .put("redirect_uri", REDIRECT_URI)
            .put("code", code)
            .toString()
        val request = Request.Builder()
            .url(TOKEN)
            .header("Accept", "application/json")
            .post(payload.toRequestBody(jsonMedia))
            .build()
        http.newCall(request).execute().use { response ->
            val text = response.body?.string().orEmpty()
            val json = runCatching { JSONObject(text) }.getOrNull()
            if (!response.isSuccessful) {
                val message = json?.optString("message").orEmpty().ifBlank {
                    json?.optString("hint").orEmpty()
                }
                error(message.ifBlank { "AniList sign-in failed" })
            }
            return json?.optString("access_token")?.takeIf { it.isNotBlank() }
                ?: error("AniList did not return a token")
        }
    }

    fun isAniListRedirect(uri: Uri?): Boolean {
        if (uri == null) return false
        return uri.scheme == "https" && uri.host.equals("anikitty.site", ignoreCase = true)
    }

    fun matchesCallback(intent: Intent?): Boolean {
        val data = intent?.data ?: return false
        return data.scheme == "anikitty" && data.host == "anilist"
    }
}
