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
import androidx.compose.material.icons.outlined.Shuffle
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.runtime.snapshotFlow
import androidx.compose.ui.input.pointer.pointerInput
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
import site.anikitty.app.ui.components.HeroBanner
import site.anikitty.app.ui.components.KittyImage
import site.anikitty.app.ui.components.sharedPoster
import site.anikitty.app.ui.components.KittyBadge
import site.anikitty.app.ui.components.KittyMenuEntry
import site.anikitty.app.ui.components.KittyOverflow
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.theme.KittyRadius
import site.anikitty.app.ui.theme.KittySpace
import site.anikitty.app.ui.theme.LocalDemoMode
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
    onShuffle: (() -> Unit)? = null,
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
            fontWeight = FontWeight.Bold,
            fontSize = 22.sp,
            letterSpacing = (-0.6).sp,
        )
        if (LocalDemoMode.current) {
            KittyBadge(
                label = "Demo",
                onDark = LocalKittyPalette.current.dark,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
        Spacer(modifier = Modifier.weight(1f))
        HomeBarIcon(onClick = onOpenSearch) {
            Icon(
                Icons.Filled.Search,
                contentDescription = "Search",
                tint = ink,
                modifier = Modifier.height(20.dp).width(20.dp),
            )
        }
        if (onShuffle != null) {
            HomeBarIcon(onClick = onShuffle) {
                Icon(
                    Icons.Outlined.Shuffle,
                    contentDescription = "Random anime",
                    tint = ink,
                    modifier = Modifier.height(20.dp).width(20.dp),
                )
            }
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
                    modifier = Modifier.height(20.dp).width(20.dp),
                )
            }
        }
        ProfileMark(
            imageUrl = avatarUrl,
            size = 32.dp,
            modifier = Modifier.padding(start = 4.dp).spacePress(onOpenAccount),
        )
        KittyOverflow(
            contentDescription = "More",
            tint = ink,
            modifier = Modifier.padding(start = 4.dp),
            entries = listOf(
                KittyMenuEntry("Search", onOpenSearch),
                KittyMenuEntry("Refresh", onRefresh),
                KittyMenuEntry("Settings", onOpenAccount),
            ),
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
    logos: Map<Int, String> = emptyMap(),
) {
    val pages = items.take(5)
    if (pages.isEmpty()) return
    val reducedMotion = prefersReducedMotion()
    val pagerState = rememberPagerState(pageCount = { pages.size })
    var holding by remember { mutableStateOf(false) }
    LaunchedEffect(pagerState) {
        snapshotFlow { pagerState.isScrollInProgress }.collect { scrolling ->
            if (scrolling) holding = true
        }
    }
    LaunchedEffect(pages.size, reducedMotion) {
        if (reducedMotion || pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(6500)
            if (holding || pagerState.isScrollInProgress) {
                holding = false
                continue
            }
            pagerState.animateScrollToPage((pagerState.currentPage + 1) % pages.size)
        }
    }
    Column {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(292.dp)
                .clip(RoundedCornerShape(bottomStart = 12.dp, bottomEnd = 12.dp))
                .clipToBounds(),
        ) {
            HorizontalPager(
                state = pagerState,
                modifier = Modifier
                    .fillMaxSize()
                    .pointerInput(Unit) {
                        awaitEachGesture {
                            awaitFirstDown(requireUnconsumed = false)
                            holding = true
                        }
                    },
            ) { page ->
                val anime = pages[page]
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .spacePress { onOpen(anime) },
                ) {
                    HeroBanner(
                        anilistId = anime.id,
                        bannerUrl = anime.bannerImageUrl,
                        coverUrl = anime.coverImageUrl,
                        contentDescription = anime.title,
                        title = anime.title,
                        year = anime.seasonYear,
                        movie = anime.format.equals("MOVIE", true),
                        modifier = Modifier
                            .fillMaxSize()
                            .graphicsLayer {
                                val offset = (pagerState.currentPage - page) +
                                    pagerState.currentPageOffsetFraction
                                translationX = if (reducedMotion) 0f else offset * -32f
                                alpha = if (reducedMotion) {
                                    1f
                                } else {
                                    1f - kotlin.math.abs(offset).coerceIn(0f, 1f) * 0.4f
                                }
                                scaleX = 1.12f
                                scaleY = 1.12f
                            },
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.22f),
                                    0.35f to Color.Transparent,
                                    0.65f to Color.Black.copy(alpha = 0.55f),
                                    1f to Color.Black.copy(alpha = 0.92f),
                                ),
                            ),
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = 18.dp, vertical = 16.dp)
                            .fillMaxWidth(),
                    ) {
                        val logo = logos[anime.id]
                        if (logo != null) {
                            AsyncImage(
                                model = logo,
                                contentDescription = anime.title,
                                contentScale = ContentScale.Fit,
                                alignment = Alignment.CenterStart,
                                modifier = Modifier
                                    .height(52.dp)
                                    .fillMaxWidth(0.72f),
                            )
                        } else {
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
                        }
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
                            .padding(horizontal = 4.dp)
                            .height(4.dp)
                            .width(if (selected) 22.dp else 5.dp)
                            .clip(CircleShape)
                            .background(if (selected) Color.White else Color.White.copy(alpha = 0.32f)),
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
    Column(modifier = Modifier.padding(top = KittySpace.lg)) {
        KittySectionHeading(title = title, subtitle = subtitle, onMore = onMore)
        Spacer(modifier = Modifier.height(KittySpace.sm))
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
    captions: Map<Int, String> = emptyMap(),
) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(items, key = { it.id }, contentType = { "poster" }) { anime ->
            HomePosterCell(
                anime = anime,
                onOpen = onOpen,
                caption = captions[anime.id],
                modifier = Modifier.width(112.dp),
            )
        }
    }
}

@Composable
private fun HomePosterCell(
    anime: AnimeSummary,
    onOpen: (AnimeSummary) -> Unit,
    modifier: Modifier = Modifier,
    caption: String? = null,
) {
    val palette = LocalKittyPalette.current
    Column(modifier = modifier.spacePress { onOpen(anime) }) {
        KittyImage(
            url = anime.coverImageUrl,
            contentDescription = anime.title,
            widthPx = 360,
            heightPx = 540,
            modifier = Modifier
                .sharedPoster(anime.id)
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(10.dp)),
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
        val meta = caption ?: listOfNotNull(
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
    val palette = LocalKittyPalette.current
    LazyRow(
        contentPadding = PaddingValues(horizontal = KittySpace.md),
        horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
    ) {
        items(cards, key = { it.id }, contentType = { "still" }) { card ->
            Column(
                modifier = Modifier
                    .width(248.dp)
                    .spacePress(card.onClick),
            ) {
                ContinueArt(card)
                Text(
                    card.label,
                    color = palette.muted,
                    fontSize = 12.sp,
                    lineHeight = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = KittySpace.sm),
                )
            }
        }
    }
}

@Composable
private fun ContinueArt(card: HomeContinueCard) {
    val shape = RoundedCornerShape(KittyRadius.md)
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .aspectRatio(16f / 9f)
            .clip(shape)
            .background(Color(0xFF141416)),
    ) {
        KittyImage(
            url = card.imageUrl,
            contentDescription = card.title,
            widthPx = 640,
            heightPx = 360,
            modifier = Modifier.fillMaxSize().sharedPoster(card.id),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0.45f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.78f),
                    ),
                ),
        )
        Text(
            card.title,
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 10.dp, vertical = 10.dp),
        )
        if (card.progress > 0f) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(Color.White.copy(alpha = 0.18f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(card.progress.coerceIn(0f, 1f))
                        .clip(RoundedCornerShape(topEnd = 2.dp, bottomEnd = 2.dp))
                        .background(Color(0xFFDDDDDD)),
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
                    .height(72.dp)
                    .spacePress(card.onClick)
                    .clip(RoundedCornerShape(10.dp))
                    .background(Color(0xFF0F0F13)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                KittyImage(
                    url = card.imageUrl,
                    contentDescription = null,
                    widthPx = 140,
                    heightPx = 200,
                    modifier = Modifier
                        .width(54.dp)
                        .fillMaxHeight(),
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
        items(names, key = { it }, contentType = { "genre" }) { name ->
            Text(
                name,
                color = Color.White.copy(alpha = 0.85f),
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .border(1.dp, Hairline, RoundedCornerShape(16.dp))
                    .spacePress { onOpen(name) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
internal fun HomeRankRow(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    val shown = items.take(10)
    if (shown.isEmpty()) return
    val palette = LocalKittyPalette.current
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        items(shown.size, key = { shown[it].id }, contentType = { "rank" }) { index ->
            val anime = shown[index]
            Column(
                modifier = Modifier
                    .width(112.dp)
                    .spacePress { onOpen(anime) },
            ) {
                Box(modifier = Modifier.fillMaxWidth()) {
                    KittyImage(
                        url = anime.coverImageUrl,
                        contentDescription = anime.title,
                        widthPx = 320,
                        heightPx = 480,
                        modifier = Modifier
                            .padding(start = 20.dp)
                            .sharedPoster(anime.id)
                            .fillMaxWidth()
                            .aspectRatio(2f / 3f)
                            .clip(RoundedCornerShape(8.dp)),
                    )
                    Text(
                        "${index + 1}",
                        color = palette.text.copy(alpha = 0.28f),
                        fontWeight = FontWeight.Black,
                        fontSize = 48.sp,
                        letterSpacing = (-2.0).sp,
                        modifier = Modifier.align(Alignment.BottomStart),
                    )
                }
                Text(
                    anime.title,
                    color = palette.text,
                    fontWeight = FontWeight.Medium,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(start = 20.dp, top = 6.dp),
                )
            }
        }
    }
}

/** Home shelves copied from the kotoplay chip bar, using the AniList fields we already have. */
internal enum class HomeShelf(val label: String) {
    All("All"),
    Movies("Movies"),
    Airing("Ongoing"),
    Finished("Finished"),
}

internal enum class HomeTopWindow(val label: String) {
    Season("This season"),
    Trending("Trending"),
}

internal fun AnimeSummary.onShelf(shelf: HomeShelf): Boolean = when (shelf) {
    HomeShelf.All -> true
    HomeShelf.Movies -> format.equals("MOVIE", ignoreCase = true)
    HomeShelf.Airing -> status.equals("RELEASING", ignoreCase = true)
    HomeShelf.Finished -> status.equals("FINISHED", ignoreCase = true)
}

@Composable
internal fun HomeShelfChips(
    selected: HomeShelf,
    onSelect: (HomeShelf) -> Unit,
) {
    val palette = LocalKittyPalette.current
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(HomeShelf.entries, key = { it.name }, contentType = { "shelf" }) { shelf ->
            val on = shelf == selected
            Text(
                shelf.label,
                color = if (on) palette.page else palette.text,
                fontWeight = FontWeight.Medium,
                fontSize = 13.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(16.dp))
                    .background(if (on) palette.text else Color.Transparent)
                    .border(1.dp, if (on) palette.text else Hairline, RoundedCornerShape(16.dp))
                    .spacePress { onSelect(shelf) }
                    .padding(horizontal = 14.dp, vertical = 9.dp),
            )
        }
    }
}

@Composable
internal fun HomeTopWindowChips(
    selected: HomeTopWindow,
    onSelect: (HomeTopWindow) -> Unit,
) {
    val palette = LocalKittyPalette.current
    Row(
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        HomeTopWindow.entries.forEach { window ->
            val on = window == selected
            Text(
                window.label,
                color = if (on) palette.text else palette.muted,
                fontWeight = if (on) FontWeight.SemiBold else FontWeight.Medium,
                fontSize = 12.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .spacePress { onSelect(window) }
                    .padding(horizontal = 2.dp, vertical = 4.dp),
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
