// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app

import android.content.Intent
import android.os.Bundle
import android.view.KeyEvent
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import site.anikitty.app.cast.CastHardwareVolume
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.app.AppRoot
import site.anikitty.app.ui.theme.AniKittyTheme

/** AppCompatActivity so Chromecast MediaRouteButton / dialogs inflate correctly. */
class MainActivity : AppCompatActivity() {
    private var oauthToken by mutableStateOf<String?>(null)
    private var oauthError by mutableStateOf<String?>(null)
    private var requestDemo by mutableStateOf(false)
    private var requestBrowse by mutableStateOf(false)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        requestDemo = intent?.getBooleanExtra(EXTRA_DEMO, false) == true
        requestBrowse = intent?.getBooleanExtra(EXTRA_BROWSE, false) == true
        consumeOAuthIntent(intent)
        val app = application as AnikittyApp
        setContent {
            AniKittyTheme {
                AppRoot(
                    session = app.session,
                    savedPassphrase = app.savedPassphrase,
                    aniList = app.aniList,
                    aniListAuth = app.aniListAuth,
                    aniListSync = app.aniListSync,
                    historyDao = app.database.watchHistoryDao(),
                    streamServers = app.streamServers,
                    pendingAniListToken = oauthToken,
                    pendingAniListError = oauthError,
                    onConsumedAniListToken = {
                        oauthToken = null
                        oauthError = null
                    },
                    requestDemo = requestDemo,
                    requestBrowse = requestBrowse,
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (intent.getBooleanExtra(EXTRA_DEMO, false)) requestDemo = true
        if (intent.getBooleanExtra(EXTRA_BROWSE, false)) requestBrowse = true
        consumeOAuthIntent(intent)
    }

    override fun onKeyDown(keyCode: Int, event: KeyEvent): Boolean {
        val step = CastHardwareVolume.onStep
        val direction = when (keyCode) {
            KeyEvent.KEYCODE_VOLUME_UP -> 1
            KeyEvent.KEYCODE_VOLUME_DOWN -> -1
            KeyEvent.KEYCODE_VOLUME_MUTE -> 0
            else -> null
        }
        if (step != null && direction != null) {
            if (direction == 0 && event.repeatCount > 0) return true
            if (step(direction)) return true
        }
        return super.onKeyDown(keyCode, event)
    }

    private fun consumeOAuthIntent(intent: Intent?) {
        if (!AniListOAuth.matchesCallback(intent)) return
        // Only honor callbacks after Account → Link AniList (short-lived expectation + state).
        val expectedState = AniListOAuth.consumeLinkStarted(this)
        if (expectedState.isNullOrBlank()) {
            oauthToken = null
            oauthError = "Unexpected AniList callback — tap Sign in with AniList first"
            intent?.data = null
            return
        }
        runCatching {
            oauthToken = AniListOAuth.parseRedirect(intent?.data, expectedState)
                ?: error("No access token in AniList redirect")
            oauthError = null
        }.onFailure { e ->
            oauthToken = null
            oauthError = e.message ?: "AniList link failed"
        }
        intent?.data = null
    }

    companion object {
        const val EXTRA_DEMO = "demo"
        /** Public AniList catalog. Does not sign in and does not load the sample library. */
        const val EXTRA_BROWSE = "browse"
    }
}
