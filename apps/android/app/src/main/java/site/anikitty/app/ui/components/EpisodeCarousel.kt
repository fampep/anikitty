// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.gestures.snapping.rememberSnapFlingBehavior
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.selected
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import site.anikitty.app.ui.app.spacePress
import kotlinx.coroutines.delay
import site.anikitty.app.ui.theme.KittyHaptics
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.ShimmerBox
import site.anikitty.app.ui.theme.prefersReducedMotion

data class EpisodeSlide(
    val number: Int,
    val title: String,
    val imageUrl: String?,
)

/**
 * Horizontal episode scrubber. Each cell is that episode's thumbnail,
 * with a progress line and a snap so the row settles on a frame.
 */
@Composable
fun EpisodeCarousel(
    slides: List<EpisodeSlide>,
    current: Int,
    watchedThrough: Int,
    currentProgress: Float,
    fallbackArt: String?,
    onPick: (Int) -> Unit,
    modifier: Modifier = Modifier,
    onDark: Boolean = false,
    minutesLeft: Int? = null,
    onToggleWatched: ((Int) -> Unit)? = null,
) {
    if (slides.isEmpty()) return
    val palette = LocalKittyPalette.current
    val reduced = prefersReducedMotion()
    val view = LocalView.current
    val state = rememberLazyListState()
    val fling = rememberSnapFlingBehavior(lazyListState = state)
    var didScroll by remember { mutableStateOf(false) }
    var peekNumber by remember { mutableIntStateOf(-1) }
    var lastPeekAt by remember { mutableLongStateOf(0L) }
    LaunchedEffect(state.isScrollInProgress) {
        if (state.isScrollInProgress) {
            didScroll = true
        } else if (didScroll) {
            didScroll = false
            KittyHaptics.perform(view, KittyHaptics.Kind.Tick)
            if (reduced) return@LaunchedEffect
            val layout = state.layoutInfo
            val viewportCenter = (layout.viewportStartOffset + layout.viewportEndOffset) / 2f
            val nearest = layout.visibleItemsInfo.minByOrNull { info ->
                kotlin.math.abs(info.offset + info.size / 2f - viewportCenter)
            }
            val slide = nearest?.let { slides.getOrNull(it.index) }
            val now = android.os.SystemClock.uptimeMillis()
            if (
                slide != null &&
                watchedThrough > 0 &&
                slide.number <= watchedThrough &&
                slide.number != current &&
                now - lastPeekAt > 900L
            ) {
                lastPeekAt = now
                peekNumber = slide.number
                delay(700)
                if (peekNumber == slide.number) peekNumber = -1
            }
        }
    }
    LaunchedEffect(current, slides.size) {
        val index = slides.indexOfFirst { it.number == current }
        if (index < 0) return@LaunchedEffect
        val visible = state.layoutInfo.visibleItemsInfo.any { it.index == index }
        if (visible && state.firstVisibleItemIndex == index) return@LaunchedEffect
        if (reduced) state.scrollToItem(index) else state.animateScrollToItem(index)
    }
    LazyRow(
        state = state,
        flingBehavior = fling,
        modifier = modifier.fillMaxWidth(),
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        itemsIndexed(slides, key = { _, slide -> slide.number }) { index, slide ->
            val selected = slide.number == current
            val progress = when {
                slide.number == current -> currentProgress.coerceIn(0f, 1f)
                watchedThrough > 0 && slide.number <= watchedThrough -> 1f
                else -> 0f
            }
            val layout = state.layoutInfo
            val info = layout.visibleItemsInfo.firstOrNull { it.index == index }
            val scale = if (reduced || info == null) {
                1f
            } else {
                val viewportCenter = (layout.viewportStartOffset + layout.viewportEndOffset) / 2f
                val center = info.offset + info.size / 2f
                val distance = kotlin.math.abs(center - viewportCenter)
                1f - (distance / 900f).coerceIn(0f, 0.08f)
            }
            EpisodeThumb(
                slide = slide,
                selected = selected,
                progress = progress,
                fallbackArt = fallbackArt,
                ink = if (onDark || palette.dark) Color.White else palette.text,
                mute = if (onDark) Color.White.copy(alpha = 0.55f) else palette.muted,
                surface = if (onDark) Color(0xFF16161A) else palette.surface,
                scale = scale,
                minutesLeft = if (selected) minutesLeft else null,
                peek = peekNumber == slide.number,
                onClick = { onPick(slide.number) },
                onSwipeWatched = onToggleWatched?.let { toggle ->
                    {
                        KittyHaptics.perform(view, KittyHaptics.Kind.Success)
                        toggle(slide.number)
                    }
                },
            )
        }
    }
}

@Composable
private fun EpisodeThumb(
    slide: EpisodeSlide,
    selected: Boolean,
    progress: Float,
    fallbackArt: String?,
    ink: Color,
    mute: Color,
    surface: Color,
    scale: Float,
    minutesLeft: Int?,
    peek: Boolean,
    onClick: () -> Unit,
    onSwipeWatched: (() -> Unit)?,
) {
    val shape = RoundedCornerShape(8.dp)
    val border by animateDpAsState(
        if (selected) 1.5.dp else 0.dp,
        tween(180),
        label = "epBorder",
    )
    val art = slide.imageUrl?.takeIf { it.isNotBlank() } ?: fallbackArt
    Column(
        modifier = Modifier
            .width(168.dp)
            .semantics(mergeDescendants = true) {
                contentDescription = buildString {
                    append("Episode ${slide.number}")
                    if (slide.title.isNotBlank()) append(". ${slide.title}")
                    if (selected) append(". Selected")
                }
                this.selected = selected
            }
            .graphicsLayer {
                scaleX = scale
                scaleY = scale
            }
            .then(
                if (onSwipeWatched == null) {
                    Modifier
                } else {
                    Modifier.pointerInput(slide.number) {
                        var total = 0f
                        detectVerticalDragGestures(
                            onDragEnd = {
                                if (total < -72f) onSwipeWatched()
                                total = 0f
                            },
                            onDragCancel = { total = 0f },
                            onVerticalDrag = { change, drag ->
                                total += drag
                                if (total < -24f) change.consume()
                            },
                        )
                    }
                },
            )
            .spacePress(onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(94.dp)
                .clip(shape)
                .background(surface)
                .border(border, if (selected) ink else Color.Transparent, shape),
        ) {
            if (art != null) {
                SubcomposeAsyncImage(
                    model = art,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                    loading = { ShimmerBox(Modifier.fillMaxSize()) },
                    error = {
                        ThumbFallback(slide.number, ink, surface)
                    },
                )
            } else {
                ThumbFallback(slide.number, ink, surface)
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0.45f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.72f),
                        ),
                    ),
            )
            Text(
                "${slide.number}",
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 8.dp, bottom = if (progress > 0f) 8.dp else 6.dp),
            )
            if (peek && minutesLeft == null) {
                KittyFace(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .size(22.dp),
                    animated = false,
                    contentDescription = "Watched",
                )
            }
            if (minutesLeft != null) {
                Text(
                    "$minutesLeft min left",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 10.sp,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(Color.Black.copy(alpha = 0.55f))
                        .padding(horizontal = 6.dp, vertical = 3.dp),
                )
            }
            if (progress > 0f) {
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(2.dp)
                        .background(Color.White.copy(alpha = 0.22f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress.coerceIn(0.04f, 1f))
                            .background(Color.White),
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            slide.title.ifBlank { "Episode ${slide.number}" },
            color = if (selected) ink else mute,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
            fontSize = 12.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun ThumbFallback(number: Int, ink: Color, surface: Color) {
    Box(Modifier.fillMaxSize().background(surface), contentAlignment = Alignment.Center) {
        Text("$number", color = ink, fontWeight = FontWeight.SemiBold, fontSize = 18.sp)
    }
}
