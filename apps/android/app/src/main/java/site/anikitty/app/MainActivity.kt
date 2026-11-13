package site.anikitty.app

import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.app.AppRoot
import site.anikitty.app.ui.theme.AniKittyTheme

/** AppCompatActivity so Chromecast MediaRouteButton / dialogs inflate correctly. */
class MainActivity : AppCompatActivity() {
    private var oauthToken by mutableStateOf<String?>(null)
    private var oauthError by mutableStateOf<String?>(null)
    private var pairUri by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        if (openOnTelevision(intent)) return
        enableEdgeToEdge()
        consumeIncomingIntent(intent)
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
                    pendingPairUri = pairUri,
                    onConsumedPairUri = { pairUri = null },
                )
            }
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        setIntent(intent)
        if (openOnTelevision(intent)) return
        consumeIncomingIntent(intent)
    }

    private fun openOnTelevision(intent: Intent?): Boolean {
        val television = isTelevisionDevice(
            config = resources.configuration,
            hasLeanback = packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK),
        )
        if (!television) return false
        startActivity(
            Intent(this, TvActivity::class.java).apply {
                data = intent?.data
                addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
            },
        )
        finish()
        return true
    }

    private fun consumeIncomingIntent(intent: Intent?) {
        val data = intent?.data
        if (data?.scheme == "anikitty" && data.host == "pair") {
            pairUri = data.toString()
            intent.data = null
            return
        }
        consumeOAuthIntent(intent)
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
}
