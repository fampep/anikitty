// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.material.icons.rounded.Add
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.KeyboardArrowDown
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.rounded.KeyboardArrowUp
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.watchedAgo
import site.anikitty.app.ui.components.HeroBanner
import site.anikitty.app.ui.components.KittyImage
import site.anikitty.app.ui.components.sharedPoster
import site.anikitty.app.ui.components.KittyBadge
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
    val palette = LocalKittyPalette.current
    val ink = palette.text
    val pill = RoundedCornerShape(28.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 8.dp)
            .clip(pill)
            .background(palette.surface)
            .border(1.dp, palette.hairline, pill)
            .padding(start = 14.dp, top = 4.dp, end = 8.dp, bottom = 4.dp),
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
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
        if (LocalDemoMode.current) {
            KittyBadge(
                label = "Demo",
                onDark = LocalKittyPalette.current.dark,
                modifier = Modifier.padding(start = 8.dp),
            )
        }
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
    onWatch: (AnimeSummary) -> Unit,
    onAdd: (AnimeSummary) -> Unit,
    savedIds: Set<Int> = emptySet(),
    logos: Map<Int, String> = emptyMap(),
    inset: Boolean = true,
) {
    val pages = items.take(5)
    if (pages.isEmpty()) return
    val reducedMotion = prefersReducedMotion()
    val pagerState = rememberPagerState(pageCount = { pages.size })
    LaunchedEffect(pages.size, reducedMotion) {
        if (reducedMotion || pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(6500)
            if (pagerState.isScrollInProgress) continue
            pagerState.animateScrollToPage((pagerState.currentPage + 1) % pages.size)
        }
    }
    val cardShape = RoundedCornerShape(22.dp)
    Box(
        modifier = Modifier
            .padding(horizontal = if (inset) 16.dp else 0.dp)
            .fillMaxWidth()
            .height(376.dp)
            .clip(cardShape)
            .clipToBounds(),
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier.fillMaxSize(),
        ) { page ->
            val anime = pages[page]
            val saved = anime.id in savedIds
            Box(modifier = Modifier.fillMaxSize()) {
                HeroBanner(
                    anilistId = anime.id,
                    bannerUrl = anime.bannerImageUrl,
                    coverUrl = anime.coverImageUrl,
                    contentDescription = anime.title,
                    title = anime.title,
                    year = anime.seasonYear,
                    movie = anime.format.equals("MOVIE", true),
                    alignment = Alignment.TopCenter,
                    modifier = Modifier
                        .fillMaxSize()
                        .graphicsLayer {
                            val offset = (pagerState.currentPage - page) +
                                pagerState.currentPageOffsetFraction
                            translationX = if (reducedMotion) 0f else offset * -32f
                            alpha = if (reducedMotion) {
                                1f
                            } else {
                                1f - kotlin.math.abs(offset).coerceIn(0f, 1f) * 0.25f
                            }
                        },
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0f to Color.Black.copy(alpha = 0.15f),
                                0.28f to Color.Transparent,
                                0.55f to Color.Black.copy(alpha = 0.55f),
                                1f to Color.Black.copy(alpha = 0.92f),
                            ),
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 16.dp, end = 16.dp, bottom = 14.dp, top = 16.dp)
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
                                .height(64.dp)
                                .fillMaxWidth(0.78f),
                        )
                    } else {
                        Text(
                            anime.title,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 30.sp,
                            lineHeight = 34.sp,
                            letterSpacing = (-0.6).sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    HeroChips(anime)
                    val synopsis = anime.description?.trim().orEmpty()
                    if (synopsis.isNotEmpty()) {
                        Text(
                            synopsis,
                            color = Color.White.copy(alpha = 0.82f),
                            fontSize = 13.sp,
                            lineHeight = 18.sp,
                            maxLines = 3,
                            overflow = TextOverflow.Ellipsis,
                            modifier = Modifier.padding(top = 8.dp),
                        )
                    }
                    Row(
                        modifier = Modifier.padding(top = 12.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .background(Color.White)
                                .spacePress { onWatch(anime) }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Icon(
                                Icons.Rounded.PlayArrow,
                                contentDescription = null,
                                tint = Color.Black,
                                modifier = Modifier.size(18.dp),
                            )
                            Text(
                                "Watch Now",
                                color = Color.Black,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                modifier = Modifier.padding(start = 4.dp),
                            )
                        }
                        Text(
                            "Details",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 13.sp,
                            modifier = Modifier
                                .clip(RoundedCornerShape(20.dp))
                                .border(1.dp, Color.White.copy(alpha = 0.72f), RoundedCornerShape(20.dp))
                                .spacePress { onOpen(anime) }
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                        Box(
                            modifier = Modifier
                                .size(36.dp)
                                .clip(CircleShape)
                                .border(1.dp, Color.White.copy(alpha = 0.72f), CircleShape)
                                .spacePress { if (!saved) onAdd(anime) },
                            contentAlignment = Alignment.Center,
                        ) {
                            Icon(
                                if (saved) Icons.Rounded.Check else Icons.Rounded.Add,
                                contentDescription = if (saved) "On your list" else "Add to list",
                                tint = Color.White,
                                modifier = Modifier.size(18.dp),
                            )
                        }
                    }
                    if (pages.size > 1) {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(top = 12.dp),
                            horizontalArrangement = Arrangement.Center,
                        ) {
                            repeat(pages.size) { index ->
                                val selected = pagerState.currentPage == index
                                Box(
                                    modifier = Modifier
                                        .padding(horizontal = 3.dp)
                                        .size(if (selected) 7.dp else 5.dp)
                                        .clip(CircleShape)
                                        .background(
                                            if (selected) Color.White else Color.White.copy(alpha = 0.35f),
                                        ),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HeroChips(anime: AnimeSummary) {
    val chips = listOfNotNull(
        anime.episodes?.takeIf { it > 0 }?.let { "$it Episodes" },
        anime.seasonYear?.toString(),
        anime.genres.firstOrNull(),
    )
    if (chips.isEmpty()) return
    Row(
        modifier = Modifier.padding(top = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        chips.forEach { label ->
            Text(
                label,
                color = Color.White,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
                maxLines = 1,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.White.copy(alpha = 0.16f))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
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
    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
        val columns = when {
            maxWidth >= 1000.dp -> 6
            maxWidth >= 840.dp -> 5
            maxWidth >= 600.dp -> 4
            else -> 3
        }
        Column(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            items.chunked(columns).forEach { row ->
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    row.forEach { anime ->
                        HomePosterCell(
                            anime = anime,
                            onOpen = onOpen,
                            modifier = Modifier.weight(1f),
                        )
                    }
                    repeat(columns - row.size) {
                        Spacer(modifier = Modifier.weight(1f))
                    }
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
            alignment = Alignment.TopCenter,
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
                        color = palette.text,
                        fontWeight = FontWeight.Black,
                        fontSize = 48.sp,
                        letterSpacing = (-2.0).sp,
                        style = TextStyle(
                            shadow = Shadow(Color.Black.copy(alpha = 0.85f), Offset(0f, 2f), 10f),
                        ),
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

private val LiveGreen = Color(0xFF3DDC84)

@Composable
internal fun HomeLatestEpisodes(
    slots: List<AiringSlot>,
    onOpen: (AiringSlot) -> Unit,
    inset: Boolean = true,
) {
    if (slots.isEmpty()) return
    val palette = LocalKittyPalette.current
    val context = LocalContext.current
    val prefs = remember {
        context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
    }
    var audio by remember {
        mutableStateOf(prefs.getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub")
    }
    var page by rememberSaveable { mutableIntStateOf(0) }
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = if (inset) 16.dp else 0.dp)
            .padding(top = 22.dp),
    ) {
        val columns = when {
            maxWidth >= 900.dp -> 5
            maxWidth >= 680.dp -> 4
            else -> 3
        }
        val pageSize = columns * 2
        val paged = slots.take(pageSize * 4)
        val pageCount = ((paged.size + pageSize - 1) / pageSize).coerceAtLeast(1)
        val safePage = page.coerceIn(0, pageCount - 1)
        val shown = paged.drop(safePage * pageSize).take(pageSize)
        Column {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    "Latest Episodes",
                    color = palette.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f),
                )
                HomeAudioChip(label = "Sub", selected = audio == "sub") {
                    audio = "sub"
                    prefs.edit().putString("audio", "sub").apply()
                }
                Spacer(modifier = Modifier.width(6.dp))
                HomeAudioChip(label = "Dub", selected = audio == "dub") {
                    audio = "dub"
                    prefs.edit().putString("audio", "dub").apply()
                }
                if (pageCount > 1) {
                    Spacer(modifier = Modifier.width(4.dp))
                    HomePagerButton(
                        icon = Icons.AutoMirrored.Rounded.KeyboardArrowLeft,
                        description = "Previous page",
                        enabled = safePage > 0,
                        onClick = { page = safePage - 1 },
                    )
                    Text(
                        "${safePage + 1} / $pageCount",
                        color = palette.muted,
                        fontSize = 12.sp,
                        modifier = Modifier.padding(horizontal = 2.dp),
                    )
                    HomePagerButton(
                        icon = Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                        description = "Next page",
                        enabled = safePage < pageCount - 1,
                        onClick = { page = safePage + 1 },
                    )
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
                shown.chunked(columns).forEach { row ->
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        row.forEach { slot ->
                            HomeLatestCell(
                                slot = slot,
                                onOpen = onOpen,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        repeat(columns - row.size) {
                            Spacer(modifier = Modifier.weight(1f))
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeAudioChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val palette = LocalKittyPalette.current
    Text(
        label,
        color = if (selected) palette.page else palette.text,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(14.dp))
            .background(if (selected) palette.text else Color.Transparent)
            .border(1.dp, if (selected) palette.text else Hairline, RoundedCornerShape(14.dp))
            .spacePress(onClick)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun HomePagerButton(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    enabled: Boolean,
    onClick: () -> Unit,
) {
    val palette = LocalKittyPalette.current
    Box(
        modifier = Modifier
            .size(28.dp)
            .clip(CircleShape)
            .then(if (enabled) Modifier.spacePress(onClick) else Modifier),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = description,
            tint = if (enabled) palette.text else palette.faint,
            modifier = Modifier.size(20.dp),
        )
    }
}

@Composable
private fun HomeLatestCell(
    slot: AiringSlot,
    onOpen: (AiringSlot) -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = LocalKittyPalette.current
    val anime = slot.anime
    val ago = watchedAgo(slot.airingAtEpochSec * 1000L)
    Column(modifier = modifier.spacePress { onOpen(slot) }) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(12.dp)),
        ) {
            KittyImage(
                url = anime.coverImageUrl,
                contentDescription = anime.title,
                widthPx = 360,
                heightPx = 540,
                modifier = Modifier.fillMaxSize().sharedPoster(anime.id),
            )
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .align(Alignment.BottomCenter)
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.82f),
                        ),
                    )
                    .padding(horizontal = 6.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(
                    "EP ${slot.episode}",
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 11.sp,
                    maxLines = 1,
                )
                if (ago.isNotBlank()) {
                    Text(
                        ago,
                        color = Color.White.copy(alpha = 0.85f),
                        fontSize = 10.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .padding(start = 4.dp)
                            .weight(1f),
                        textAlign = androidx.compose.ui.text.style.TextAlign.End,
                    )
                }
            }
        }
        val meta = listOfNotNull(
            anime.episodes?.takeIf { it > 0 }?.toString(),
            anime.format?.takeIf { it.isNotBlank() }?.let(::homeFormatShort),
            anime.seasonYear?.toString(),
        ).joinToString("  ")
        if (meta.isNotEmpty()) {
            Text(
                meta,
                color = palette.muted,
                fontSize = 10.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(top = 6.dp),
            )
        }
        Text(
            anime.title,
            color = palette.text,
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            lineHeight = 15.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(top = 2.dp),
        )
    }
}

internal data class HomeRailEntry(
    val id: Int,
    val title: String,
    val imageUrl: String?,
    val meta: String,
    val live: Boolean,
    val onClick: () -> Unit,
)

@Composable
internal fun HomeRail(
    title: String,
    entries: List<HomeRailEntry>,
    inset: Boolean = true,
) {
    if (entries.isEmpty()) return
    val palette = LocalKittyPalette.current
    var expanded by rememberSaveable(title) { mutableStateOf(true) }
    val shape = RoundedCornerShape(18.dp)
    Column(
        modifier = Modifier
            .padding(horizontal = if (inset) 16.dp else 0.dp)
            .padding(top = if (inset) 18.dp else 0.dp)
            .fillMaxWidth()
            .clip(shape)
            .background(palette.surface)
            .border(1.dp, palette.hairline, shape)
            .padding(horizontal = 12.dp, vertical = 10.dp),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .spacePress { expanded = !expanded },
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Text(
                title.uppercase(),
                color = palette.muted,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 0.6.sp,
                modifier = Modifier.weight(1f),
            )
            Icon(
                if (expanded) Icons.Rounded.KeyboardArrowUp else Icons.Rounded.KeyboardArrowDown,
                contentDescription = if (expanded) "Collapse $title" else "Expand $title",
                tint = palette.muted,
                modifier = Modifier.size(20.dp),
            )
        }
        if (expanded) {
            Spacer(modifier = Modifier.height(8.dp))
            entries.take(6).forEach { entry ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 5.dp)
                        .spacePress(entry.onClick),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    KittyImage(
                        url = entry.imageUrl,
                        contentDescription = null,
                        widthPx = 120,
                        heightPx = 168,
                        modifier = Modifier
                            .width(42.dp)
                            .height(58.dp)
                            .clip(RoundedCornerShape(8.dp)),
                    )
                    Column(
                        modifier = Modifier
                            .weight(1f)
                            .padding(start = 10.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            if (entry.live) {
                                Box(
                                    modifier = Modifier
                                        .padding(end = 6.dp)
                                        .size(7.dp)
                                        .clip(CircleShape)
                                        .background(LiveGreen),
                                )
                            }
                            Text(
                                entry.title,
                                color = palette.text,
                                fontWeight = FontWeight.Medium,
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.weight(1f),
                            )
                        }
                        if (entry.meta.isNotEmpty()) {
                            Text(
                                entry.meta,
                                color = palette.muted,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
internal fun HomeMiruroStage(
    hero: List<AnimeSummary>,
    showHero: Boolean,
    latest: List<AiringSlot>,
    showLatest: Boolean,
    airing: List<HomeRailEntry>,
    showAiring: Boolean,
    upcoming: List<HomeRailEntry>,
    showUpcoming: Boolean,
    logos: Map<Int, String>,
    savedIds: Set<Int>,
    onOpen: (AnimeSummary) -> Unit,
    onWatch: (AnimeSummary) -> Unit,
    onAdd: (AnimeSummary) -> Unit,
    onLatest: (AiringSlot) -> Unit,
) {
    val showLeft = (showHero && hero.isNotEmpty()) || (showLatest && latest.isNotEmpty())
    val showRight = (showAiring && airing.isNotEmpty()) || (showUpcoming && upcoming.isNotEmpty())
    if (!showLeft && !showRight) return
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp)
            .padding(top = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (showLeft) {
            Column(modifier = Modifier.weight(1f)) {
                if (showHero && hero.isNotEmpty()) {
                    HomeFeatured(
                        items = hero,
                        onOpen = onOpen,
                        onWatch = onWatch,
                        onAdd = onAdd,
                        savedIds = savedIds,
                        logos = logos,
                        inset = false,
                    )
                }
                if (showLatest && latest.isNotEmpty()) {
                    HomeLatestEpisodes(slots = latest, onOpen = onLatest, inset = false)
                }
            }
        }
        if (showRight) {
            Column(
                modifier = if (showLeft) Modifier.width(300.dp) else Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (showAiring) {
                    HomeRail(title = "Top airing", entries = airing, inset = false)
                }
                if (showUpcoming) {
                    HomeRail(title = "Upcoming", entries = upcoming, inset = false)
                }
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

private fun homeFormatShort(fmt: String) = when (fmt.uppercase()) {
    "TV_SHORT" -> "TV SHORT"
    else -> fmt.uppercase()
}

internal fun homeRailMeta(anime: AnimeSummary, extra: String? = null): String = listOfNotNull(
    anime.format?.takeIf { it.isNotBlank() }?.let(::homeFormatShort),
    extra?.takeIf { it.isNotBlank() } ?: anime.seasonYear?.toString(),
    anime.episodes?.takeIf { it > 0 }?.let { "$it eps" },
    anime.scoreLabel(),
).joinToString("  ·  ")
