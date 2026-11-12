package site.anikitty.desktop.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * AniKitty black UI — solid near-black canvas, hot pink accent, no haze.
 */
val KittyInk = Color(0xFF000000)
val KittyPage = Color(0xFF000000)
val KittySurface = Color(0xFF141414)
val KittySurfaceElevated = Color(0xFF1C1C1C)
val KittyGlass = Color(0xFF1A1A1A)
val KittyGlassStrong = Color(0xFF222222)
val KittyText = Color(0xFFFFFFFF)
val KittyMuted = Color(0xFFB3B3B3)
val KittyFaint = Color(0xFF8A8A8A)
val KittyOutline = Color.White.copy(alpha = 0.12f)
val KittyOutlineSoft = Color.White.copy(alpha = 0.08f)
val KittyAccent = Color(0xFFFF2D6A)
val KittyAccentGlow = Color(0xFFFF4D82)
val KittyOnAccent = Color(0xFFFFFFFF)
val KittyWarm = Color(0xFFFF8FB0)

val KittyPageBrush: Brush
    get() = Brush.verticalGradient(
        colors = listOf(KittyPage, KittyPage),
    )

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
    error = Color(0xFFFF6B7A),
)

private val KittyTypography = Typography(
    displaySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 34.sp,
        letterSpacing = (-1.0).sp,
        lineHeight = 38.sp,
    ),
    headlineMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 28.sp,
        letterSpacing = (-0.6).sp,
        lineHeight = 32.sp,
    ),
    headlineSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 22.sp,
        letterSpacing = (-0.4).sp,
    ),
    titleLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Black,
        fontSize = 20.sp,
        letterSpacing = (-0.5).sp,
    ),
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 15.sp,
        letterSpacing = (-0.2).sp,
    ),
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 21.sp,
    ),
    bodySmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 12.sp,
        lineHeight = 17.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        letterSpacing = 0.2.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 0.25.sp,
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
