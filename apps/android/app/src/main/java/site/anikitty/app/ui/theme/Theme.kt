package site.anikitty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Sky = Color(0xFF0EA5E9)
private val Deep = Color(0xFF0284C7)
private val Ink = Color(0xFF0B1220)
private val Mist = Color(0xFFF1F5F9)

/** Always dark — AniKitty APK is dark-themed. */
private val DarkColors = darkColorScheme(
    primary = Sky,
    secondary = Deep,
    background = Ink,
    surface = Color(0xFF111827),
    onPrimary = Color.White,
    onBackground = Mist,
    onSurface = Mist,
)

@Composable
fun AniKittyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
