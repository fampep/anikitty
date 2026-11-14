// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.theme

import android.provider.Settings
import androidx.compose.animation.core.Easing
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp

/** True while the sample library is on screen. Never means an AniList session. */
val LocalDemoMode = staticCompositionLocalOf { false }

/** Spacing steps used by cards, rows, and page gutters. */
object KittySpace {
    val xs = 4.dp
    val sm = 8.dp
    val md = 16.dp
    val lg = 24.dp
    val xl = 32.dp
}

/** Corner radii. Chips and badges use [pill]. */
object KittyRadius {
    val sm = 8.dp
    val md = 12.dp
    val lg = 16.dp
    val pill = 999.dp
}

/** Shadow depth for cards and sheets. Flat pages stay at [none]. */
object KittyElevation {
    val none = 0.dp
    val card = 6.dp
    val raised = 12.dp
    val sheet = 16.dp
}

/**
 * Motion lengths. [duration] multiplies by the system animator scale and
 * returns 0 when that scale is off, so callers can snap instead of travel.
 */
object KittyMotion {
    const val fast = 160
    const val medium = 240
    const val slow = 320
    val ease: Easing = FastOutSlowInEasing

    @Composable
    fun duration(millis: Int): Int {
        val scale = Settings.Global.getFloat(
            LocalContext.current.contentResolver,
            Settings.Global.ANIMATOR_DURATION_SCALE,
            1f,
        )
        if (scale == 0f) return 0
        return (millis * scale).toInt().coerceAtLeast(0)
    }
}
