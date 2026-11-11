package site.anikitty.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

private val Sky = Color(0xFF0EA5E9)
private val Deep = Color(0xFF0284C7)
private val Ink = Color(0xFF0B1220)
private val Mist = Color(0xFFF1F5F9)

private val DarkColors = darkColorScheme(
    primary = Sky,
    secondary = Deep,
    background = Ink,
    surface = Color(0xFF111827),
    onPrimary = Color.White,
    onBackground = Mist,
    onSurface = Mist,
)

private val LightColors = lightColorScheme(
    primary = Deep,
    secondary = Sky,
    background = Mist,
    surface = Color.White,
    onPrimary = Color.White,
    onBackground = Ink,
    onSurface = Ink,
)

@Composable
fun AniKittyTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit,
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        content = content,
    )
}
