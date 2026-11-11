package site.anikitty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** Anilab-inspired dark + brand red (#e50914 / #141414). */
private val BrandRed = Color(0xFFE50914)
private val BrandDark = Color(0xFF141414)
private val BrandSurface = Color(0xFF1F1F1F)
private val BrandGray = Color(0xFF2F2F2F)
private val OnDark = Color(0xFFF5F5F5)
private val Muted = Color(0xFFB3B3B3)

private val DarkColors = darkColorScheme(
    primary = BrandRed,
    onPrimary = Color.White,
    secondary = BrandGray,
    onSecondary = OnDark,
    background = BrandDark,
    onBackground = OnDark,
    surface = BrandSurface,
    onSurface = OnDark,
    onSurfaceVariant = Muted,
    outline = BrandGray,
)

@Composable
fun AniKittyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
