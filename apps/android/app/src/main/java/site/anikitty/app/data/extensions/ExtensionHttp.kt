// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

import okhttp3.CacheControl
import okhttp3.OkHttpClient
import okhttp3.Request
import java.util.concurrent.TimeUnit

internal object ExtensionHttp {
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(8, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .callTimeout(30, TimeUnit.SECONDS)
        .followRedirects(true)
        .retryOnConnectionFailure(true)
        .build()

    fun getString(url: String): String {
        // raw.githubusercontent.com keeps a copy for about five minutes.
        // A new query plus no-cache asks that copy to get out of the way.
        val sep = if ('?' in url) '&' else '?'
        val fresh = "$url${sep}anikitty_refresh=${System.currentTimeMillis()}"
        val req = Request.Builder()
            .url(fresh)
            .cacheControl(CacheControl.FORCE_NETWORK)
            .header("Accept", "application/json, text/plain, */*")
            .header("Pragma", "no-cache")
            .header("User-Agent", "AniKitty-ExtensionClient/1")
            .get()
            .build()
        client.newCall(req).execute().use { resp ->
            val body = resp.body?.string().orEmpty()
            if (!resp.isSuccessful) {
                error("HTTP ${resp.code} fetching $url")
            }
            return body
        }
    }
}
