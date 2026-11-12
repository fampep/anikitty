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
 * First runnable surface for AP-54 — glass shell + AniList Home.
 */
fun main() = application {
    val state = rememberWindowState(size = DpSize(1280.dp, 800.dp))
    Window(
        onCloseRequest = ::exitApplication,
        title = "AniKitty",
        state = state,
    ) {
        window.minimumSize = Dimension(960, 640)
        AniKittyTheme {
            AniKittyDesktopApp()
        }
    }
}
