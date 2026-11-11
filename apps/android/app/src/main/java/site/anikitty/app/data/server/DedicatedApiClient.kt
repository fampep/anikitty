package site.anikitty.app.data.server

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.util.concurrent.TimeUnit

/**
 * Talks only to the dedicated Go server (accounts + history).
 * Scraping / streaming never hits this host.
 */
class DedicatedApiClient(
    private val baseUrlProvider: () -> String,
    private val tokenProvider: () -> String?,
) {
    private val jsonMedia = "application/json; charset=utf-8".toMediaType()
    private val http = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .build()

    data class AuthResult(val token: String, val userId: String)

    suspend fun health(): Boolean = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url("/health")).get().build()
        http.newCall(req).execute().use { it.isSuccessful }
    }

    suspend fun signup(password: String): AuthResult =
        authPost("/api/v1/auth/signup", password)

    suspend fun login(password: String): AuthResult =
        authPost("/api/v1/auth/login", password)

    suspend fun me(): String = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/auth/me").get().build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            JSONObject(body).optString("userId").ifBlank {
                JSONObject(body).optString("username")
            }
        }
    }

    suspend fun passkeyStatus(): Pair<Boolean, String> = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/auth/passkey/status").get().build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            val json = JSONObject(body)
            json.optBoolean("available") to json.optString("reason")
        }
    }

    /** Best-effort revoke. Pass [bearer] when the local session was already cleared. */
    suspend fun logout(bearer: String? = tokenProvider()) = withContext(Dispatchers.IO) {
        val token = bearer?.takeIf { it.isNotBlank() } ?: return@withContext
        val quick = http.newBuilder()
            .connectTimeout(3, TimeUnit.SECONDS)
            .readTimeout(3, TimeUnit.SECONDS)
            .callTimeout(4, TimeUnit.SECONDS)
            .build()
        val req = Request.Builder()
            .url(url("/api/v1/auth/logout"))
            .post(ByteArray(0).toRequestBody(null))
            .header("Accept", "application/json")
            .header("Authorization", "Bearer $token")
            .build()
        quick.newCall(req).execute().use { }
    }

    private suspend fun authPost(path: String, password: String): AuthResult =
        withContext(Dispatchers.IO) {
            val payload = JSONObject()
                .put("password", password)
                .toString()
            val req = Request.Builder()
                .url(url(path))
                .post(payload.toRequestBody(jsonMedia))
                .header("Accept", "application/json")
                .build()
            http.newCall(req).execute().use { res ->
                val body = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
                val json = JSONObject(body)
                val token = json.optString("token")
                val userId = json.optString("userId")
                if (token.isBlank()) throw ApiException(res.code, "missing token")
                AuthResult(token = token, userId = userId)
            }
        }

    private fun url(path: String): String {
        val root = baseUrlProvider().trimEnd('/')
        return root + if (path.startsWith("/")) path else "/$path"
    }

    private fun authed(path: String): Request.Builder {
        val b = Request.Builder().url(url(path)).header("Accept", "application/json")
        tokenProvider()?.takeIf { it.isNotBlank() }?.let { b.header("Authorization", "Bearer $it") }
        return b
    }

    private fun errorMessage(body: String): String =
        runCatching { JSONObject(body).optString("error") }.getOrNull()?.takeIf { it.isNotBlank() }
            ?: body.ifBlank { "request failed" }
}

class ApiException(val status: Int, message: String) : Exception("HTTP $status: $message")
