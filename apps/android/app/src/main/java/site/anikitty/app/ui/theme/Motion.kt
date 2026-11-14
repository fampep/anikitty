// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.theme

import android.provider.Settings
import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext

/** True when the system animator scale is off. Motion should snap instead of travel. */
@Composable
fun prefersReducedMotion(): Boolean {
    val context = LocalContext.current
    val scale = Settings.Global.getFloat(
        context.contentResolver,
        Settings.Global.ANIMATOR_DURATION_SCALE,
        1f,
    )
    return scale == 0f
}

/** Soft moving highlight used while a poster, banner, or row is still loading. */
@Composable
fun ShimmerBox(modifier: Modifier = Modifier) {
    val palette = LocalKittyPalette.current
    val reduced = prefersReducedMotion()
    val base = if (palette.dark) Color(0xFF16161A) else Color(0xFFE6E6E3)
    val highlight = if (palette.dark) Color(0xFF2A2A30) else Color(0xFFF7F7F5)
    if (reduced) {
        androidx.compose.foundation.layout.Box(modifier.background(base))
        return
    }
    val transition = rememberInfiniteTransition(label = "shimmer")
    val travel by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(durationMillis = 1100, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerX",
    )
    androidx.compose.foundation.layout.Box(
        modifier.background(
            Brush.linearGradient(
                colors = listOf(base, highlight, base),
                start = Offset(travel * 900f - 400f, 0f),
                end = Offset(travel * 900f, 240f),
            ),
        ),
    )
}
