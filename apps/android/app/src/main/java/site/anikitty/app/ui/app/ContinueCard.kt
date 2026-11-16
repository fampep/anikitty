// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.foundation.ExperimentalFoundationApi
import androidx.compose.foundation.background
import androidx.compose.foundation.combinedClickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.anikitty.app.data.local.ContinueHidden
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.continueCue
import site.anikitty.app.data.local.continueQueue
import site.anikitty.app.data.tmdb.EpisodeFrame
import site.anikitty.app.data.tmdb.TmdbCatalog
import site.anikitty.app.data.tmdb.transparentLogo
import site.anikitty.app.ui.components.KittyImage
import site.anikitty.app.ui.components.KittyMenu
import site.anikitty.app.ui.components.KittyMenuEntry
import site.anikitty.app.ui.theme.KittyRadius
import site.anikitty.app.ui.theme.KittySpace
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.ShimmerBox

private val ContinueCardWidth = 248.dp

@Composable
fun ContinueWatchRow(
    entries: List<WatchHistoryEntity>,
    onOpen: (WatchHistoryEntity, Int) -> Unit,
    onRemove: (WatchHistoryEntity) -> Unit,
    onMarkWatched: (WatchHistoryEntity, Int) -> Unit,
    onOpenTitle: (WatchHistoryEntity) -> Unit = { entry -> onOpen(entry, entry.episode) },
    releasedEpisodes: Map<Int, Int> = emptyMap(),
) {
    if (entries.isEmpty()) return
    LazyRow(
        contentPadding = PaddingValues(horizontal = KittySpace.md),
        horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
    ) {
        items(entries, key = { it.anilistId }, contentType = { "continue" }) { entry ->
            ContinueWatchCard(
                entry = entry,
                releasedEpisodes = releasedEpisodes[entry.anilistId],
                onOpen = { episode -> onOpen(entry, episode) },
                onOpenTitle = { onOpenTitle(entry) },
                onRemove = { onRemove(entry) },
                onMarkWatched = { episode -> onMarkWatched(entry, episode) },
            )
        }
    }
}

@Composable
fun ContinueSkeletonRow() {
    LazyRow(
        contentPadding = PaddingValues(horizontal = KittySpace.md),
        horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
        userScrollEnabled = false,
    ) {
        items(3) {
            Column(modifier = Modifier.width(ContinueCardWidth)) {
                ShimmerBox(
                    modifier = Modifier
                        .fillMaxWidth()
                        .aspectRatio(16f / 9f)
                        .clip(RoundedCornerShape(KittyRadius.md)),
                )
                Spacer(modifier = Modifier.height(KittySpace.sm))
                ShimmerBox(
                    modifier = Modifier
                        .fillMaxWidth(0.86f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(KittyRadius.sm)),
                )
                Spacer(modifier = Modifier.height(6.dp))
                ShimmerBox(
                    modifier = Modifier
                        .fillMaxWidth(0.42f)
                        .height(12.dp)
                        .clip(RoundedCornerShape(KittyRadius.sm)),
                )
            }
        }
    }
}

@Composable
fun ContinueAllPage(
    history: List<WatchHistoryEntity>,
    onBack: () -> Unit,
    onOpen: (WatchHistoryEntity, Int) -> Unit,
    onRemove: (WatchHistoryEntity) -> Unit,
    onMarkWatched: (WatchHistoryEntity, Int) -> Unit,
    onOpenTitle: (WatchHistoryEntity) -> Unit = { entry -> onOpen(entry, entry.episode) },
    releasedEpisodes: Map<Int, Int> = emptyMap(),
) {
    val palette = LocalKittyPalette.current
    val hidden = ContinueHidden.ids
    val queue = remember(history, hidden, releasedEpisodes) {
        continueQueue(history, hidden, releasedEpisodes)
    }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.page)
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
        SpacePageHeader(
            title = "Continue watching",
            subtitle = if (queue.isEmpty()) "Nothing in progress" else "Most recent first",
            onBack = onBack,
        )
        if (queue.isEmpty()) {
            Text(
                "Finished series stay off this list.",
                color = palette.muted,
                fontSize = 14.sp,
                modifier = Modifier.padding(horizontal = KittySpace.lg, vertical = KittySpace.md),
            )
        } else {
            LazyVerticalGrid(
                columns = GridCells.Fixed(2),
                contentPadding = PaddingValues(
                    start = KittySpace.md,
                    end = KittySpace.md,
                    bottom = 120.dp,
                ),
                horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
                verticalArrangement = Arrangement.spacedBy(KittySpace.md),
            ) {
                items(queue, key = { it.anilistId }) { entry ->
                    ContinueWatchCard(
                        entry = entry,
                        fillWidth = true,
                        releasedEpisodes = releasedEpisodes[entry.anilistId],
                        onOpen = { episode -> onOpen(entry, episode) },
                        onOpenTitle = { onOpenTitle(entry) },
                        onRemove = { onRemove(entry) },
                        onMarkWatched = { episode -> onMarkWatched(entry, episode) },
                    )
                }
            }
        }
    }
}

@OptIn(ExperimentalFoundationApi::class)
@Composable
fun ContinueWatchCard(
    entry: WatchHistoryEntity,
    fillWidth: Boolean = false,
    showWithoutCue: Boolean = false,
    releasedEpisodes: Int? = null,
    onOpen: (Int) -> Unit,
    onOpenTitle: () -> Unit = { onOpen(entry.episode.coerceAtLeast(1)) },
    onRemove: (() -> Unit)? = null,
    onMarkWatched: ((Int) -> Unit)? = null,
) {
    val cue = continueCue(entry, releasedEpisodes)
    if (cue == null && !showWithoutCue) return
    val shown = cue ?: libraryCue(entry)
    val palette = LocalKittyPalette.current
    val context = LocalContext.current
    val shape = RoundedCornerShape(KittyRadius.md)
    var frame by remember(entry.anilistId, shown.episode) { mutableStateOf<EpisodeFrame?>(null) }
    var menu by remember(entry.anilistId) { mutableStateOf(false) }
    LaunchedEffect(entry.anilistId, shown.episode) {
        frame = withContext(Dispatchers.IO) {
            TmdbCatalog.shared(context).episodeFrame(entry.anilistId, shown.episode)
        }
    }
    val image = frame?.stillUrl ?: frame?.backdropUrl ?: entry.coverImageUrl
    val season = frame?.season
    val episodeTitle = frame?.episodeTitle?.takeIf { name ->
        name.isNotBlank() && !name.equals("Episode ${shown.episode}", ignoreCase = true)
    }
    val line = buildString {
        if (season != null && season > 0) {
            append("S$season")
            append(" · ")
        }
        append("E${shown.episode}")
        if (!episodeTitle.isNullOrBlank()) {
            append(" · ")
            append(episodeTitle)
        }
    }
    val time = when {
        shown.minutesLeft != null -> "${shown.minutesLeft} min left"
        shown.next -> "Next"
        shown.progress > 0f -> "Resume"
        else -> null
    }
    val entries = buildList {
        if (onRemove != null) add(KittyMenuEntry("Remove from row", onRemove))
        if (onMarkWatched != null) add(KittyMenuEntry("Mark watched") { onMarkWatched(shown.episode) })
        add(KittyMenuEntry("Go to title") { onOpenTitle() })
    }
    Column(
        modifier = (if (fillWidth) Modifier.fillMaxWidth() else Modifier.width(ContinueCardWidth))
            .combinedClickable(
                onClick = { onOpen(shown.episode) },
                onLongClick = { menu = true },
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .clip(shape)
                .background(Color(0xFF141416)),
        ) {
            if (image.isNullOrBlank()) {
                ShimmerBox(modifier = Modifier.fillMaxSize())
            } else {
                KittyImage(
                    url = image,
                    contentDescription = entry.title,
                    widthPx = 640,
                    heightPx = 360,
                    contentScale = ContentScale.Crop,
                    alignment = Alignment.TopCenter,
                    modifier = Modifier.fillMaxSize(),
                )
            }
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
            if (shown.next) {
                Text(
                    "Next",
                    color = Color.Black,
                    fontSize = 11.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(KittySpace.sm)
                        .clip(RoundedCornerShape(KittyRadius.sm))
                        .background(Color.White)
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(4.dp)
                    .size(48.dp)
                    .spacePress { menu = true },
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Outlined.MoreVert,
                    contentDescription = "More actions for ${entry.title}",
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
                KittyMenu(expanded = menu, onDismiss = { menu = false }, entries = entries)
            }
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .padding(start = 10.dp, end = 10.dp, bottom = 10.dp),
            ) {
                val logo = transparentLogo(frame?.logoUrl)
                if (!logo.isNullOrBlank()) {
                    KittyImage(
                        url = logo,
                        contentDescription = entry.title,
                        widthPx = 360,
                        heightPx = 80,
                        contentScale = ContentScale.Fit,
                        placeholder = Color.Transparent,
                        modifier = Modifier
                            .height(28.dp)
                            .fillMaxWidth(0.72f),
                    )
                } else {
                    Text(
                        entry.title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 14.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(Color.White.copy(alpha = 0.18f)),
            ) {
                if (shown.progress > 0f) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(shown.progress.coerceIn(0f, 1f))
                            .clip(RoundedCornerShape(topEnd = 2.dp, bottomEnd = 2.dp))
                            .background(Color(0xFFDDDDDD)),
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(KittySpace.sm))
        Text(
            line,
            color = palette.text,
            fontSize = 12.sp,
            lineHeight = 16.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        if (time != null) {
            Text(
                time,
                color = palette.muted,
                fontSize = 12.sp,
                lineHeight = 16.sp,
                maxLines = 1,
                modifier = Modifier.padding(top = 2.dp),
            )
        }
    }
}

private fun libraryCue(entry: WatchHistoryEntity): site.anikitty.app.data.local.ContinueCue {
    val progress = if (entry.durationMs > 0L) {
        (entry.positionMs.toFloat() / entry.durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    return site.anikitty.app.data.local.ContinueCue(
        episode = entry.episode.coerceAtLeast(1),
        next = false,
        progress = progress,
        minutesLeft = site.anikitty.app.data.minutesLeft(entry.positionMs, entry.durationMs),
    )
}
