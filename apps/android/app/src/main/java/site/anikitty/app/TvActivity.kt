package site.anikitty.app

import android.content.Intent
import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.Density
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.app.AppRoot
import site.anikitty.app.ui.theme.AniKittyTheme

/** Living-room launcher. Top menu, backdrop, and poster rows for a remote. */
class TvActivity : AppCompatActivity() {
    private var oauthToken by mutableStateOf<String?>(null)
    private var oauthError by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        consumeOAuthIntent(intent)
        val app = application as AnikittyApp
        setContent {
            val density = LocalDensity.current
            CompositionLocalProvider(
                LocalDensity provides Density(density.density * 1.15f, density.fontScale),
            ) {
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
                        forTelevision = true,
                    )
                }
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        consumeOAuthIntent(intent)
    }

    private fun consumeOAuthIntent(intent: Intent?) {
        if (!AniListOAuth.matchesCallback(intent)) return
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
}

fun isTelevisionDevice(config: Configuration, hasLeanback: Boolean): Boolean {
    val mode = config.uiMode and Configuration.UI_MODE_TYPE_MASK
    return mode == Configuration.UI_MODE_TYPE_TELEVISION || hasLeanback
}
