// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
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
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.SubcomposeAsyncImage
import site.anikitty.app.ui.app.spacePress
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
) {
    if (slides.isEmpty()) return
    val palette = LocalKittyPalette.current
    val reduced = prefersReducedMotion()
    val state = rememberLazyListState()
    val fling = rememberSnapFlingBehavior(lazyListState = state)
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
        itemsIndexed(slides, key = { _, slide -> slide.number }) { _, slide ->
            val selected = slide.number == current
            val progress = when {
                slide.number == current -> currentProgress.coerceIn(0f, 1f)
                watchedThrough > 0 && slide.number <= watchedThrough -> 1f
                else -> 0f
            }
            EpisodeThumb(
                slide = slide,
                selected = selected,
                progress = progress,
                fallbackArt = fallbackArt,
                ink = if (onDark || palette.dark) Color.White else palette.text,
                mute = if (onDark) Color.White.copy(alpha = 0.55f) else palette.muted,
                surface = if (onDark) Color(0xFF16161A) else palette.surface,
                onClick = { onPick(slide.number) },
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
    onClick: () -> Unit,
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
                    contentDescription = slide.title,
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
