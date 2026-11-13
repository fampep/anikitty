// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
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
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.components.KittyRoundIconButton

@Composable
internal fun HomeBar(
    onRefresh: () -> Unit,
    refreshBusy: Boolean,
    onOpenAccount: () -> Unit,
    avatarUrl: String?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 20.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "Anikitty",
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 22.sp,
            letterSpacing = (-0.6).sp,
            modifier = Modifier.weight(1f),
        )
        KittyRoundIconButton(onClick = onRefresh) {
            if (refreshBusy) {
                CircularProgressIndicator(
                    modifier = Modifier.fillMaxSize().padding(8.dp),
                    strokeWidth = 2.dp,
                    color = Color.White,
                )
            } else {
                Icon(
                    Icons.Rounded.Refresh,
                    contentDescription = "Refresh",
                    tint = Color.White,
                    modifier = Modifier.fillMaxSize().padding(8.dp),
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        ProfileMark(
            imageUrl = avatarUrl,
            size = 36.dp,
            modifier = Modifier.spacePress(onOpenAccount),
        )
    }
}

@Composable
internal fun HomeFeatured(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    val pages = items.take(5)
    if (pages.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { pages.size })
    LaunchedEffect(pages.size) {
        if (pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(6500)
            if (!pagerState.isScrollInProgress) {
                pagerState.animateScrollToPage((pagerState.currentPage + 1) % pages.size)
            }
        }
    }
    Box(modifier = Modifier.fillMaxWidth().height(360.dp)) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val anime = pages[page]
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .spacePress { onOpen(anime) },
            ) {
                AsyncImage(
                    model = anime.bannerImageUrl ?: anime.coverImageUrl,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0f to Color.Black.copy(alpha = 0.35f),
                                0.28f to Color.Transparent,
                                0.55f to Color.Black.copy(alpha = 0.35f),
                                1f to Color.Black,
                            ),
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 20.dp, end = 20.dp, bottom = 18.dp)
                        .fillMaxWidth(0.92f),
                ) {
                    val meta = listOfNotNull(
                        anime.format?.takeIf { it.isNotBlank() },
                        anime.seasonYear?.toString(),
                        anime.episodes?.takeIf { it > 0 }?.let { "$it eps" },
                    )
                    if (meta.isNotEmpty()) {
                        Text(
                            meta.joinToString("  ·  "),
                            color = Color.White.copy(alpha = 0.7f),
                            fontWeight = FontWeight.Medium,
                            fontSize = 12.sp,
                            maxLines = 1,
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                    }
                    Text(
                        anime.title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 28.sp,
                        lineHeight = 32.sp,
                        letterSpacing = (-0.6).sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (anime.genres.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(6.dp))
                        Text(
                            anime.genres.take(3).joinToString("   "),
                            color = Color.White.copy(alpha = 0.55f),
                            fontSize = 13.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .padding(horizontal = 16.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Filled.PlayArrow,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.height(16.dp).width(16.dp),
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text(
                            "Play",
                            color = Color.Black,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                        )
                    }
                }
            }
        }
        if (pages.size > 1) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 20.dp, bottom = 22.dp),
                horizontalArrangement = Arrangement.spacedBy(5.dp),
            ) {
                repeat(pages.size) { index ->
                    val selected = pagerState.currentPage == index
                    val width by animateDpAsState(
                        if (selected) 16.dp else 5.dp,
                        tween(180),
                        label = "homeDot",
                    )
                    Box(
                        modifier = Modifier
                            .height(4.dp)
                            .width(width)
                            .clip(CircleShape)
                            .background(if (selected) Color.White else Color.White.copy(alpha = 0.35f)),
                    )
                }
            }
        }
    }
}

@Composable
internal fun HomeBlock(
    title: String,
    subtitle: String? = null,
    onMore: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.padding(top = 28.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                    letterSpacing = (-0.3).sp,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        subtitle,
                        color = Color.White.copy(alpha = 0.45f),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            if (onMore != null) {
                Text(
                    "See all",
                    color = Color.White.copy(alpha = 0.7f),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    modifier = Modifier.spacePress(onMore),
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        content()
    }
}

@Composable
internal fun HomePosterRow(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(items, key = { it.id }) { anime ->
            Column(
                modifier = Modifier
                    .width(112.dp)
                    .spacePress { onOpen(anime) },
            ) {
                AsyncImage(
                    model = anime.coverImageUrl,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(2f / 3f)
                        .clip(RoundedCornerShape(10.dp))
                        .background(Color(0xFF141416)),
                )
                Text(
                    anime.title,
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    fontSize = 12.sp,
                    lineHeight = 15.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 6.dp),
                )
            }
        }
    }
}

internal data class HomeContinueCard(
    val id: Int,
    val title: String,
    val imageUrl: String?,
    val label: String,
    val progress: Float,
    val onClick: () -> Unit,
)

@Composable
internal fun HomeContinueRow(cards: List<HomeContinueCard>) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(cards, key = { it.id }) { card ->
            Column(
                modifier = Modifier
                    .width(210.dp)
                    .spacePress(card.onClick),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(118.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF141416)),
                ) {
                    AsyncImage(
                        model = card.imageUrl,
                        contentDescription = card.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0.4f to Color.Transparent,
                                    1f to Color.Black.copy(alpha = 0.85f),
                                ),
                            ),
                    )
                    Text(
                        card.label,
                        color = Color.White.copy(alpha = 0.9f),
                        fontWeight = FontWeight.Medium,
                        fontSize = 11.sp,
                        maxLines = 1,
                        modifier = Modifier
                            .align(Alignment.TopStart)
                            .padding(8.dp)
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.Black.copy(alpha = 0.55f))
                            .padding(horizontal = 8.dp, vertical = 3.dp),
                    )
                    Text(
                        card.title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 10.dp, end = 10.dp, bottom = if (card.progress > 0f) 12.dp else 10.dp),
                    )
                    if (card.progress > 0f) {
                        Box(
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .fillMaxWidth()
                                .height(2.dp)
                                .background(Color.White.copy(alpha = 0.18f)),
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxHeight()
                                    .fillMaxWidth(card.progress.coerceIn(0f, 1f))
                                    .background(Color.White),
                            )
                        }
                    }
                }
            }
        }
    }
}

internal data class HomeAiringCard(
    val key: String,
    val title: String,
    val imageUrl: String?,
    val whenLabel: String,
    val episodeLabel: String,
    val onClick: () -> Unit,
)

@Composable
internal fun HomeAiringRow(cards: List<HomeAiringCard>) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(cards, key = { it.key }) { card ->
            Row(
                modifier = Modifier
                    .width(240.dp)
                    .height(72.dp)
                    .spacePress(card.onClick)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF0C0C10))
                    .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = card.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .width(52.dp)
                        .fillMaxHeight()
                        .background(Color(0xFF141416)),
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 10.dp),
                ) {
                    Text(
                        card.whenLabel,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        maxLines = 1,
                    )
                    Text(
                        card.title,
                        color = Color.White.copy(alpha = 0.9f),
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        card.episodeLabel,
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 11.sp,
                        maxLines = 1,
                    )
                }
            }
        }
    }
}

@Composable
internal fun HomeGenreRow(
    names: List<String>,
    onOpen: (String) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(names) { name ->
            Text(
                name,
                color = Color.White.copy(alpha = 0.85f),
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF0C0C10))
                    .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                    .spacePress { onOpen(name) }
                    .padding(horizontal = 14.dp, vertical = 8.dp),
            )
        }
    }
}
