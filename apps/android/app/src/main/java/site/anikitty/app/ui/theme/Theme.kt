package site.anikitty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color

/** OLED ink — player + floating chrome. */
val KittyInk = Color(0xFF000000)

/** Signed-in page canvas. */
val KittyPage = Color(0xFF111111)

val KittySurface = Color(0xFF181A1F)
val KittySurfaceElevated = Color(0xFF22252C)
val KittyText = Color(0xFFEDEDED)
val KittyMuted = Color(0xFFEDEDED).copy(alpha = 0.60f)
val KittyFaint = Color(0xFFEDEDED).copy(alpha = 0.38f)
val KittyOutline = Color.White.copy(alpha = 0.12f)

/** Accent for anime CTAs — mint, not a media-server brand color. */
val KittyAccent = Color(0xFF3EE0C5)
val KittyOnAccent = Color(0xFF041814)

val KittyNavPillSurface = Color(0xFF15191F)
val KittyNavPillBorder = Color.White.copy(alpha = 0.10f)
val KittyNavPillSelected = Color(0xFFEDEDED)
val KittyNavPillSelectedContent = Color(0xFF0B0B0C)
val KittyNavPillContent = Color.White.copy(alpha = 0.58f)

/** Player overlay language — smoked glass over the picture. */
object PlayerChrome {
    val Paper = Color(0xFFEDEDED)
    val Ink = Color(0xFF0B0B0C)
    val Graphite = Paper.copy(alpha = 0.60f)
    val Faint = Paper.copy(alpha = 0.38f)
    val Smoke = Color(0xFF131417).copy(alpha = 0.955f)
    val Disc = Color(0xFF16171A).copy(alpha = 0.55f)
    val DiscStroke = Color.White.copy(alpha = 0.13f)
    val Accent = KittyAccent
}

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
    error = Color(0xFFEF4444),
)

@Composable
fun AniKittyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        content = content,
    )
}
