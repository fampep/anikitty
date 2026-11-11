package site.anikitty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/**
 * AniKitty phone chrome — OLED dark canvas (media-app feel) with a mint accent.
 * Inspired by self-hosted media clients’ dense browse layouts, not a clone.
 */
val KittyInk = Color(0xFF000000)
val KittyPage = Color(0xFF111111)
val KittySurface = Color(0xFF181A1F)
val KittySurfaceElevated = Color(0xFF22252C)
val KittyAccent = Color(0xFF3EE0C5)
val KittyOnAccent = Color(0xFF041814)
val KittyText = Color(0xFFEDEDED)
val KittyMuted = Color(0xFFEDEDED).copy(alpha = 0.60f)
val KittyOutline = Color.White.copy(alpha = 0.12f)

private val DarkColors = darkColorScheme(
    primary = KittyAccent,
    onPrimary = KittyOnAccent,
    secondary = KittySurfaceElevated,
    onSecondary = KittyText,
    background = KittyPage,
    onBackground = KittyText,
    surface = KittySurface,
    onSurface = KittyText,
    onSurfaceVariant = KittyMuted,
    outline = KittyOutline,
    error = Color(0xFFFF6B6B),
)

@Composable
fun AniKittyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
