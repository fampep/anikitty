package site.anikitty.app.ui.theme

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
 * AniKitty glass dark — deep ink canvas, frosted panels, cool ice accent.
 * On-phone cinema: monochrome glass with a single cool highlight (not purple).
 */
val KittyInk = Color(0xFF05060A)
val KittyPage = Color(0xFF07080F)
val KittySurface = Color(0xCC12141C) // frosted panel (~80% opaque)
val KittySurfaceElevated = Color(0xE61A1D28)
val KittyGlass = Color(0x66141822) // lighter frost for overlays
val KittyGlassStrong = Color(0xB31A1E2A)
val KittyText = Color(0xFFF4F6FA)
val KittyMuted = Color(0xFFB8C0D0)
val KittyFaint = Color(0xFF7A8498)
val KittyOutline = Color.White.copy(alpha = 0.14f)
val KittyOutlineSoft = Color.White.copy(alpha = 0.08f)

/** Cool ice highlight — CTAs stay paper-on-ink for contrast. */
val KittyAccent = Color(0xFFE8EEF7)
val KittyAccentGlow = Color(0xFF7EB6C9)
val KittyOnAccent = Color(0xFF0A0C12)

val KittyNavPillSurface = Color(0xD90C0E16)
val KittyNavPillBorder = Color.White.copy(alpha = 0.14f)
val KittyNavPillSelected = Color(0xFFF0F3F8)
val KittyNavPillSelectedContent = Color(0xFF0A0C12)
val KittyNavPillContent = Color.White.copy(alpha = 0.48f)

val KittyAmbientWash = Color(0xFF7EB6C9).copy(alpha = 0.12f)

/** Page atmosphere — dual radial wash for glass depth. */
val KittyPageBrush: Brush
    get() = Brush.verticalGradient(
        colors = listOf(
            Color(0xFF0C121C),
            KittyPage,
            Color(0xFF05060A),
        ),
    )

object PlayerChrome {
    val Paper = Color(0xFFF0F3F8)
    val Ink = Color(0xFF07080F)
    val Graphite = Paper.copy(alpha = 0.62f)
    val Faint = Paper.copy(alpha = 0.40f)
    val Smoke = Color(0xCC05060A)
    val Sheet = Color(0xE6141822)
    val SheetStroke = Color.White.copy(alpha = 0.16f)
    val RowSelected = Color.White.copy(alpha = 0.12f)
    val Disc = Color(0x99121822)
    val DiscStroke = Color.White.copy(alpha = 0.18f)
    val Accent = Color(0xFFE8EEF7)
    val MarkerIntro = KittyAccentGlow.copy(alpha = 0.55f)
    val MarkerCredits = Paper.copy(alpha = 0.35f)
    val MarkerRecap = Paper.copy(alpha = 0.45f)
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
    titleMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Bold,
        fontSize = 17.sp,
        letterSpacing = (-0.25).sp,
    ),
    titleSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        letterSpacing = (-0.1).sp,
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
    labelLarge = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        letterSpacing = 0.1.sp,
    ),
    labelMedium = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 11.sp,
        letterSpacing = 0.3.sp,
    ),
    labelSmall = TextStyle(
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        fontSize = 10.sp,
        letterSpacing = 0.4.sp,
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
