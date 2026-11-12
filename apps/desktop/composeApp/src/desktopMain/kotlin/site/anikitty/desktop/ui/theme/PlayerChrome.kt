package site.anikitty.desktop.ui.theme

import androidx.compose.ui.graphics.Color

/** Mirrors Android PlayerChrome — Plex-leaning glass controls. */
object PlayerChrome {
    val Paper = Color(0xFFF5F7FA)
    val Progress = Color(0xFFE8C547)
    val DiscStroke = Color.White.copy(alpha = 0.28f)
    val Faint = Paper.copy(alpha = 0.42f)
    val MarkerIntro = KittyAccentGlow.copy(alpha = 0.55f)
    val MarkerCredits = Paper.copy(alpha = 0.35f)
    val MarkerRecap = Paper.copy(alpha = 0.45f)
}
