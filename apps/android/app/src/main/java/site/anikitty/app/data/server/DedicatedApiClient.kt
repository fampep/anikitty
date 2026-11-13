// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

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
 * Talks only to the dedicated Go server (accounts, history, comments, favorites).
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

    data class Profile(
        val userId: String,
        val displayName: String,
        val favorites: Int,
        val comments: Int,
    )

    data class Comment(
        val id: String,
        val userId: String,
        val displayName: String,
        val anilistId: Long,
        val episode: Long?,
        val body: String,
        val createdAtEpochMs: Long,
    )

    data class Favorite(
        val anilistId: Long,
        val title: String,
        val coverImageUrl: String?,
    )

    suspend fun health(): Boolean = withContext(Dispatchers.IO) {
        val req = Request.Builder().url(url("/health")).get().build()
        http.newCall(req).execute().use { it.isSuccessful }
    }

    suspend fun signup(password: String): AuthResult =
        authPost("/api/v1/auth/signup", password)

    suspend fun login(password: String): AuthResult =
        authPost("/api/v1/auth/login", password)

    suspend fun me(): Profile = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/auth/me").get().build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            val json = JSONObject(body)
            Profile(
                userId = json.optString("userId"),
                displayName = json.optString("displayName"),
                favorites = json.optInt("favorites"),
                comments = json.optInt("comments"),
            )
        }
    }

    suspend fun updateDisplayName(name: String): String = withContext(Dispatchers.IO) {
        val payload = JSONObject().put("displayName", name).toString()
        val req = authed("/api/v1/auth/me")
            .patch(payload.toRequestBody(jsonMedia))
            .build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            JSONObject(body).optString("displayName")
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

    suspend fun comments(anilistId: Int, episode: Int? = null): List<Comment> =
        withContext(Dispatchers.IO) {
            val q = buildString {
                append("/api/v1/comments?anilistId=").append(anilistId)
                if (episode != null) append("&episode=").append(episode)
            }
            val req = authed(q).get().build()
            http.newCall(req).execute().use { res ->
                val body = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
                val items = JSONObject(body).optJSONArray("items") ?: return@use emptyList()
                buildList {
                    for (i in 0 until items.length()) {
                        val o = items.getJSONObject(i)
                        add(
                            Comment(
                                id = o.optString("id"),
                                userId = o.optString("userId"),
                                displayName = o.optString("displayName"),
                                anilistId = o.optLong("anilistId"),
                                episode = if (o.has("episode") && !o.isNull("episode")) o.optLong("episode") else null,
                                body = o.optString("body"),
                                createdAtEpochMs = o.optLong("createdAtEpochMs"),
                            ),
                        )
                    }
                }
            }
        }

    suspend fun postComment(anilistId: Int, bodyText: String, episode: Int? = null): Comment =
        withContext(Dispatchers.IO) {
            val payload = JSONObject()
                .put("anilistId", anilistId)
                .put("body", bodyText)
                .also { if (episode != null) it.put("episode", episode) }
                .toString()
            val req = authed("/api/v1/comments")
                .post(payload.toRequestBody(jsonMedia))
                .build()
            http.newCall(req).execute().use { res ->
                val body = res.body?.string().orEmpty()
                if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
                val o = JSONObject(body).getJSONObject("item")
                Comment(
                    id = o.optString("id"),
                    userId = o.optString("userId"),
                    displayName = o.optString("displayName"),
                    anilistId = o.optLong("anilistId"),
                    episode = if (o.has("episode") && !o.isNull("episode")) o.optLong("episode") else null,
                    body = o.optString("body"),
                    createdAtEpochMs = o.optLong("createdAtEpochMs"),
                )
            }
        }

    suspend fun deleteComment(id: String) = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/comments/$id").delete().build()
        http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) {
                val body = res.body?.string().orEmpty()
                throw ApiException(res.code, errorMessage(body))
            }
        }
    }

    suspend fun favorites(): List<Favorite> = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/favorites").get().build()
        http.newCall(req).execute().use { res ->
            val body = res.body?.string().orEmpty()
            if (!res.isSuccessful) throw ApiException(res.code, errorMessage(body))
            val items = JSONObject(body).optJSONArray("items") ?: return@use emptyList()
            buildList {
                for (i in 0 until items.length()) {
                    val o = items.getJSONObject(i)
                    add(
                        Favorite(
                            anilistId = o.optLong("anilistId"),
                            title = o.optString("title"),
                            coverImageUrl = o.optString("coverImageUrl").takeIf { it.isNotBlank() },
                        ),
                    )
                }
            }
        }
    }

    suspend fun putFavorite(anilistId: Int, title: String, coverImageUrl: String?) =
        withContext(Dispatchers.IO) {
            val payload = JSONObject()
                .put("anilistId", anilistId)
                .put("title", title)
                .also { if (!coverImageUrl.isNullOrBlank()) it.put("coverImageUrl", coverImageUrl) }
                .toString()
            val req = authed("/api/v1/favorites")
                .put(payload.toRequestBody(jsonMedia))
                .build()
            http.newCall(req).execute().use { res ->
                if (!res.isSuccessful) {
                    val body = res.body?.string().orEmpty()
                    throw ApiException(res.code, errorMessage(body))
                }
            }
        }

    suspend fun deleteFavorite(anilistId: Int) = withContext(Dispatchers.IO) {
        val req = authed("/api/v1/favorites/$anilistId").delete().build()
        http.newCall(req).execute().use { res ->
            if (!res.isSuccessful) {
                val body = res.body?.string().orEmpty()
                throw ApiException(res.code, errorMessage(body))
            }
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
