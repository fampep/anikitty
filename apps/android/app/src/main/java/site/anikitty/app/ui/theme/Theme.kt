package site.anikitty.app.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * Matches the Anikitty web dark theme (globals.css `.dark`):
 * pure black canvas, white primary, zinc borders — monochrome cinema.
 */
val KittyInk = Color(0xFF000000)
val KittyPage = Color(0xFF000000)
val KittySurface = Color(0xFF0A0A0A) // --card 0 0% 4%
val KittySurfaceElevated = Color(0xFF1A1A1A) // ~accent 10%
val KittyText = Color(0xFFFFFFFF)
val KittyMuted = Color(0xFFFFFFFF).copy(alpha = 0.63f) // muted-foreground
val KittyFaint = Color(0xFFFFFFFF).copy(alpha = 0.40f)
val KittyOutline = Color.White.copy(alpha = 0.14f) // --border

/** Web dark primary is white — CTAs are paper on ink. */
val KittyAccent = Color(0xFFFFFFFF)
val KittyOnAccent = Color(0xFF000000)

val KittyNavPillSurface = Color(0xF2000000) // dark:bg-background/95
val KittyNavPillBorder = Color.White.copy(alpha = 0.10f)
val KittyNavPillSelected = Color(0xFFFFFFFF)
val KittyNavPillSelectedContent = Color(0xFF000000)
val KittyNavPillContent = Color.White.copy(alpha = 0.40f)

/** Soft top wash like `.dark body` radial highlight. */
val KittyAmbientWash = Color.White.copy(alpha = 0.05f)

object PlayerChrome {
    val Paper = Color(0xFFEDEDED)
    val Ink = Color(0xFF0B0B0C)
    val Graphite = Paper.copy(alpha = 0.60f)
    val Faint = Paper.copy(alpha = 0.38f)
    val Smoke = Color(0xFF000000).copy(alpha = 0.82f)
    val Disc = Color(0xFF16171A).copy(alpha = 0.55f)
    val DiscStroke = Color.White.copy(alpha = 0.13f)
    val Accent = Color(0xFFFFFFFF)
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

private val KittyTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 34.sp,
        letterSpacing = (-0.5).sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        letterSpacing = (-0.3).sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 18.sp,
        letterSpacing = (-0.2).sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 16.sp,
    ),
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 0.2.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        letterSpacing = 0.3.sp,
    ),
)

@Composable
fun AniKittyTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = DarkColors,
        typography = KittyTypography,
        content = content,
    )
}
