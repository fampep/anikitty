package site.anikitty.app

import android.content.Intent
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.shell.AppRoot
import site.anikitty.app.ui.theme.AniKittyTheme

/** AppCompatActivity so Chromecast MediaRouteButton / dialogs inflate correctly. */
class MainActivity : AppCompatActivity() {
    private var oauthToken by mutableStateOf<String?>(null)
    private var oauthError by mutableStateOf<String?>(null)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        consumeOAuthIntent(intent)
        val app = application as AnikittyApp
        setContent {
            AniKittyTheme {
                AppRoot(
                    api = app.api,
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
                )
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
        // Only honor callbacks after Account → Link AniList (short-lived expectation).
        if (!AniListOAuth.consumeLinkStarted(this)) {
            oauthToken = null
            oauthError = "Unexpected AniList callback — tap Link AniList in Account first"
            intent?.data = null
            return
        }
        runCatching {
            oauthToken = AniListOAuth.parseRedirect(intent?.data)
                ?: error("No access token in AniList redirect")
            oauthError = null
        }.onFailure { e ->
            oauthToken = null
            oauthError = e.message ?: "AniList link failed"
        }
        intent?.data = null
    }
}
