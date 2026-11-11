package site.anikitty.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import site.anikitty.app.ui.shell.ScaffoldApp
import site.anikitty.app.ui.theme.AniKittyTheme

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        val app = application as AnikittyApp
        setContent {
            AniKittyTheme {
                ScaffoldApp(api = app.api, tokenStore = app.tokenStore)
            }
        }
    }
}
