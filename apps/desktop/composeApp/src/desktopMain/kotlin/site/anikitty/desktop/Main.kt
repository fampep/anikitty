package site.anikitty.desktop

import androidx.compose.ui.unit.DpSize
import androidx.compose.ui.unit.dp
import androidx.compose.ui.window.Window
import androidx.compose.ui.window.application
import androidx.compose.ui.window.rememberWindowState
import site.anikitty.desktop.ui.AniKittyDesktopApp
import site.anikitty.desktop.ui.theme.AniKittyTheme
import java.awt.Dimension

/**
 * AniKitty Windows / desktop entry (Compose Multiplatform JVM).
 * Full glass catalog app (AP-65) — featured home, overview, FFmpeg player.
 */
fun main() = application {
    val state = rememberWindowState(size = DpSize(1360.dp, 860.dp))
    Window(
        onCloseRequest = ::exitApplication,
        title = "AniKitty",
        state = state,
    ) {
        window.minimumSize = Dimension(1024, 700)
        AniKittyTheme {
            AniKittyDesktopApp()
        }
    }
}
