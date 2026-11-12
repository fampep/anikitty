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
 * AniKitty glass dark — mirrored from the Android app so desktop stays on-brand.
 * Deep ink canvas, frosted panels, cool ice accent (not purple).
 */
val KittyInk = Color(0xFF05060A)
val KittyPage = Color(0xFF07080F)
val KittySurface = Color(0xB8141822)
val KittySurfaceElevated = Color(0xD91A1F2C)
val KittyText = Color(0xFFF4F6FA)
val KittyMuted = Color(0xFFB8C0D0)
val KittyFaint = Color(0xFF7A8498)
val KittyOutline = Color.White.copy(alpha = 0.18f)
val KittyAccent = Color(0xFFE8EEF7)
val KittyAccentGlow = Color(0xFF7EB6C9)
val KittyOnAccent = Color(0xFF0A0C12)

val KittyPageBrush: Brush
    get() = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0E1622),
            KittyPage,
            Color(0xFF05060A),
        ),
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
        fontSize = 36.sp,
        letterSpacing = (-0.8).sp,
        lineHeight = 40.sp,
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
    bodyMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Normal,
        fontSize = 14.sp,
        lineHeight = 20.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 0.2.sp,
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
