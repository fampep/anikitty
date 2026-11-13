// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

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
