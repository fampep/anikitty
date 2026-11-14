// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import androidx.annotation.OptIn
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.okhttp.OkHttpDataSource
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit

/**
 * Playback HTTP goes through OkHttp so Referer and Origin are actually sent.
 * Android's HttpURLConnection drops those headers, and the CDNs answer 403.
 */
@OptIn(UnstableApi::class)
internal object PlaybackHttp {
    val client: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(12, TimeUnit.SECONDS)
        .readTimeout(20, TimeUnit.SECONDS)
        .followRedirects(true)
        .followSslRedirects(true)
        .retryOnConnectionFailure(true)
        .build()

    fun factory(headers: Map<String, String>, userAgent: String): OkHttpDataSource.Factory =
        OkHttpDataSource.Factory(client)
            .setUserAgent(userAgent)
            .setDefaultRequestProperties(headers)
}
