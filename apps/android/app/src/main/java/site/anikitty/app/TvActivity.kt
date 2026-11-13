package site.anikitty.app

import android.content.pm.ActivityInfo
import android.content.res.Configuration
import android.os.Bundle
import androidx.activity.compose.setContent
import androidx.appcompat.app.AppCompatActivity
import site.anikitty.app.ui.theme.AniKittyTheme
import site.anikitty.app.ui.tv.TvApp

/** Living-room launcher. Phones keep [MainActivity]. */
class TvActivity : AppCompatActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        val app = application as AnikittyApp
        setContent {
            AniKittyTheme {
                TvApp(
                    aniList = app.aniList,
                    aniListAuth = app.aniListAuth,
                    aniListSync = app.aniListSync,
                    historyDao = app.database.watchHistoryDao(),
                    streamServers = app.streamServers,
                )
            }
        }
    }
}

fun isTelevisionDevice(config: Configuration, hasLeanback: Boolean): Boolean {
    val mode = config.uiMode and Configuration.UI_MODE_TYPE_MASK
    return mode == Configuration.UI_MODE_TYPE_TELEVISION || hasLeanback
}
