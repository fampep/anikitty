// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

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
import androidx.compose.foundation.layout.size
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
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.prefersReducedMotion

private val Hairline = Color.White.copy(alpha = 0.14f)

@Composable
internal fun HomeBar(
    onRefresh: () -> Unit,
    refreshBusy: Boolean,
    onOpenSearch: () -> Unit,
    onOpenAccount: () -> Unit,
    avatarUrl: String?,
) {
    val ink = LocalKittyPalette.current.text
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(start = 16.dp, end = 12.dp, top = 6.dp, bottom = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        site.anikitty.app.ui.components.KittyFace(
            modifier = Modifier
                .padding(end = 8.dp)
                .size(28.dp),
        )
        Text(
            "anikitty.",
            color = ink,
            fontWeight = FontWeight.SemiBold,
            fontSize = 20.sp,
            letterSpacing = (-0.5).sp,
            modifier = Modifier.weight(1f),
        )
        HomeBarIcon(onClick = onOpenSearch) {
            Icon(
                Icons.Filled.Search,
                contentDescription = "Search",
                tint = ink,
                modifier = Modifier.height(18.dp).width(18.dp),
            )
        }
        HomeBarIcon(onClick = onRefresh) {
            if (refreshBusy) {
                site.anikitty.app.ui.components.KittyFace(
                    modifier = Modifier.size(18.dp),
                    waving = true,
                    contentDescription = "Refreshing",
                )
            } else {
                Icon(
                    Icons.Rounded.Refresh,
                    contentDescription = "Refresh",
                    tint = ink,
                    modifier = Modifier.height(18.dp).width(18.dp),
                )
            }
        }
        ProfileMark(
            imageUrl = avatarUrl,
            size = 32.dp,
            modifier = Modifier.padding(start = 4.dp).spacePress(onOpenAccount),
        )
    }
}

@Composable
private fun HomeBarIcon(
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .height(36.dp)
            .width(36.dp)
            .spacePress(onClick),
        contentAlignment = Alignment.Center,
    ) {
        content()
    }
}

@Composable
internal fun HomeFeatured(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    val pages = items.take(5)
    if (pages.isEmpty()) return
    val reducedMotion = prefersReducedMotion()
    val pagerState = rememberPagerState(pageCount = { pages.size })
    LaunchedEffect(pages.size, reducedMotion) {
        if (reducedMotion || pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(6500)
            if (!pagerState.isScrollInProgress) {
                pagerState.animateScrollToPage((pagerState.currentPage + 1) % pages.size)
            }
        }
    }
    Column {
        Box(
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .fillMaxWidth()
                .height(210.dp)
                .clip(RoundedCornerShape(8.dp)),
        ) {
            HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
                val anime = pages[page]
                val drift = if (reducedMotion) {
                    0f
                } else {
                    ((pagerState.currentPage - page) + pagerState.currentPageOffsetFraction) * -32f
                }
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .spacePress { onOpen(anime) },
                ) {
                    AsyncImage(
                        model = anime.bannerImageUrl ?: anime.coverImageUrl,
                        contentDescription = anime.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                translationX = drift
                                scaleX = 1.12f
                                scaleY = 1.12f
                            },
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.15f),
                                    0.42f to Color.Transparent,
                                    1f to Color.Black.copy(alpha = 0.88f),
                                ),
                            ),
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = 14.dp, vertical = 12.dp)
                            .fillMaxWidth(),
                    ) {
                        Text(
                            anime.title,
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 22.sp,
                            lineHeight = 26.sp,
                            letterSpacing = (-0.4).sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                        val meta = listOfNotNull(
                            anime.format?.takeIf { it.isNotBlank() }?.let(::homeFormat),
                            anime.airedLabel(),
                            anime.episodes?.takeIf { it > 0 }?.let { "$it eps" },
                            anime.scoreLabel(),
                        )
                        if (meta.isNotEmpty()) {
                            Text(
                                meta.joinToString("  ·  "),
                                color = Color.White.copy(alpha = 0.75f),
                                fontSize = 12.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 3.dp),
                            )
                        }
                    }
                }
            }
        }
        if (pages.size > 1) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(top = 8.dp),
                horizontalArrangement = Arrangement.Center,
            ) {
                repeat(pages.size) { index ->
                    val selected = pagerState.currentPage == index
                    Box(
                        modifier = Modifier
                            .padding(horizontal = 3.dp)
                            .height(4.dp)
                            .width(if (selected) 14.dp else 4.dp)
                            .clip(CircleShape)
                            .background(if (selected) Color.White else Color.White.copy(alpha = 0.28f)),
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
    val palette = LocalKittyPalette.current
    Column(modifier = Modifier.padding(top = 26.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = palette.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    letterSpacing = (-0.2).sp,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        subtitle,
                        color = palette.muted,
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 1.dp),
                    )
                }
            }
            if (onMore != null) {
                Text(
                    "See all",
                    color = Color.White.copy(alpha = 0.55f),
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    modifier = Modifier.spacePress(onMore),
                )
            }
        }
        Spacer(modifier = Modifier.height(10.dp))
        content()
    }
}

@Composable
internal fun HomePosterGrid(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    if (items.isEmpty()) return
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        items.chunked(3).forEach { row ->
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                row.forEach { anime ->
                    HomePosterCell(
                        anime = anime,
                        onOpen = onOpen,
                        modifier = Modifier.weight(1f),
                    )
                }
                repeat(3 - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
internal fun HomePosterRow(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(items, key = { it.id }) { anime ->
            HomePosterCell(
                anime = anime,
                onOpen = onOpen,
                modifier = Modifier.width(104.dp),
            )
        }
    }
}

@Composable
private fun HomePosterCell(
    anime: AnimeSummary,
    onOpen: (AnimeSummary) -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = LocalKittyPalette.current
    Column(modifier = modifier.spacePress { onOpen(anime) }) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(4.dp))
                .background(palette.surface),
        )
        Text(
            anime.title,
            color = palette.text,
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            lineHeight = 15.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 6.dp),
        )
        val meta = listOfNotNull(
            anime.airedLabel(),
            anime.format?.takeIf { it.isNotBlank() }?.let(::homeFormat),
        ).joinToString(" · ")
        if (meta.isNotEmpty() || anime.status.equals("RELEASING", true)) {
            Row(
                modifier = Modifier.padding(top = 2.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (meta.isNotEmpty()) {
                    Text(
                        meta,
                        color = palette.muted,
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.weight(1f, fill = false),
                    )
                }
                if (anime.status.equals("RELEASING", true)) {
                    Spacer(modifier = Modifier.width(4.dp))
                    Box(
                        modifier = Modifier
                            .height(5.dp)
                            .width(5.dp)
                            .clip(CircleShape)
                            .background(palette.text),
                    )
                }
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
    if (cards.isEmpty()) return
    val lead = cards.first()
    val rest = cards.drop(1)
    val palette = LocalKittyPalette.current
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Column(
            modifier = Modifier
                .padding(horizontal = 16.dp)
                .fillMaxWidth()
                .spacePress(lead.onClick),
        ) {
            Text(
                "Continue where you left off",
                color = palette.muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.Medium,
                modifier = Modifier.padding(bottom = 8.dp),
            )
            ContinueArt(lead, height = 180.dp, radius = 12.dp, titleSize = 18.sp)
        }
        if (rest.isNotEmpty()) {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 16.dp),
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(rest, key = { it.id }) { card ->
                    Column(
                        modifier = Modifier
                            .width(196.dp)
                            .spacePress(card.onClick),
                    ) {
                        ContinueArt(card, height = 110.dp, radius = 6.dp, titleSize = 13.sp)
                        Text(
                            card.label,
                            color = palette.muted,
                            fontSize = 12.sp,
                            maxLines = 1,
                            modifier = Modifier.padding(top = 6.dp, start = 2.dp),
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ContinueArt(
    card: HomeContinueCard,
    height: androidx.compose.ui.unit.Dp,
    radius: androidx.compose.ui.unit.Dp,
    titleSize: androidx.compose.ui.unit.TextUnit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(height)
            .clip(RoundedCornerShape(radius))
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
                        1f to Color.Black.copy(alpha = 0.82f),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 12.dp, vertical = 10.dp),
        ) {
            Text(
                card.title,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = titleSize,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (height > 140.dp) {
                Text(
                    card.label,
                    color = Color.White.copy(alpha = 0.8f),
                    fontSize = 12.sp,
                    maxLines = 1,
                    modifier = Modifier.padding(top = 2.dp),
                )
            }
        }
        if (card.progress > 0f) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(2.dp)
                    .background(Color.White.copy(alpha = 0.2f)),
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
    Column(
        modifier = Modifier.padding(horizontal = 16.dp),
        verticalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        cards.forEach { card ->
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(64.dp)
                    .spacePress(card.onClick)
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0xFF0C0C10)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = card.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .width(46.dp)
                        .fillMaxHeight()
                        .background(Color(0xFF141416)),
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 12.dp),
                ) {
                    Text(
                        card.title,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        "${card.whenLabel}  ·  ${card.episodeLabel}",
                        color = Color.White.copy(alpha = 0.45f),
                        fontSize = 12.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 2.dp),
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
        contentPadding = PaddingValues(horizontal = 16.dp),
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
                    .border(1.dp, Hairline, RoundedCornerShape(16.dp))
                    .spacePress { onOpen(name) }
                    .padding(horizontal = 12.dp, vertical = 7.dp),
            )
        }
    }
}

private fun homeFormat(fmt: String) = when (fmt.uppercase()) {
    "TV_SHORT" -> "TV Short"
    "MOVIE" -> "Movie"
    "SPECIAL" -> "Special"
    else -> fmt
}
