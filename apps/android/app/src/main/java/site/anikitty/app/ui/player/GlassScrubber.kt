// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.border
import androidx.compose.foundation.focusable
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.semantics.ProgressBarRangeInfo
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.progressBarRangeInfo
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.setProgress
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.withTimeoutOrNull
import site.anikitty.app.data.skip.SkipTimes

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
    skipTimes: SkipTimes = SkipTimes(),
    buffered: Float = 0f,
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
            .semantics {
                contentDescription = seekBarDescription(clamped, durationMs)
                progressBarRangeInfo = ProgressBarRangeInfo(clamped.coerceIn(0f, 1f), 0f..1f)
                setProgress { value ->
                    if (durationMs <= 0L) return@setProgress false
                    val next = value.coerceIn(0f, 1f)
                    latestFraction = next
                    latestOnScrub(next)
                    latestOnFinished(next)
                    true
                }
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

        Canvas(
            modifier = Modifier
                .fillMaxWidth()
                .height(28.dp)
                .pointerInput(durationMs, trackWidthPx) {
                    awaitEachGesture {
                        val down = awaitFirstDown()
                        val slop = viewConfiguration.touchSlop
                        val start = down.position
                        fun fractionAt(x: Float): Float {
                            if (trackWidthPx <= 0f) return 0f
                            return (x / trackWidthPx).coerceIn(0f, 1f)
                        }
                        var latest = fractionAt(start.x)
                        var dragging = false
                        var finished = false
                        try {
                            while (true) {
                                if (!dragging) {
                                    val event = withTimeoutOrNull(viewConfiguration.longPressTimeoutMillis) {
                                        awaitPointerEvent()
                                    }
                                    if (event == null) {
                                        dragging = true
                                        latestFraction = latest
                                        latestOnScrub(latest)
                                        continue
                                    }
                                    val change = event.changes.firstOrNull { it.id == down.id }
                                    if (change == null) break
                                    if (!change.pressed) {
                                        latestFraction = latest
                                        latestOnScrub(latest)
                                        latestOnFinished(latest)
                                        finished = true
                                        break
                                    }
                                    val dx = change.position.x - start.x
                                    val dy = change.position.y - start.y
                                    if (dx * dx + dy * dy > slop * slop) {
                                        dragging = true
                                        change.consume()
                                        latest = fractionAt(change.position.x)
                                        latestFraction = latest
                                        latestOnScrub(latest)
                                    }
                                } else {
                                    val event = awaitPointerEvent()
                                    val change = event.changes.firstOrNull { it.id == down.id }
                                    if (change == null || !change.pressed) {
                                        latestOnFinished(latest)
                                        finished = true
                                        break
                                    }
                                    change.consume()
                                    latest = fractionAt(change.position.x)
                                    latestFraction = latest
                                    latestOnScrub(latest)
                                }
                            }
                        } finally {
                            if (dragging && !finished) latestOnFinished(latest)
                        }
                    }
                },
        ) {
            val cy = size.height / 2f
            val trackH = (if (scrubbing) 5.dp else 4.dp).toPx()
            val radius = CornerRadius(trackH / 2f, trackH / 2f)
            val unplayed = Color(0xFF2C2C2C)
            val bufferedColor = Color(0xFF5A5A5A)
            val played = Color(0xFFE8E8E8)
            // Amber stays visible on both the light played rail and the dark remainder.
            val marker = Color(0xFFFFB020)

            drawRoundRect(
                color = unplayed,
                topLeft = Offset(0f, cy - trackH / 2f),
                size = Size(size.width, trackH),
                cornerRadius = radius,
            )

            val bufferedW = size.width * buffered.coerceIn(0f, 1f)
            if (bufferedW > 0f) {
                drawRoundRect(
                    color = bufferedColor,
                    topLeft = Offset(0f, cy - trackH / 2f),
                    size = Size(bufferedW, trackH),
                    cornerRadius = radius,
                )
            }

            val progressW = size.width * animatedProgress
            if (progressW > 0f) {
                drawRoundRect(
                    color = played,
                    topLeft = Offset(0f, cy - trackH / 2f),
                    size = Size(progressW, trackH),
                    cornerRadius = radius,
                )
            }

            if (durationMs > 0 && !skipTimes.isEmpty) {
                val dur = durationMs.coerceAtLeast(1L).toFloat()
                skipTimes.segments.forEach { (_, iv) ->
                    val start = (iv.startMs / dur).coerceIn(0f, 1f)
                    val end = (iv.endMs / dur).coerceIn(0f, 1f)
                    val left = size.width * start
                    val w = (size.width * (end - start)).coerceAtLeast(trackH)
                    drawRoundRect(
                        color = marker,
                        topLeft = Offset(left, cy - trackH / 2f),
                        size = Size(w, trackH),
                        cornerRadius = radius,
                    )
                }
            }

            val thumbR = 6.dp.toPx() * thumbScale
            val thumbX = progressW.coerceIn(thumbR, (size.width - thumbR).coerceAtLeast(thumbR))
            drawCircle(
                color = Color.Black.copy(alpha = 0.28f),
                radius = thumbR + 2.dp.toPx(),
                center = Offset(thumbX, cy),
            )
            drawCircle(
                color = Color.White,
                radius = thumbR,
                center = Offset(thumbX, cy),
            )
        }
    }
}
