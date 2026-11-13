// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.data.skip.SkipTimes
import site.anikitty.app.ui.theme.PlayerChrome

/**
 * Glassy timeline scrubber — soft track, glowing progress rail, springy thumb.
 */
@Composable
fun GlassScrubber(
    progress: Float,
    durationMs: Long,
    scrubbing: Boolean,
    onScrub: (Float) -> Unit,
    onScrubFinished: (Float) -> Unit,
    formatClock: (Long) -> String,
    skipTimes: SkipTimes = SkipTimes(),
    modifier: Modifier = Modifier,
) {
    val clamped = progress.coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = clamped,
        animationSpec = if (scrubbing) {
            tween(0)
        } else {
            spring(
                dampingRatio = Spring.DampingRatioNoBouncy,
                stiffness = Spring.StiffnessMediumLow,
            )
        },
        label = "scrubProgress",
    )
    val thumbScale by animateFloatAsState(
        targetValue = if (scrubbing) 1.28f else 1f,
        animationSpec = spring(dampingRatio = 0.65f, stiffness = Spring.StiffnessMedium),
        label = "thumbScale",
    )
    val glowAlpha by animateFloatAsState(
        targetValue = if (scrubbing) 0.55f else 0.28f,
        animationSpec = tween(220, easing = FastOutSlowInEasing),
        label = "glow",
    )
    val latestOnScrub by rememberUpdatedState(onScrub)
    val latestOnFinished by rememberUpdatedState(onScrubFinished)
    val density = LocalDensity.current
    var focused by remember { mutableStateOf(false) }
    var latestFraction by remember { mutableFloatStateOf(clamped) }

    fun jumpBy(deltaMs: Long) {
        if (durationMs <= 0L) return
        val baseMs = latestFraction * durationMs
        val next = (baseMs + deltaMs).coerceIn(0f, durationMs.toFloat()) / durationMs
        latestFraction = next
        latestOnScrub(next)
        latestOnFinished(next)
    }

    BoxWithConstraints(
        modifier = modifier
            .fillMaxWidth()
            .onFocusChanged {
                focused = it.isFocused
                if (it.isFocused) latestFraction = clamped
            }
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionLeft -> {
                        jumpBy(-10_000)
                        true
                    }
                    Key.DirectionRight -> {
                        jumpBy(10_000)
                        true
                    }
                    else -> false
                }
            }
            .border(
                if (focused) 2.dp else 0.dp,
                Color.White.copy(alpha = if (focused) 0.85f else 0f),
                RoundedCornerShape(8.dp),
            ),
    ) {
        val trackWidthPx = with(density) { maxWidth.toPx() }
        val scrubMs = (clamped * durationMs).toLong()

        if (scrubbing) {
            val bubbleX = (maxWidth * clamped) - 28.dp
            Box(
                modifier = Modifier
                    .offset(
                        x = bubbleX.coerceIn(0.dp, (maxWidth - 56.dp).coerceAtLeast(0.dp)),
                        y = (-34).dp,
                    )
                    .clip(RoundedCornerShape(10.dp))
                    .background(PlayerChrome.DiscLarge)
                    .border(1.dp, PlayerChrome.Accent.copy(alpha = 0.45f), RoundedCornerShape(10.dp))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            ) {
                Text(
                    formatClock(scrubMs),
                    color = PlayerChrome.Paper,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(28.dp)
                .pointerInput(durationMs, trackWidthPx) {
                    detectTapGestures { offset ->
                        if (trackWidthPx <= 0f) return@detectTapGestures
                        val fraction = (offset.x / trackWidthPx).coerceIn(0f, 1f)
                        latestFraction = fraction
                        latestOnScrub(fraction)
                        latestOnFinished(fraction)
                    }
                }
                .pointerInput(durationMs, trackWidthPx) {
                    detectHorizontalDragGestures(
                        onDragStart = { offset ->
                            if (trackWidthPx <= 0f) return@detectHorizontalDragGestures
                            val fraction = (offset.x / trackWidthPx).coerceIn(0f, 1f)
                            latestFraction = fraction
                            latestOnScrub(fraction)
                        },
                        onDragEnd = { latestOnFinished(latestFraction) },
                        onDragCancel = { latestOnFinished(latestFraction) },
                        onHorizontalDrag = { change, _ ->
                            change.consume()
                            if (trackWidthPx <= 0f) return@detectHorizontalDragGestures
                            val fraction = (change.position.x / trackWidthPx).coerceIn(0f, 1f)
                            latestFraction = fraction
                            latestOnScrub(fraction)
                        },
                    )
                },
        ) {
            val cy = size.height / 2f
            val trackH = 5.dp.toPx()
            val radius = CornerRadius(trackH / 2f, trackH / 2f)

            drawRoundRect(
                color = PlayerChrome.TrackGlass,
                topLeft = Offset(0f, cy - trackH / 2f),
                size = Size(size.width, trackH),
                cornerRadius = radius,
            )

            if (durationMs > 0 && !skipTimes.isEmpty) {
                val dur = durationMs.coerceAtLeast(1L).toFloat()
                skipTimes.segments.forEach { (kind, iv) ->
                    val start = (iv.startMs / dur).coerceIn(0f, 1f)
                    val end = (iv.endMs / dur).coerceIn(0f, 1f)
                    val color = when (kind) {
                        "intro" -> PlayerChrome.MarkerIntro
                        "credits" -> PlayerChrome.MarkerCredits
                        "recap" -> PlayerChrome.MarkerRecap
                        else -> PlayerChrome.Faint
                    }
                    val left = size.width * start
                    val w = (size.width * (end - start)).coerceAtLeast(3.dp.toPx())
                    drawRoundRect(
                        color = color.copy(alpha = 0.85f),
                        topLeft = Offset(left, cy - 1.5.dp.toPx()),
                        size = Size(w, 3.dp.toPx()),
                        cornerRadius = CornerRadius(2.dp.toPx(), 2.dp.toPx()),
                    )
                }
            }

            val progressW = size.width * animatedProgress
            if (progressW > 0f) {
                drawRoundRect(
                    color = PlayerChrome.Progress.copy(alpha = glowAlpha),
                    topLeft = Offset(0f, cy - trackH),
                    size = Size(progressW, trackH * 2f),
                    cornerRadius = CornerRadius(trackH, trackH),
                )
                drawRoundRect(
                    brush = Brush.horizontalGradient(
                        colors = listOf(
                            PlayerChrome.Progress.copy(alpha = 0.75f),
                            PlayerChrome.Progress,
                            Color.White.copy(alpha = 0.92f),
                        ),
                    ),
                    topLeft = Offset(0f, cy - trackH / 2f),
                    size = Size(progressW, trackH),
                    cornerRadius = radius,
                )
            }

            val thumbR = 8.dp.toPx() * thumbScale
            val thumbX = progressW.coerceIn(thumbR, (size.width - thumbR).coerceAtLeast(thumbR))
            drawCircle(
                color = PlayerChrome.Progress.copy(alpha = glowAlpha),
                radius = thumbR * 1.75f,
                center = Offset(thumbX, cy),
            )
            drawCircle(
                color = PlayerChrome.Progress,
                radius = thumbR,
                center = Offset(thumbX, cy),
            )
            drawCircle(
                color = Color.White.copy(alpha = 0.55f),
                radius = thumbR * 0.35f,
                center = Offset(thumbX - thumbR * 0.18f, cy - thumbR * 0.18f),
            )
            drawCircle(
                color = Color.White.copy(alpha = 0.35f),
                radius = thumbR,
                center = Offset(thumbX, cy),
                style = Stroke(width = 1.2.dp.toPx()),
            )
        }
    }
}
