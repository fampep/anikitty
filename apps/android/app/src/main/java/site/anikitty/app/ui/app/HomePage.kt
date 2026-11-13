// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.rememberScrollState
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import site.anikitty.app.data.anilist.AnimeSummary
import java.util.Locale

private val Hairline = Color.White.copy(alpha = 0.12f)
private val ChipShape = RoundedCornerShape(4.dp)

@Composable
internal fun HomeBar(
    onRefresh: () -> Unit,
    refreshBusy: Boolean,
    onOpenSearch: () -> Unit,
    onOpenAccount: () -> Unit,
    avatarUrl: String?,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "anikitty.",
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 18.sp,
            letterSpacing = (-0.4).sp,
        )
        Spacer(modifier = Modifier.width(12.dp))
        Row(
            modifier = Modifier
                .weight(1f)
                .height(34.dp)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White.copy(alpha = 0.06f))
                .border(1.dp, Hairline, RoundedCornerShape(8.dp))
                .spacePress(onOpenSearch)
                .padding(horizontal = 10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Icon(
                Icons.Filled.Search,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.45f),
                modifier = Modifier.height(16.dp).width(16.dp),
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                "Search",
                color = Color.White.copy(alpha = 0.4f),
                fontSize = 13.sp,
                maxLines = 1,
            )
        }
        Spacer(modifier = Modifier.width(10.dp))
        Box(
            modifier = Modifier
                .height(34.dp)
                .width(34.dp)
                .clip(CircleShape)
                .background(Color.White.copy(alpha = 0.06f))
                .border(1.dp, Hairline, CircleShape)
                .spacePress(onRefresh),
            contentAlignment = Alignment.Center,
        ) {
            if (refreshBusy) {
                CircularProgressIndicator(
                    modifier = Modifier.height(16.dp).width(16.dp),
                    strokeWidth = 2.dp,
                    color = Color.White,
                )
            } else {
                Icon(
                    Icons.Rounded.Refresh,
                    contentDescription = "Refresh",
                    tint = Color.White,
                    modifier = Modifier.height(16.dp).width(16.dp),
                )
            }
        }
        Spacer(modifier = Modifier.width(8.dp))
        ProfileMark(
            imageUrl = avatarUrl,
            size = 34.dp,
            modifier = Modifier.spacePress(onOpenAccount),
        )
    }
}

@Composable
internal fun HomeFeatured(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    val pages = items.take(8)
    if (pages.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { pages.size })
    LaunchedEffect(pages.size) {
        if (pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(7000)
            if (!pagerState.isScrollInProgress) {
                pagerState.animateScrollToPage((pagerState.currentPage + 1) % pages.size)
            }
        }
    }
    Column {
        Box(modifier = Modifier.fillMaxWidth().height(292.dp)) {
            HorizontalPager(state = pagerState, modifier = Modifier.fillMaxSize()) { page ->
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
                                Brush.horizontalGradient(
                                    0f to Color.Black.copy(alpha = 0.88f),
                                    0.55f to Color.Black.copy(alpha = 0.45f),
                                    1f to Color.Black.copy(alpha = 0.15f),
                                ),
                            ),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.25f),
                                    0.7f to Color.Transparent,
                                    1f to Color.Black,
                                ),
                            ),
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(start = 16.dp, end = 72.dp, bottom = 16.dp)
                            .fillMaxWidth(),
                    ) {
                        Text(
                            anime.title,
                            color = Color.White,
                            fontWeight = FontWeight.Bold,
                            fontSize = 26.sp,
                            lineHeight = 30.sp,
                            letterSpacing = (-0.4).sp,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                        val alt = anime.romajiTitle ?: anime.nativeTitle
                        if (!alt.isNullOrBlank()) {
                            Text(
                                alt.uppercase(Locale.getDefault()),
                                color = Color.White.copy(alpha = 0.55f),
                                fontWeight = FontWeight.Medium,
                                fontSize = 11.sp,
                                letterSpacing = 0.8.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                        }
                        val blurb = anime.description?.trim().orEmpty()
                        if (blurb.isNotEmpty()) {
                            Text(
                                blurb,
                                color = Color.White.copy(alpha = 0.78f),
                                fontSize = 12.sp,
                                lineHeight = 16.sp,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                        }
                        Spacer(modifier = Modifier.height(10.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            anime.episodes?.takeIf { it > 0 }?.let { BannerStat("$it episodes") }
                            anime.averageScore?.let { BannerStat("$it / 100") }
                            anime.popularity?.takeIf { it > 0 }?.let {
                                BannerStat(String.format(Locale.US, "%,d", it))
                            }
                            anime.format?.takeIf { it.isNotBlank() }?.let { BannerStat(homeFormat(it)) }
                        }
                    }
                }
            }
            if (pages.size > 1) {
                Text(
                    "${pagerState.currentPage + 1} of ${pages.size}",
                    color = Color.White.copy(alpha = 0.7f),
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(top = 10.dp, end = 14.dp),
                )
            }
        }
        HomePosterGrid(items = items.take(12), onOpen = onOpen)
    }
}

@Composable
private fun BannerStat(label: String) {
    Text(
        label,
        color = Color.White.copy(alpha = 0.85f),
        fontSize = 11.sp,
        fontWeight = FontWeight.Medium,
        maxLines = 1,
        modifier = Modifier
            .clip(ChipShape)
            .border(1.dp, Hairline, ChipShape)
            .padding(horizontal = 6.dp, vertical = 3.dp),
    )
}

@Composable
internal fun HomeBlock(
    title: String,
    subtitle: String? = null,
    onMore: (() -> Unit)? = null,
    content: @Composable () -> Unit,
) {
    Column(modifier = Modifier.padding(top = 22.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                )
                if (!subtitle.isNullOrBlank()) {
                    Text(
                        subtitle,
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 12.sp,
                        modifier = Modifier.padding(top = 2.dp),
                    )
                }
            }
            if (onMore != null) {
                Text(
                    "See all",
                    color = Color.White.copy(alpha = 0.7f),
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
        modifier = Modifier.padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
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
                modifier = Modifier.width(108.dp),
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
    Column(modifier = modifier.spacePress { onOpen(anime) }) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(3.dp))
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
        Row(
            modifier = Modifier.padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val aired = anime.airedLabel()
            if (!aired.isNullOrBlank()) {
                Text(
                    aired,
                    color = Color.White.copy(alpha = 0.4f),
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
            }
            anime.format?.takeIf { it.isNotBlank() }?.let { format ->
                if (!aired.isNullOrBlank()) Spacer(modifier = Modifier.width(6.dp))
                Text(
                    homeFormat(format),
                    color = Color.White.copy(alpha = 0.55f),
                    fontSize = 11.sp,
                    maxLines = 1,
                )
            }
            if (anime.status.equals("RELEASING", true)) {
                Spacer(modifier = Modifier.width(5.dp))
                Box(
                    modifier = Modifier
                        .height(6.dp)
                        .width(6.dp)
                        .clip(CircleShape)
                        .background(Color.White),
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
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        items(cards, key = { it.id }) { card ->
            Column(
                modifier = Modifier
                    .width(168.dp)
                    .spacePress(card.onClick),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(94.dp)
                        .clip(RoundedCornerShape(3.dp))
                        .background(Color(0xFF141416)),
                ) {
                    AsyncImage(
                        model = card.imageUrl,
                        contentDescription = card.title,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize(),
                    )
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
                Text(
                    card.title,
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.padding(top = 6.dp),
                )
                Text(
                    card.label,
                    color = Color.White.copy(alpha = 0.45f),
                    fontSize = 11.sp,
                    maxLines = 1,
                    modifier = Modifier.padding(top = 2.dp),
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
    LazyRow(
        contentPadding = PaddingValues(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        items(cards, key = { it.key }) { card ->
            Row(
                modifier = Modifier
                    .width(240.dp)
                    .height(64.dp)
                    .spacePress(card.onClick)
                    .border(1.dp, Hairline, RoundedCornerShape(4.dp))
                    .clip(RoundedCornerShape(4.dp))
                    .background(Color(0xFF0A0A0A)),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                AsyncImage(
                    model = card.imageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .width(48.dp)
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
                        color = Color.White.copy(alpha = 0.45f),
                        fontSize = 11.sp,
                        maxLines = 1,
                    )
                    Text(
                        card.title,
                        color = Color.White,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        card.episodeLabel,
                        color = Color.White.copy(alpha = 0.55f),
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
                    .border(1.dp, Hairline, ChipShape)
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
