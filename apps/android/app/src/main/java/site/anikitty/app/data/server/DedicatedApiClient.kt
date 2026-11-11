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

    data class AuthResult(val token: String, val username: String)

    suspend fun health(): Boolean = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url("/health")).get().build()
        http.newCall(req).execute().use { it.isSuccessful }
    }

    suspend fun signup(username: String, password: String): AuthResult =
        authPost("/api/v1/auth/signup", username, password)

    suspend fun login(username: String, password: String): AuthResult =
        authPost("/api/v1/auth/login", username, password)

    suspend fun me(): String = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/auth/me").get().build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            JSONObject(body).optString("username")
        }
    }

    suspend fun logout() = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/auth/logout").post(ByteArray(0).toRequestBody(null)).build()
        http.newCall(req).execute().use { }
    }

    private suspend fun authPost(path: String, username: String, password: String): AuthResult =
        withContext(Dispatchers.IO) {
            val payload = JSONObject()
                .put("username", username)
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
                val user = json.optString("username")
                if (token.isBlank()) throw ApiException(res.code, "missing token")
                AuthResult(token = token, username = user)
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
