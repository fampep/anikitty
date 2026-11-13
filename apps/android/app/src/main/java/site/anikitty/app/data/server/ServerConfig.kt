// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.server

import android.content.Context

/**
 * The phone app does not use a dedicated server. Catalog, sign-in, and
 * lists stay on the device and talk to AniList directly.
 */
class ServerConfig(@Suppress("UNUSED_PARAMETER") context: Context) {
    val baseUrl: String get() = DEFAULT

    companion object {
        const val DEFAULT = ""
    }
}
