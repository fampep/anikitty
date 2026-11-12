package site.anikitty.desktop.ui.player


import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.ui.draw.clip
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.desktop.ui.theme.PlayerChrome


/** Desktop port of Android GlassScrubber — same glassy timeline. */
@Composable
fun DesktopGlassScrubber(
    progress: Float,
    durationMs: Long,
    scrubbing: Boolean,
    onScrub: (Float) -> Unit,
    onScrubFinished: () -> Unit,
    formatClock: (Long) -> String,
    modifier: Mod = Mod,
) {
    val clamped = progress.coerceIn(0f, 1f)
    val animatedProgress by animateFloatAsState(
        targetValue = clamped,
        animationSpec = if (scrubbing) tween(0) else spring(
            dampingRatio = Spring.DampingRatioNoBouncy,
            stiffness = Spring.StiffnessMediumLow,
        ),
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

    BoxWithConstraints(modifier = modifier.fillMaxWidth()) {
        val trackWidthPx = with(density) { maxWidth.toPx() }
        val scrubMs = (clamped * durationMs).toLong()

        if (scrubbing) {
            val bubbleX = (maxWidth * clamped) - 28.dp
            Box(
                modifier = Mod
                    .offset(
                        x = bubbleX.coerceIn(0.dp, (maxWidth - 56.dp).coerceAtLeast(0.dp)),
                        y = (-34).dp,
                    )
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color.Black.copy(alpha = 0.72f))
                    .border(1.dp, PlayerChrome.DiscStroke, RoundedCornerShape(10.dp))
                    .padding(horizontal = 10.dp, vertical = 5.dp),
            ) {
                Text(
                    text = formatClock(scrubMs),
                    color = PlayerChrome.Paper,
                    fontSize = 12.sp,
                    fontWeight = FontWeight.SemiBold,
                )
            }
        }

        Canvas(
            modifier = Mod
                .fillMaxWidth()
                .height(28.dp)
                .pointerInput(durationMs, trackWidthPx) {
                    detectTapGestures { offset ->
                        if (trackWidthPx <= 0f) return@detectTapGestures
                        latestOnScrub((offset.x / trackWidthPx).coerceIn(0f, 1f))
                        latestOnFinished()
                    }
                }
                .pointerInput(durationMs, trackWidthPx) {
                    detectHorizontalDragGestures(
                        onDragStart = { offset ->
                            if (trackWidthPx <= 0f) return@detectHorizontalDragGestures
                            latestOnScrub((offset.x / trackWidthPx).coerceIn(0f, 1f))
                        },
                        onDragEnd = { latestOnFinished() },
                        onDragCancel = { latestOnFinished() },
                        onHorizontalDrag = { change, _ ->
                            change.consume()
                            if (trackWidthPx <= 0f) return@detectHorizontalDragGestures
                            latestOnScrub((change.position.x / trackWidthPx).coerceIn(0f, 1f))
                        },
                    )
                },
        ) {
            val cy = size.height / 2f
            val trackH = 5.dp.toPx()
            val radius = CornerRadius(trackH / 2f, trackH / 2f)
            drawRoundRect(
                brush = Brush.verticalGradient(
                    listOf(Color.White.copy(alpha = 0.22f), Color.White.copy(alpha = 0.08f)),
                ),
                topLeft = Offset(0f, cy - trackH / 2f),
                size = Size(size.width, trackH),
                cornerRadius = radius,
            )
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
                        listOf(
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
                color = Color.White,
                radius = thumbR,
                center = Offset(thumbX, cy),
            )
            drawCircle(
                color = Color.White.copy(alpha = 0.55f),
                radius = thumbR,
                center = Offset(thumbX, cy),
                style = Stroke(width = 1.2.dp.toPx()),
            )
        }
    }
}
