// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Typography
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.Immutable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

/**
 * AniKitty canvas — black page, white type, solid dark surfaces, white accent.
 * Original Compose. ShonenX / glass-cinema apps were look references only; no source copied.
 */
val KittyInk = Color(0xFF000000)
val KittyPage = Color(0xFF000000)
val KittySurface = Color(0xFF141414)
val KittySurfaceElevated = Color(0xFF2F2F2F)
val KittyGlass = Color(0xFF1A1A1A)
val KittyGlassStrong = Color(0xFF222222)
val KittyText = Color(0xFFFFFFFF)
val KittyMuted = Color(0xFFB3B3B3)
val KittyFaint = Color(0xFF8A8A8A)
val KittyOutline = Color.White.copy(alpha = 0.12f)
val KittyOutlineSoft = Color.White.copy(alpha = 0.08f)

/** White chrome — CTAs, progress, selected tabs. Text on those controls is black. */
val KittyAccent = Color(0xFFFFFFFF)
val KittyAccentGlow = Color(0xFFD4D4D4)
val KittyOnAccent = Color(0xFF000000)

val KittyNavPillSurface = Color(0xFF08080C)
val KittyNavPillBorder = Color.White.copy(alpha = 0.08f)
val KittyNavPillSelected = KittyAccent
val KittyNavPillSelectedContent = KittyOnAccent
val KittyNavPillContent = Color.White.copy(alpha = 0.45f)

val KittyAmbientWash = Color.Transparent

/** Flat black page — no gradient atmosphere. */
val KittyPageBrush: Brush
    get() = Brush.verticalGradient(
        colors = listOf(KittyPage, KittyPage),
    )

object PlayerChrome {
    val Paper = Color(0xFFF5F7FA)
    val Ink = Color(0xFF000000)
    val Graphite = Paper.copy(alpha = 0.72f)
    val Faint = Paper.copy(alpha = 0.42f)
    val Smoke = Color(0xCC000000)
    val Sheet = Color(0xF2141414)
    val SheetStroke = KittyAccent.copy(alpha = 0.32f)
    val RowSelected = KittyAccent.copy(alpha = 0.16f)
    val Disc = Color(0xFF1A1A1A)
    val DiscStroke = Color.White.copy(alpha = 0.16f)
    val DiscLarge = Color(0xFF222222)
    val Accent = KittyAccent
    val Progress = KittyAccent
    val ProgressGlow = KittyAccent.copy(alpha = 0.40f)
    val TrackGlass = Color.White.copy(alpha = 0.16f)
    val MarkerIntro = KittyAccentGlow.copy(alpha = 0.55f)
    val MarkerCredits = Paper.copy(alpha = 0.35f)
    val MarkerRecap = Paper.copy(alpha = 0.45f)
}

@Immutable
data class KittyPalette(
    val page: Color,
    val text: Color,
    val muted: Color,
    val faint: Color,
    val surface: Color,
    val hairline: Color,
    val accent: Color,
    val onAccent: Color,
    val dark: Boolean,
)

val KittyDarkPalette = KittyPalette(
    page = KittyPage,
    text = KittyText,
    muted = KittyMuted,
    faint = KittyFaint,
    surface = Color(0xFF0C0C10),
    hairline = KittyOutlineSoft,
    accent = KittyAccent,
    onAccent = KittyOnAccent,
    dark = true,
)

val KittyLightPalette = KittyPalette(
    page = Color(0xFFF3F3F1),
    text = Color(0xFF141414),
    muted = Color(0xFF5E5E5E),
    faint = Color(0xFF8A8A8A),
    surface = Color(0xFFFFFFFF),
    hairline = Color(0x14141414),
    accent = Color(0xFF141414),
    onAccent = Color(0xFFFFFFFF),
    dark = false,
)

val LocalKittyPalette = staticCompositionLocalOf { KittyDarkPalette }

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
    error = Color(0xFFE53935),
)

private val LightColors = lightColorScheme(
    primary = KittyLightPalette.accent,
    onPrimary = KittyLightPalette.onAccent,
    secondary = Color(0xFFE7E7E4),
    onSecondary = KittyLightPalette.text,
    background = KittyLightPalette.page,
    onBackground = KittyLightPalette.text,
    surface = KittyLightPalette.surface,
    onSurface = KittyLightPalette.text,
    onSurfaceVariant = KittyLightPalette.muted,
    outline = KittyLightPalette.hairline,
    error = Color(0xFFB42318),
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
        lineHeight = 24.sp,
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
    val dark = isSystemInDarkTheme()
    val palette = if (dark) KittyDarkPalette else KittyLightPalette
    CompositionLocalProvider(LocalKittyPalette provides palette) {
        MaterialTheme(
            colorScheme = if (dark) DarkColors else LightColors,
            typography = KittyTypography,
            content = content,
        )
    }
}
