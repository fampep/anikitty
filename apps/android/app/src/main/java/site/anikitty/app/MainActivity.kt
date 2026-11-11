package site.anikitty.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import site.anikitty.app.ui.shell.AppRoot
import site.anikitty.app.ui.theme.AniKittyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as AnikittyApp
        setContent {
            AniKittyTheme {
                AppRoot(
                    api = app.api,
                    session = app.session,
                    savedPassphrase = app.savedPassphrase,
                    serverConfig = app.serverConfig,
                    aniList = app.aniList,
                    historyDao = app.database.watchHistoryDao(),
                    streamServers = app.streamServers,
                )
            }
        }
    }
}
