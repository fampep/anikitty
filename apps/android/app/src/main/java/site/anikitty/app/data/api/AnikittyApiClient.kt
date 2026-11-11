package site.anikitty.app.data.api

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Thin HTTP client for the existing AniKitty Next.js API.
 *
 * Auth model (phase 1):
 * - Login with passphrase returns JSON including a token field (cookie also set for browsers).
 * - Persist that token and send Authorization: Bearer on gated routes.
 *
 * Content APIs (later screens):
 * - Catalog / search / anime detail under /api/anime/...
 * - Continue watching /api/account/watch/continue
 * - Watchlist /api/account/watchlist
 * - Streams /api/kitty/... (after auth)
 * - Passkeys /api/account/auth/passkey/... (Credential Manager, phase 2)
 */
class AnikittyApiClient(
    private val baseUrl: String,
    private val tokenProvider: () -> String?,
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    data class HealthResult(val ok: Boolean, val raw: String)
    data class MeResult(val username: String?, val raw: String)

    /** Outcome of passphrase login against POST /api/account/auth/login. */
    sealed class LoginResult {
        data class Success(val token: String, val username: String?) : LoginResult()
        /** TOTP enabled: API returns HTTP 200 with requires2fa + pendingToken (no session token yet). */
        data class Requires2fa(val pendingToken: String) : LoginResult()
    }

    suspend fun health(): HealthResult = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url("/api/health"))
            .get()
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            HealthResult(ok = response.isSuccessful, raw = body.ifBlank { response.message })
        }
    }

    suspend fun loginWithPassphrase(passphrase: String): LoginResult = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("passphrase", passphrase).toString()
        val request = authorizedBuilder("/api/account/auth/login")
            .post(payload.toRequestBody(jsonMedia))
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val err = runCatching { JSONObject(body).optString("error") }.getOrNull()
                throw ApiException(response.code, err?.takeIf { it.isNotBlank() } ?: body)
            }
            val json = JSONObject(body)
            if (json.optBoolean("requires2fa", false)) {
                val pending = json.optString("pendingToken")
                if (pending.isBlank()) {
                    throw ApiException(response.code, "2FA required but pendingToken was missing")
                }
                return@use LoginResult.Requires2fa(pendingToken = pending)
            }
            val token = json.optString("token")
            if (token.isBlank()) {
                throw ApiException(response.code, "Login succeeded but no token was returned")
            }
            val username = json.optJSONObject("user")?.optString("username")
            LoginResult.Success(token = token, username = username?.takeIf { it.isNotBlank() })
        }
    }

    suspend fun me(): MeResult = withContext(Dispatchers.IO) {
        val request = authorizedBuilder("/api/account/me")
            .get()
            .build()
        http.newCall(request).execute().use { response ->
            val body = response.body?.string().orEmpty()
            if (!response.isSuccessful) {
                val err = runCatching { JSONObject(body).optString("error") }.getOrNull()
                throw ApiException(response.code, err?.takeIf { it.isNotBlank() } ?: body)
            }
            val json = runCatching { JSONObject(body) }.getOrNull()
            val username = json?.optJSONObject("user")?.optString("username")
                ?: json?.optString("username")
            MeResult(username = username?.takeIf { it.isNotBlank() }, raw = body)
        }
    }

    private fun url(path: String): String {
        val root = baseUrl.trimEnd('/')
        val suffix = if (path.startsWith("/")) path else "/$path"
        return root + suffix
    }

    private fun authorizedBuilder(path: String): Request.Builder {
        val builder = Request.Builder()
            .url(url(path))
            .header("Accept", "application/json")
        tokenProvider()?.takeIf { it.isNotBlank() }?.let { token ->
            builder.header("Authorization", "Bearer $token")
        }
        return builder
    }
}

class ApiException(val statusCode: Int, message: String) : Exception("HTTP $statusCode: $message")
