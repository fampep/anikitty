// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.CornerRadius
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.geometry.Size
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Path
import androidx.compose.ui.graphics.StrokeCap
import androidx.compose.ui.graphics.StrokeJoin
import androidx.compose.ui.graphics.drawscope.Stroke
import androidx.compose.ui.graphics.drawscope.withTransform
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.NestedScrollConnection
import androidx.compose.ui.input.nestedscroll.NestedScrollSource
import androidx.compose.ui.layout.onGloballyPositioned
import androidx.compose.ui.layout.positionInRoot
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.LifecycleEventObserver
import androidx.lifecycle.compose.LocalLifecycleOwner
import kotlin.random.Random
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import java.util.Calendar
import site.anikitty.app.ui.theme.KittyHaptics
import site.anikitty.app.ui.theme.LookState
import site.anikitty.app.ui.theme.prefersReducedMotion

/**
 * Shared glance target. Scroll and taps nudge it; faces read it.
 * Updates are throttled so a fling does not recompose every frame.
 */
object KittyDock {
    var shown by mutableStateOf(true)

    fun onDelta(dy: Float) {
        if (dy < -10f) shown = false
        else if (dy > 10f) shown = true
        if (kotlin.math.abs(dy) > 14f) {
            KittyAttention.nudge(0f, if (dy < 0f) -0.4f else 0.4f)
        }
    }
}

object KittyAttention {
    var x by mutableFloatStateOf(0f)
    var y by mutableFloatStateOf(0f)
    private var nextAllowed = 0L

    fun nudge(nx: Float, ny: Float) {
        val now = android.os.SystemClock.uptimeMillis()
        if (now < nextAllowed) return
        nextAllowed = now + 180L
        x = nx.coerceIn(-1f, 1f)
        y = ny.coerceIn(-1f, 1f)
    }
}

/**
 * The simplified kitten face, drawn as vectors.
 * Eyes are their own layer so they can blink and glance.
 * Motion uses short tweens with no overshoot. Reduced motion stays still.
 */
@Composable
fun KittyFace(
    modifier: Modifier = Modifier,
    animated: Boolean = true,
    waving: Boolean = false,
    contentDescription: String = "AniKitty",
) {
    val reduced = prefersReducedMotion()
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var resumed by remember { mutableStateOf(lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)) }
    DisposableEffect(lifecycle) {
        val observer = LifecycleEventObserver { _, _ ->
            resumed = lifecycle.currentState.isAtLeast(Lifecycle.State.RESUMED)
        }
        lifecycle.addObserver(observer)
        onDispose { lifecycle.removeObserver(observer) }
    }
    var onScreen by remember { mutableStateOf(false) }
    val live = animated && !reduced && resumed && onScreen
    val blink = remember { Animatable(1f) }
    val lookX = remember { Animatable(0f) }
    val lookY = remember { Animatable(0f) }
    LaunchedEffect(live) {
        if (!live) {
            blink.snapTo(1f)
            lookX.snapTo(0f)
            lookY.snapTo(0f)
            return@LaunchedEffect
        }
        while (isActive) {
            delay(Random.nextLong(3000L, 7000L))
            if (!isActive) return@LaunchedEffect
            blink.animateTo(0.12f, tween(80, easing = FastOutSlowInEasing))
            blink.animateTo(1f, tween(110, easing = FastOutSlowInEasing))
        }
    }
    LaunchedEffect(live) {
        if (!live) return@LaunchedEffect
        val glances = listOf(
            0.7f to 0f,
            -0.7f to 0f,
            0f to -0.55f,
            0f to 0f,
        )
        while (isActive) {
            delay(Random.nextLong(4000L, 8000L))
            if (!isActive) return@LaunchedEffect
            val (gx, gy) = glances.random()
            lookX.animateTo(gx, tween(260, easing = FastOutSlowInEasing))
            lookY.animateTo(gy, tween(260, easing = FastOutSlowInEasing))
            delay(420)
            lookX.animateTo(0f, tween(280, easing = FastOutSlowInEasing))
            lookY.animateTo(0f, tween(280, easing = FastOutSlowInEasing))
        }
    }
    val wave = if (waving) waveDegrees(live) else 0f
    Canvas(
        modifier
            .semantics { this.contentDescription = contentDescription }
            .onGloballyPositioned { coords ->
                var root = coords
                var parent = coords.parentCoordinates
                while (parent != null) {
                    root = parent
                    parent = parent.parentCoordinates
                }
                val pos = coords.positionInRoot()
                onScreen = pos.y < root.size.height && pos.y + coords.size.height > 0f
            }
            .graphicsLayer {
                rotationZ = wave
                transformOrigin = androidx.compose.ui.graphics.TransformOrigin.Center
            },
    ) {
        val followX = (lookX.value * 0.65f + KittyAttention.x * 0.35f).coerceIn(-1f, 1f)
        val followY = (lookY.value * 0.65f + KittyAttention.y * 0.35f).coerceIn(-1f, 1f)
        drawKittyFace(blink.value, followX, followY)
    }
}

@Composable
private fun waveDegrees(live: Boolean): Float {
    val transition = rememberInfiniteTransition(label = "kittyWave")
    val angle by transition.animateFloat(
        initialValue = -6f,
        targetValue = 6f,
        animationSpec = infiniteRepeatable(
            animation = tween(1400, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Reverse,
        ),
        label = "wave",
    )
    return if (live) angle else 0f
}

private fun androidx.compose.ui.graphics.drawscope.DrawScope.drawKittyFace(
    blink: Float,
    lookX: Float,
    lookY: Float,
) {
    fun p(x: Float, y: Float) = Offset(x / 108f * size.width, y / 108f * size.height)
    drawRoundRect(
        color = Color.Black,
        cornerRadius = CornerRadius(size.minDimension * 0.22f, size.minDimension * 0.22f),
    )
    val head = Path().apply {
        moveTo(p(28f, 58f).x, p(28f, 58f).y)
        cubicTo(p(28f, 46f).x, p(28f, 46f).y, p(38f, 40f).x, p(38f, 40f).y, p(54f, 40f).x, p(54f, 40f).y)
        cubicTo(p(70f, 40f).x, p(70f, 40f).y, p(80f, 46f).x, p(80f, 46f).y, p(80f, 58f).x, p(80f, 58f).y)
        cubicTo(p(80f, 66f).x, p(80f, 66f).y, p(72f, 76f).x, p(72f, 76f).y, p(54f, 78f).x, p(54f, 78f).y)
        cubicTo(p(36f, 76f).x, p(36f, 76f).y, p(28f, 66f).x, p(28f, 66f).y, p(28f, 58f).x, p(28f, 58f).y)
        close()
    }
    val leftEar = Path().apply {
        moveTo(p(34f, 50f).x, p(34f, 50f).y)
        cubicTo(p(33f, 40f).x, p(33f, 40f).y, p(36f, 28f).x, p(36f, 28f).y, p(41f, 22f).x, p(41f, 22f).y)
        cubicTo(p(43f, 18f).x, p(43f, 18f).y, p(46f, 20f).x, p(46f, 20f).y, p(47f, 24f).x, p(47f, 24f).y)
        cubicTo(p(49f, 34f).x, p(49f, 34f).y, p(51f, 46f).x, p(51f, 46f).y, p(52f, 50f).x, p(52f, 50f).y)
        close()
    }
    val rightEar = Path().apply {
        moveTo(p(56f, 50f).x, p(56f, 50f).y)
        cubicTo(p(59f, 46f).x, p(59f, 46f).y, p(61f, 34f).x, p(61f, 34f).y, p(63f, 24f).x, p(63f, 24f).y)
        cubicTo(p(64f, 20f).x, p(64f, 20f).y, p(67f, 18f).x, p(67f, 18f).y, p(69f, 22f).x, p(69f, 22f).y)
        cubicTo(p(74f, 28f).x, p(74f, 28f).y, p(77f, 40f).x, p(77f, 40f).y, p(76f, 50f).x, p(76f, 50f).y)
        close()
    }
    drawPath(head, Color.White)
    drawPath(leftEar, Color.White)
    drawPath(rightEar, Color.White)
    val innerL = Path().apply {
        moveTo(p(38f, 46f).x, p(38f, 46f).y)
        lineTo(p(43f, 30f).x, p(43f, 30f).y)
        lineTo(p(48f, 44f).x, p(48f, 44f).y)
        close()
    }
    val innerR = Path().apply {
        moveTo(p(60f, 44f).x, p(60f, 44f).y)
        lineTo(p(65f, 30f).x, p(65f, 30f).y)
        lineTo(p(70f, 46f).x, p(70f, 46f).y)
        close()
    }
    drawPath(innerL, Color.Black)
    drawPath(innerR, Color.Black)
    val shift = Offset(lookX * size.width * 0.035f, lookY * size.height * 0.03f)
    fun eye(cx: Float, cy: Float, hx: Float, hy: Float) {
        val c = p(cx, cy)
        val radius = 6.6f / 108f * size.minDimension
        withTransform({
            translate(c.x + shift.x, c.y + shift.y)
            scale(1f, blink.coerceIn(0.12f, 1f), Offset.Zero)
            translate(-(c.x + shift.x), -(c.y + shift.y))
        }) {
            drawCircle(Color.Black, radius, c + shift)
            drawCircle(Color.White, 1.7f / 108f * size.minDimension, p(hx, hy) + shift)
        }
    }
    eye(40.5f, 62f, 38.2f, 59.6f)
    eye(67.5f, 62f, 65.2f, 59.6f)
    val mouth = Path().apply {
        moveTo(p(49f, 70.5f).x, p(49f, 70.5f).y)
        cubicTo(p(50.6f, 73.4f).x, p(50.6f, 73.4f).y, p(52.2f, 73.4f).x, p(52.2f, 73.4f).y, p(54f, 70.6f).x, p(54f, 70.6f).y)
        cubicTo(p(55.8f, 73.4f).x, p(55.8f, 73.4f).y, p(57.4f, 73.4f).x, p(57.4f, 73.4f).y, p(59f, 70.5f).x, p(59f, 70.5f).y)
    }
    drawPath(
        mouth,
        Color.Black,
        style = Stroke(
            width = 1.35f / 108f * size.minDimension,
            cap = StrokeCap.Round,
            join = StrokeJoin.Round,
        ),
    )
}

@Composable
fun rememberDockScroll(): NestedScrollConnection = remember {
    object : NestedScrollConnection {
        override fun onPreScroll(available: Offset, source: NestedScrollSource): Offset {
            KittyDock.onDelta(available.y)
            return Offset.Zero
        }
    }
}

/** Weekly minutes ring around the face. Fill eases in. A hit celebrates once that week. */
@Composable
fun WeekGoalRing(
    minutes: Int,
    goal: Int,
    modifier: Modifier = Modifier,
) {
    val reduced = prefersReducedMotion()
    val target = if (goal <= 0) 0f else (minutes.toFloat() / goal.toFloat()).coerceIn(0f, 1f)
    val sweep = remember { Animatable(if (reduced) target else 0f) }
    LaunchedEffect(target, reduced) {
        if (reduced) sweep.snapTo(target) else sweep.animateTo(target, tween(700, easing = FastOutSlowInEasing))
    }
    val context = LocalContext.current
    val view = LocalView.current
    LaunchedEffect(target) {
        if (target < 1f) return@LaunchedEffect
        val cal = Calendar.getInstance()
        val key = "${cal.get(Calendar.YEAR)}-${cal.get(Calendar.WEEK_OF_YEAR)}"
        if (LookState.markWeekCelebrated(context, key)) {
            KittyHaptics.perform(view, KittyHaptics.Kind.Success)
        }
    }
    Box(modifier, contentAlignment = Alignment.Center) {
        Canvas(Modifier.fillMaxSize()) {
            val stroke = Stroke(width = size.minDimension * 0.07f, cap = StrokeCap.Round)
            val inset = stroke.width / 2f
            val arcSize = Size(size.width - stroke.width, size.height - stroke.width)
            val topLeft = Offset(inset, inset)
            drawArc(
                color = Color.White.copy(alpha = 0.18f),
                startAngle = 0f,
                sweepAngle = 360f,
                useCenter = false,
                topLeft = topLeft,
                size = arcSize,
                style = stroke,
            )
            if (sweep.value > 0f) {
                drawArc(
                    color = Color.White,
                    startAngle = -90f,
                    sweepAngle = 360f * sweep.value,
                    useCenter = false,
                    topLeft = topLeft,
                    size = arcSize,
                    style = stroke,
                )
            }
        }
        KittyFace(
            modifier = Modifier.fillMaxSize(0.68f),
            waving = target >= 1f,
            contentDescription = "This week",
        )
    }
}
