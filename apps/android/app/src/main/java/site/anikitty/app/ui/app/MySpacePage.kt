// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Sync
import site.anikitty.app.ui.icons.FluentuiSystemIconsBookmarkOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsMoviesAndTvFilled
import site.anikitty.app.ui.icons.FluentuiSystemIconsStarFilled
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListMediaListEntry
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListViewer
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity

@Composable
fun MySpaceFeed(
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    aniListLinked: Boolean,
    accessToken: String?,
    accountLabel: String,
    syncLabel: String?,
    libraryFilter: String,
    onSync: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
    onOpenAccount: () -> Unit,
    onSignOut: () -> Unit,
    avatarUrl: String? = null,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var viewer by remember { mutableStateOf<AniListViewer?>(null) }
    var favourites by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var cloudLists by remember { mutableStateOf<List<AniListMediaListEntry>>(emptyList()) }
    var loadingCloud by remember { mutableStateOf(false) }
    var selectedTab by remember(libraryFilter) {
        mutableStateOf(tabForLibraryFilter(libraryFilter))
    }
    var confirmClear by remember { mutableStateOf(false) }
    val syncing = syncLabel == "Syncing…"

    LaunchedEffect(accessToken, syncLabel) {
        val token = accessToken
        if (!aniListLinked || token.isNullOrBlank()) {
            viewer = null
            favourites = emptyList()
            cloudLists = emptyList()
            loadingCloud = false
            return@LaunchedEffect
        }
        if (syncing) return@LaunchedEffect
        loadingCloud = viewer == null
        val profile = runCatching { aniList.viewer(token) }.getOrNull()
        viewer = profile
        favourites = runCatching { aniList.favourites(token) }.getOrDefault(emptyList())
        cloudLists = profile?.let { person ->
            runCatching { aniList.mediaListEntries(token, person.id) }.getOrDefault(emptyList())
        }.orEmpty()
        loadingCloud = false
    }

    val continueWatching = remember(history) {
        history
            .filter { it.episodesFinished() > 0 || it.positionMs > 0L }
            .sortedByDescending { it.updatedAtEpochMs }
            .take(24)
    }
    val tabs = remember(favourites, cloudLists, history) {
        buildList {
            if (favourites.isNotEmpty()) add("Favorites")
            val statuses = if (cloudLists.isNotEmpty()) {
                cloudLists.map { it.status }
            } else {
                history.mapNotNull { it.listStatus }
            }
            listOf("CURRENT", "REPEATING", "PLANNING", "PAUSED", "COMPLETED", "DROPPED")
                .filter { status -> statuses.any { it.equals(status, ignoreCase = true) } }
                .forEach { add(listStatusName(it)) }
        }
    }
    LaunchedEffect(tabs) {
        if (selectedTab.isBlank() || selectedTab !in tabs) {
            selectedTab = tabs.firstOrNull().orEmpty()
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black),
    ) {
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(bottom = 88.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(WindowInsets.statusBars)
                        .padding(horizontal = 20.dp, vertical = 20.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Bottom,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "My Space",
                            style = MaterialTheme.typography.headlineMedium.copy(
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = (-0.5).sp,
                            ),
                            color = Color.White,
                        )
                        Text(
                            text = "Your favorites & history.",
                            style = MaterialTheme.typography.bodySmall,
                            color = Color.White.copy(alpha = 0.45f),
                            modifier = Modifier.padding(top = 2.dp),
                        )
                    }
                    ProfileMark(
                        imageUrl = viewer?.avatarUrl ?: avatarUrl,
                        size = 36.dp,
                        modifier = Modifier.spacePress(onOpenAccount),
                    )
                }
            }

            item {
                CloudSyncBlock(
                    linked = aniListLinked && !accessToken.isNullOrBlank(),
                    viewer = viewer,
                    accountLabel = accountLabel,
                    syncing = syncing,
                    loading = loadingCloud,
                    tabs = tabs,
                    selectedTab = selectedTab,
                    favourites = favourites,
                    cloudLists = cloudLists,
                    history = history,
                    onSelectTab = { selectedTab = it },
                    onSync = onSync,
                    onConnect = { AniListOAuth.openAuthorize(context) },
                    onSignOut = onSignOut,
                    onOpen = onOpen,
                )
            }

            item {
                ContinueBlock(
                    rows = continueWatching,
                    confirmClear = confirmClear,
                    onClear = {
                        if (confirmClear) {
                            confirmClear = false
                            scope.launch { historyDao.clear() }
                        } else {
                            confirmClear = true
                        }
                    },
                    onOpen = { entry ->
                        scope.launch {
                            val detail = aniList.media(entry.anilistId) ?: AnimeSummary(
                                id = entry.anilistId,
                                title = entry.title,
                                coverImageUrl = entry.coverImageUrl,
                                episodes = null,
                                format = null,
                                averageScore = null,
                                malId = entry.malId,
                            )
                            onOpen(detail)
                        }
                    },
                )
            }

            item {
                FavoritesBlock(
                    favourites = favourites,
                    linked = aniListLinked,
                    onOpen = onOpen,
                )
            }
        }
    }
}

@Composable
private fun CloudSyncBlock(
    linked: Boolean,
    viewer: AniListViewer?,
    accountLabel: String,
    syncing: Boolean,
    loading: Boolean,
    tabs: List<String>,
    selectedTab: String,
    favourites: List<AnimeSummary>,
    cloudLists: List<AniListMediaListEntry>,
    history: List<WatchHistoryEntity>,
    onSelectTab: (String) -> Unit,
    onSync: () -> Unit,
    onConnect: () -> Unit,
    onSignOut: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
) {
    val spin = rememberInfiniteTransition(label = "sync")
    val rotation by spin.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(
            animation = tween(1200, easing = LinearEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "rotation",
    )
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    text = "CLOUDSYNC (ANILIST)",
                    style = MaterialTheme.typography.labelSmall.copy(
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp,
                    ),
                    color = Color.White.copy(alpha = 0.6f),
                )
                if (linked) {
                    Box(
                        modifier = Modifier
                            .size(24.dp)
                            .clip(CircleShape)
                            .clickable(enabled = !syncing, onClick = onSync)
                            .padding(4.dp),
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            imageVector = Icons.Filled.Sync,
                            contentDescription = "Sync AniList",
                            tint = if (syncing) Color.White else Color.White.copy(alpha = 0.6f),
                            modifier = Modifier
                                .size(14.dp)
                                .graphicsLayer { rotationZ = if (syncing) rotation else 0f },
                        )
                    }
                }
            }
            if (linked) {
                Text(
                    text = "Logout",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = Color.White.copy(alpha = 0.55f),
                    modifier = Modifier.clickable(onClick = onSignOut),
                )
            }
        }

        if (!linked) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color(0xFF141416))
                    .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                    .clickable(onClick = onConnect)
                    .padding(16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    text = "Connect AniList",
                    color = Color.White,
                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                )
            }
        } else if (loading && viewer == null) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp, vertical = 20.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(
                    modifier = Modifier.size(24.dp),
                    color = Color.White.copy(alpha = 0.5f),
                    strokeWidth = 2.dp,
                )
            }
        } else {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 20.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                AsyncImage(
                    model = viewer?.avatarUrl,
                    contentDescription = "Avatar",
                    modifier = Modifier
                        .size(40.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF1E1E20)),
                    contentScale = ContentScale.Crop,
                )
                Column {
                    Text(
                        text = viewer?.name ?: accountLabel.ifBlank { "AniList" },
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                    )
                    Text(
                        text = if (syncing) "Syncing..." else "Connected",
                        color = Color.White.copy(alpha = if (syncing) 1f else 0.5f),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }

            if (tabs.isNotEmpty()) {
                Spacer(modifier = Modifier.height(4.dp))
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    items(tabs) { tab ->
                        val count = tabCount(tab, favourites, cloudLists, history)
                        SpaceChip(
                            label = "$tab ($count)",
                            selected = selectedTab == tab,
                            onClick = { onSelectTab(tab) },
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(8.dp))
            val row = postersForTab(selectedTab, favourites, cloudLists, history)
            if (row.isNotEmpty()) {
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                ) {
                    items(row, key = { "cloud-${it.key}" }) { card ->
                        SpacePoster(
                            title = card.title,
                            imageUrl = card.imageUrl,
                            subtitle = card.subtitle,
                            progress = card.progress,
                            onClick = { onOpen(card.anime) },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ContinueBlock(
    rows: List<WatchHistoryEntity>,
    confirmClear: Boolean,
    onClear: () -> Unit,
    onOpen: (WatchHistoryEntity) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                text = "CONTINUE WATCHING",
                style = MaterialTheme.typography.labelSmall.copy(
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = 1.sp,
                ),
                color = Color.White.copy(alpha = 0.6f),
            )
            if (rows.isNotEmpty()) {
                Text(
                    text = if (confirmClear) "Confirm" else "Clear history",
                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                    color = Color.White.copy(alpha = 0.7f),
                    modifier = Modifier.clickable(onClick = onClear),
                )
            }
        }
        if (rows.isEmpty()) {
            EmptyPanel(
                icon = { Icon(FluentuiSystemIconsMoviesAndTvFilled, null, tint = Color.White.copy(alpha = 0.15f), modifier = Modifier.size(42.dp)) },
                title = "No watch history",
                body = "Anime you watch will appear here",
            )
        } else {
            LazyRow(
                contentPadding = PaddingValues(horizontal = 20.dp),
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                items(rows, key = { "cw-${it.anilistId}" }) { watch ->
                    val fraction = if (watch.durationMs > 0L) {
                        (watch.positionMs.toFloat() / watch.durationMs.toFloat()).coerceIn(0f, 1f)
                    } else {
                        0f
                    }
                    SpacePoster(
                        title = watch.title,
                        imageUrl = watch.coverImageUrl,
                        subtitle = "EP ${watch.episode}",
                        progress = fraction,
                        wide = true,
                        onClick = { onOpen(watch) },
                    )
                }
            }
        }
    }
}

@Composable
private fun FavoritesBlock(
    favourites: List<AnimeSummary>,
    linked: Boolean,
    onOpen: (AnimeSummary) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(
            text = "MY FAVORITES",
            modifier = Modifier.padding(horizontal = 20.dp),
            style = MaterialTheme.typography.labelSmall.copy(
                fontWeight = FontWeight.SemiBold,
                letterSpacing = 1.sp,
            ),
            color = Color.White.copy(alpha = 0.6f),
        )
        if (favourites.isEmpty()) {
            EmptyPanel(
                icon = {
                    Icon(
                        FluentuiSystemIconsBookmarkOutline,
                        null,
                        tint = Color.White.copy(alpha = 0.15f),
                        modifier = Modifier.size(42.dp),
                    )
                },
                title = "No favorites yet",
                body = if (linked) {
                    "Favourite a show on AniList and it shows up here"
                } else {
                    "Sign in to load your AniList favorites"
                },
            )
        } else {
            Column(
                modifier = Modifier.padding(horizontal = 20.dp),
                verticalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                favourites.forEach { anime ->
                    FavoriteRow(anime = anime, onClick = { onOpen(anime) })
                }
            }
        }
    }
}

@Composable
private fun EmptyPanel(
    icon: @Composable () -> Unit,
    title: String,
    body: String,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 20.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(Color.White.copy(alpha = 0.02f))
            .border(1.dp, Color.White.copy(alpha = 0.05f), RoundedCornerShape(12.dp))
            .padding(vertical = 40.dp),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            horizontalAlignment = Alignment.CenterHorizontally,
            verticalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            icon()
            Text(
                text = title,
                style = MaterialTheme.typography.titleSmall.copy(fontWeight = FontWeight.SemiBold),
                color = Color.White.copy(alpha = 0.8f),
            )
            Text(
                text = body,
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.4f),
            )
        }
    }
}

@Composable
private fun SpacePoster(
    title: String,
    imageUrl: String?,
    subtitle: String,
    progress: Float,
    onClick: () -> Unit,
    wide: Boolean = false,
) {
    val width = if (wide) 180.dp else 140.dp
    val height = if (wide) 102.dp else 80.dp
    Column(
        modifier = Modifier
            .width(width)
            .spacePress(onClick),
    ) {
        Box(
            modifier = Modifier
                .width(width)
                .height(height)
                .clip(RoundedCornerShape(8.dp))
                .background(Color.White.copy(alpha = 0.05f)),
        ) {
            AsyncImage(
                model = imageUrl,
                contentDescription = title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            listOf(Color.Transparent, Color.Black.copy(alpha = 0.7f)),
                        ),
                    ),
            )
            if (progress > 0f) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.dp)
                        .align(Alignment.BottomStart)
                        .background(Color.White.copy(alpha = 0.08f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxHeight()
                            .fillMaxWidth(progress.coerceIn(0f, 1f))
                            .background(Color.White),
                    )
                }
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = title,
            color = Color.White,
            style = MaterialTheme.typography.titleSmall.copy(
                fontWeight = FontWeight.Medium,
                fontSize = 12.sp,
                lineHeight = 14.sp,
            ),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 2.dp),
        )
        Text(
            text = subtitle,
            color = Color.White.copy(alpha = 0.4f),
            style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.padding(horizontal = 2.dp),
        )
    }
}

@Composable
private fun FavoriteRow(anime: AnimeSummary, onClick: () -> Unit) {
    val score = anime.averageScore?.takeIf { it > 0 }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .spacePress(onClick)
            .background(Color(0xFF0C0C10))
            .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
    ) {
        if (!anime.bannerImageUrl.isNullOrBlank()) {
            AsyncImage(
                model = anime.bannerImageUrl,
                contentDescription = null,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .matchParentSize()
                    .graphicsLayer { alpha = 0.15f },
            )
            Box(
                modifier = Modifier
                    .matchParentSize()
                    .background(
                        Brush.horizontalGradient(
                            listOf(Color.Black.copy(alpha = 0.94f), Color.Black.copy(alpha = 0.5f)),
                        ),
                    ),
            )
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(72.dp)
                    .aspectRatio(0.7f)
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color(0xFF141416)),
            ) {
                AsyncImage(
                    model = anime.coverImageUrl,
                    contentDescription = anime.title,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                if (score != null) {
                    val scoreColor = when {
                        score > 75 -> Color(0xFF4CAF50)
                        score > 50 -> Color(0xFFFFC107)
                        else -> Color.White
                    }
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(4.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.Black.copy(alpha = 0.8f))
                            .padding(horizontal = 4.dp, vertical = 1.dp),
                    ) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Icon(
                                imageVector = FluentuiSystemIconsStarFilled,
                                contentDescription = "Score",
                                tint = scoreColor,
                                modifier = Modifier.size(8.dp),
                            )
                            Spacer(modifier = Modifier.width(2.dp))
                            Text(
                                text = "$score%",
                                color = Color.White,
                                style = MaterialTheme.typography.labelSmall.copy(
                                    fontSize = 8.sp,
                                    fontWeight = FontWeight.SemiBold,
                                ),
                            )
                        }
                    }
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    text = anime.title,
                    color = Color.White,
                    style = MaterialTheme.typography.titleSmall.copy(
                        fontWeight = FontWeight.Medium,
                        fontSize = 13.sp,
                        letterSpacing = (-0.1).sp,
                    ),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
                val formatText = formatLine(anime.format, anime.episodes)
                if (formatText.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        text = formatText,
                        color = Color.White.copy(alpha = 0.6f),
                        style = MaterialTheme.typography.labelSmall.copy(fontSize = 11.sp),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                if (anime.genres.isNotEmpty()) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        anime.genres.take(3).forEach { genre ->
                            Box(
                                modifier = Modifier
                                    .clip(RoundedCornerShape(6.dp))
                                    .background(Color.White.copy(alpha = 0.05f))
                                    .border(0.5.dp, Color.White.copy(alpha = 0.06f), RoundedCornerShape(6.dp))
                                    .padding(horizontal = 6.dp, vertical = 2.dp),
                            ) {
                                Text(
                                    text = genre,
                                    color = Color.White.copy(alpha = 0.7f),
                                    style = MaterialTheme.typography.labelSmall.copy(fontSize = 9.sp),
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}

private data class SpaceCard(
    val key: String,
    val title: String,
    val imageUrl: String?,
    val subtitle: String,
    val progress: Float,
    val anime: AnimeSummary,
)

private fun postersForTab(
    tab: String,
    favourites: List<AnimeSummary>,
    cloudLists: List<AniListMediaListEntry>,
    history: List<WatchHistoryEntity>,
): List<SpaceCard> {
    if (tab == "Favorites") {
        return favourites.map { anime ->
            SpaceCard(
                key = "fav-${anime.id}",
                title = anime.title,
                imageUrl = anime.bannerImageUrl ?: anime.coverImageUrl,
                subtitle = formatLine(anime.format, anime.episodes).ifBlank { "Anime" },
                progress = 0f,
                anime = anime,
            )
        }
    }
    val status = statusForName(tab) ?: return emptyList()
    if (cloudLists.isNotEmpty()) {
        return cloudLists.filter { it.status.equals(status, ignoreCase = true) }.map { entry ->
            val total = entry.media.episodes?.takeIf { it > 0 }
            val fraction = if (total != null && entry.progress > 0) {
                (entry.progress.toFloat() / total.toFloat()).coerceIn(0f, 1f)
            } else {
                0f
            }
            SpaceCard(
                key = "list-$status-${entry.media.id}",
                title = entry.media.title,
                imageUrl = entry.media.bannerImageUrl ?: entry.media.coverImageUrl,
                subtitle = if (entry.media.format.equals("MOVIE", ignoreCase = true)) {
                    "Movie"
                } else if (entry.progress > 0) {
                    "EP ${entry.progress}"
                } else {
                    formatLine(entry.media.format, entry.media.episodes)
                },
                progress = fraction,
                anime = entry.media,
            )
        }
    }
    return history.filter { it.listStatus.equals(status, ignoreCase = true) }.map { entry ->
        SpaceCard(
            key = "local-$status-${entry.anilistId}",
            title = entry.title,
            imageUrl = entry.coverImageUrl,
            subtitle = "EP ${entry.episode}",
            progress = if (entry.durationMs > 0L) {
                (entry.positionMs.toFloat() / entry.durationMs.toFloat()).coerceIn(0f, 1f)
            } else {
                0f
            },
            anime = AnimeSummary(
                id = entry.anilistId,
                title = entry.title,
                coverImageUrl = entry.coverImageUrl,
                episodes = null,
                format = null,
                averageScore = null,
                malId = entry.malId,
            ),
        )
    }
}

private fun tabCount(
    tab: String,
    favourites: List<AnimeSummary>,
    cloudLists: List<AniListMediaListEntry>,
    history: List<WatchHistoryEntity>,
): Int {
    if (tab == "Favorites") return favourites.size
    val status = statusForName(tab) ?: return 0
    return if (cloudLists.isNotEmpty()) {
        cloudLists.count { it.status.equals(status, ignoreCase = true) }
    } else {
        history.count { it.listStatus.equals(status, ignoreCase = true) }
    }
}

private fun listStatusName(status: String): String = when (status.uppercase()) {
    "CURRENT" -> "Watching"
    "REPEATING" -> "Rewatching"
    "PLANNING" -> "Planning"
    "PAUSED" -> "Paused"
    "COMPLETED" -> "Completed"
    "DROPPED" -> "Dropped"
    else -> status
}

private fun statusForName(name: String): String? = when (name) {
    "Watching" -> "CURRENT"
    "Rewatching" -> "REPEATING"
    "Planning" -> "PLANNING"
    "Paused" -> "PAUSED"
    "Completed" -> "COMPLETED"
    "Dropped" -> "DROPPED"
    else -> null
}

private fun tabForLibraryFilter(filter: String): String = when (filter) {
    "watching" -> "Watching"
    "plan" -> "Planning"
    "paused" -> "Paused"
    "done" -> "Completed"
    "dropped" -> "Dropped"
    "favourites" -> "Favorites"
    else -> ""
}

private fun formatLine(format: String?, episodes: Int?): String {
    val label = when (format?.uppercase()) {
        "MOVIE" -> "Movie"
        "TV" -> "TV"
        "TV_SHORT" -> "Short"
        "OVA" -> "OVA"
        "ONA" -> "ONA"
        "SPECIAL" -> "Special"
        "MUSIC" -> "Music"
        null, "" -> ""
        else -> format
    }
    val count = if (!format.equals("MOVIE", ignoreCase = true)) episodes?.takeIf { it > 0 } else null
    return listOfNotNull(label.takeIf { it.isNotEmpty() }, count?.let { "$it Eps" }).joinToString(" • ")
}
