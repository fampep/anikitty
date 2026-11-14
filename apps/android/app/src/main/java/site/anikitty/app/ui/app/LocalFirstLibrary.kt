// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.activity.compose.BackHandler
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SizeTransform
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.animation.core.updateTransition
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.animation.using
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
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
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.airingLabel
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.minutesLeft
import site.anikitty.app.data.watchedAgo
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.anilist.AnimeEpisodeItem
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.AnimatedSearchIcon
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.icons.FluentuiSystemIconsCalendarClockFilled
import site.anikitty.app.ui.icons.FluentuiSystemIconsCalendarClockOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsHomeFilled
import site.anikitty.app.ui.icons.FluentuiSystemIconsHomeOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsPersonFilled
import site.anikitty.app.ui.icons.FluentuiSystemIconsPersonOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsSettingsOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsSearchSparkleOutline
import site.anikitty.app.ui.components.KittyBottomNav
import site.anikitty.app.ui.components.KittyContinueCard
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyMetaChips
import site.anikitty.app.ui.components.KittyNavTab
import site.anikitty.app.ui.components.KittyPageHeader
import site.anikitty.app.ui.components.KittyRoundIconButton
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyAtmosphere
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.LocalActiveCoverKey
import site.anikitty.app.ui.theme.LocalNavAnimatedVisibilityScope
import site.anikitty.app.ui.theme.LocalSharedTransitionScope
import site.anikitty.app.ui.theme.coverKey
import site.anikitty.app.ui.theme.coverKeyIsBanner
import site.anikitty.app.ui.theme.sharedCover
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText

@Composable
internal fun HistoryFeed(
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    aniListLinked: Boolean,
    accessToken: String?,
    syncLabel: String?,
    onSync: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
    libraryFilter: String,
    onLibraryFilter: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var favourites by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var libraryQuery by rememberSaveable { mutableStateOf("") }
    var librarySort by rememberSaveable { mutableStateOf("recent") }
    var confirmClear by remember { mutableStateOf(false) }
    LaunchedEffect(accessToken) {
        val token = accessToken
        if (token.isNullOrBlank()) {
            favourites = emptyList()
            return@LaunchedEffect
        }
        favourites = runCatching { aniList.favourites(token) }.getOrDefault(emptyList())
    }
    fun List<WatchHistoryEntity>.forLibrary(): List<WatchHistoryEntity> {
        val q = libraryQuery.trim()
        val matched = if (q.length < 2) {
            this
        } else {
            filter { it.title.contains(q, ignoreCase = true) }
        }
        return when (librarySort) {
            "title" -> matched.sortedBy { it.title.lowercase() }
            "episode" -> matched.sortedByDescending { it.episode }
            else -> matched.sortedByDescending { it.updatedAtEpochMs }
        }
    }
    val watching = history.filter {
        val s = it.listStatus?.uppercase()
        s == null || s == "CURRENT" || s == "REPEATING"
    }.forLibrary()
    val completed = history.filter { it.listStatus.equals("COMPLETED", ignoreCase = true) }.forLibrary()
    val planning = history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.forLibrary()
    val paused = history.filter { it.listStatus.equals("PAUSED", ignoreCase = true) }.forLibrary()
    val dropped = history.filter { it.listStatus.equals("DROPPED", ignoreCase = true) }.forLibrary()
    val grouped = watching + completed + planning + paused + dropped
    val other = history.filter { entry -> grouped.none { it.anilistId == entry.anilistId } }.forLibrary()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = 100.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            KittyPageHeader(
                title = "Library",
                subtitle = "Favourites, watching, and the rest of your AniList.",
                trailing = if (aniListLinked) {
                    {
                        Button(
                            onClick = onSync,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = KittyAccent,
                                contentColor = KittyOnAccent,
                            ),
                            shape = RoundedCornerShape(999.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            Text("Sync", fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    null
                },
            )
        }
        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(
                    "all" to "All ${history.size}",
                    "watching" to "Watching ${watching.size}",
                    "plan" to "Plan ${planning.size}",
                    "paused" to "Paused ${paused.size}",
                    "done" to "Done ${completed.size}",
                    "dropped" to "Dropped ${dropped.size}",
                    "favourites" to "Favourites ${favourites.size}",
                ).forEach { (id, label) ->
                    Chip(label, selected = libraryFilter == id) {
                        confirmClear = false
                        onLibraryFilter(id)
                    }
                }
            }
        }
        item {
            OutlinedTextField(
                value = libraryQuery,
                onValueChange = {
                    libraryQuery = it.take(80)
                    confirmClear = false
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                placeholder = { Text("Search your library", color = KittyFaint) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = KittyText,
                    unfocusedTextColor = KittyText,
                    cursorColor = KittyText,
                    focusedBorderColor = Color.White.copy(alpha = 0.28f),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.08f),
                    focusedContainerColor = Color(0xFF0C0C10),
                    unfocusedContainerColor = Color(0xFF0C0C10),
                ),
                shape = RoundedCornerShape(16.dp),
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("recent" to "Recent", "title" to "A\u2013Z", "episode" to "Episode").forEach { (id, label) ->
                    Chip(label, selected = librarySort == id) { librarySort = id }
                }
            }
        }
        val q = libraryQuery.trim()
        val shownFavourites = if (q.length < 2) {
            favourites
        } else {
            favourites.filter { anime ->
                anime.title.contains(q, ignoreCase = true) ||
                    anime.romajiTitle?.contains(q, ignoreCase = true) == true ||
                    anime.searchTitles().any { it.contains(q, ignoreCase = true) }
            }
        }
        val showFavourites = libraryFilter == "all" || libraryFilter == "favourites"
        if (showFavourites && shownFavourites.isNotEmpty()) {
            item {
                KittySectionHeading(
                    title = "Favourites",
                    subtitle = "Saved on AniList",
                    padded = false,
                )
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    lazyItems(shownFavourites, key = { "fav-${it.id}" }) { anime ->
                        Column(
                            modifier = Modifier
                                .width(112.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .clickable { onOpen(anime) },
                        ) {
                            AsyncImage(
                                model = anime.coverImageUrl,
                                contentDescription = anime.title,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(2f / 3f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(1.dp, KittyOutlineSoft, RoundedCornerShape(12.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                anime.title,
                                color = KittyText,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }
        val historySections = when (libraryFilter) {
            "watching" -> listOf(Triple("Watching", watching, "w"))
            "plan" -> listOf(Triple("Plan to watch", planning, "p"))
            "paused" -> listOf(Triple("Paused", paused, "z"))
            "done" -> listOf(Triple("Completed", completed, "c"))
            "dropped" -> listOf(Triple("Dropped", dropped, "d"))
            "favourites" -> emptyList()
            else -> listOf(
                Triple("Watching", watching, "w"),
                Triple("Plan to watch", planning, "p"),
                Triple("Paused", paused, "z"),
                Triple("Completed", completed, "c"),
                Triple("Dropped", dropped, "d"),
                Triple("More", other, "o"),
            )
        }
        val historyVisible = historySections.any { it.second.isNotEmpty() }
        val searching = libraryQuery.trim().length >= 2
        if (!historyVisible && !(showFavourites && shownFavourites.isNotEmpty())) {
            item {
                val title = when {
                    searching -> "No titles match"
                    libraryFilter == "favourites" && aniListLinked -> "No favourites yet"
                    libraryFilter == "favourites" -> "Sign in for favourites"
                    else -> "Nothing in this list"
                }
                val body = when {
                    searching -> "Try another word, or clear the search."
                    libraryFilter == "favourites" && aniListLinked ->
                        "Heart a show on AniList and it shows up here."
                    libraryFilter == "favourites" ->
                        "Favourites come from your AniList account."
                    else -> "Favourite a show, or set it to Watching, and it lands here."
                }
                KittyEmptyState(title = title, body = body)
            }
        } else if (historyVisible) {
            item {
                val visibleCount = historySections.sumOf { it.second.size }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        if (libraryFilter == "all" && !searching) {
                            "$visibleCount on this device"
                        } else {
                            "$visibleCount in this view"
                        },
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (libraryFilter == "all" && !searching) {
                        OutlinedButton(
                            onClick = {
                                if (confirmClear) {
                                    confirmClear = false
                                    scope.launch { historyDao.clear() }
                                } else {
                                    confirmClear = true
                                }
                            },
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(999.dp),
                            border = BorderStroke(1.dp, KittyOutlineSoft),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = KittyMuted),
                        ) {
                            Text(
                                if (confirmClear) "Confirm clear" else "Clear local",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
            fun LazyListScope.section(title: String, rows: List<WatchHistoryEntity>, prefix: String) {
                if (rows.isEmpty()) return
                item {
                    KittySectionHeading(
                        title = title,
                        subtitle = "${rows.size} title${if (rows.size == 1) "" else "s"}",
                        padded = false,
                    )
                }
                lazyItems(rows, key = { "$prefix-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
            }
            historySections.forEach { (title, rows, prefix) ->
                section(title, rows, prefix)
            }
        }
    }
}

@Composable
private fun HistoryRow(
    entry: WatchHistoryEntity,
    aniList: AniListClient,
    onOpen: (AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    KittyContinueCard(
        title = entry.title,
        coverUrl = entry.coverImageUrl,
        episode = entry.episode,
        positionMs = entry.positionMs,
        durationMs = entry.durationMs,
        wide = false,
        badge = buildString {
            listStatusBadge(entry.listStatus)?.let { append(it) }
            minutesLeft(entry.positionMs, entry.durationMs)?.let { left ->
                if (isNotEmpty()) append(" \u00b7 ")
                append(left)
                append(" min left")
            }
            watchedAgo(entry.updatedAtEpochMs).takeIf { it.isNotEmpty() }?.let { ago ->
                if (isNotEmpty()) append(" \u00b7 ")
                append(ago)
            }
        }.ifBlank { null },
        onClick = {
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

@OptIn(ExperimentalLayoutApi::class)
@Composable
private fun AniListProfileCard(
    auth: AniListAuthStore,
    fallbackName: String,
    syncLabel: String?,
    onOpenList: (String) -> Unit = {},
    onSignOut: () -> Unit = {},
) {
    val name = auth.username?.takeIf { it.isNotBlank() } ?: fallbackName
    val days = auth.minutesWatched / 1440
    val score = if (auth.meanScore <= 0f) "\u2014" else auth.meanScore.toInt().toString()
    val syncing = syncLabel == "Syncing\u2026"
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SpaceLabel("PROFILE", padded = false)
            Text(
                text = "Logout",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 10.sp),
                color = Color.White.copy(alpha = 0.55f),
                modifier = Modifier.spacePress(onSignOut),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF0C0C10))
                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp)),
        ) {
            if (!auth.bannerUrl.isNullOrBlank()) {
                AsyncImage(
                    model = auth.bannerUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .matchParentSize()
                        .graphicsLayer { alpha = 0.22f },
                    contentScale = ContentScale.Crop,
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color.Black.copy(alpha = 0.92f), Color.Black.copy(alpha = 0.45f)),
                            ),
                        ),
                )
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (!auth.avatarUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = auth.avatarUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1E1E20)),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            name.take(1).uppercase(),
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = name,
                        color = Color.White,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = if (syncing) "Syncing..." else "Connected",
                        color = Color.White.copy(alpha = if (syncing) 1f else 0.5f),
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
        if (!auth.about.isNullOrBlank()) {
            Text(
                auth.about.orEmpty(),
                color = Color.White.copy(alpha = 0.55f),
                style = MaterialTheme.typography.bodySmall,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }
        SpaceLabel("STATS")
        SpaceCard {
            Row(modifier = Modifier.fillMaxWidth()) {
                ProfileStat(auth.animeCount.toString(), "Anime")
                ProfileStat(auth.episodesWatched.toString(), "Episodes")
                ProfileStat(days.toString(), "Days")
                ProfileStat(score, "Score")
            }
        }
        SpaceLabel("LISTS")
        FlowRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            SpaceChip("Watching (${auth.watchingCount})", selected = false) { onOpenList("watching") }
            SpaceChip("Completed (${auth.completedCount})", selected = false) { onOpenList("done") }
            SpaceChip("Planning (${auth.planningCount})", selected = false) { onOpenList("plan") }
            SpaceChip("Paused (${auth.pausedCount})", selected = false) { onOpenList("paused") }
            SpaceChip("Dropped (${auth.droppedCount})", selected = false) { onOpenList("dropped") }
        }
        if (!syncLabel.isNullOrBlank() && !syncing) {
            Text(
                syncLabel,
                color = Color.White.copy(alpha = 0.45f),
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }
    }
}

@Composable
private fun androidx.compose.foundation.layout.RowScope.ProfileStat(
    value: String,
    label: String,
    onClick: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            value,
            color = KittyText,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
        )
        Text(
            label,
            color = KittyMuted,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
        )
    }
}

@Composable
internal fun SettingsFeed(
    catalog: ServerCatalog,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    accountLabel: String,
    syncLabel: String?,
    onSyncLabel: (String?) -> Unit,
    linkStatus: String?,
    onLinkStatus: (String?) -> Unit,
    linkTick: Int,
    onLinkTick: () -> Unit,
    onAccountReady: () -> Unit = {},
    onSignOut: () -> Unit,
    onOpenStore: () -> Unit,
    onOpenBuilds: () -> Unit,
    onOpenLibrary: (String) -> Unit = {},
    homeLayout: HomeLayoutStore,
    openAccountTick: Int = 0,
) {
    val selectedId by catalog.selectedId.collectAsState()
    val resolvers by catalog.resolvers.collectAsState()
    val installedExt by catalog.extensions.installed.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var extensionStatus by remember { mutableStateOf<String?>(null) }

    // linkTick bumps after save/clear so Compose re-reads prefs-backed isLinked.
    val isLinked = linkTick.let { aniListAuth.isLinked }
    var page by rememberSaveable { mutableStateOf("hub") }
    LaunchedEffect(openAccountTick) {
        if (openAccountTick > 0) page = "account"
    }
    BackHandler(enabled = page != "hub") { page = "hub" }
    val selectedName = resolvers.firstOrNull { it.server.id == selectedId }?.server?.name ?: "None selected"
    val homeShown = homeLayout.sections().count { it.enabled }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = 100.dp),
    ) {
        AnimatedContent(
            targetState = page,
            transitionSpec = {
                val back = targetState == "hub"
                val dir = if (back) -1 else 1
                (slideInHorizontally(tween(280)) { it / 5 * dir } + fadeIn(tween(220))) togetherWith
                    (slideOutHorizontally(tween(200)) { -it / 6 * dir } + fadeOut(tween(150)))
            },
            label = "settingsPage",
        ) { current ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(14.dp),
        ) {
            when (current) {
                "hub" -> {
                    item {
                        SpacePageHeader(
                            title = "Settings",
                            subtitle = "Account, home, sources, and the app.",
                        )
                    }
                    item {
                        SettingsHubRow(
                            icon = FluentuiSystemIconsPersonOutline,
                            title = "Account",
                            detail = if (isLinked) {
                                aniListAuth.username?.takeIf { it.isNotBlank() }?.let { "@$it" }
                                    ?: accountLabel.ifBlank { "Signed in" }
                            } else {
                                "Not signed in"
                            },
                            avatarUrl = linkTick.let { aniListAuth.avatarUrl },
                            useAvatar = true,
                            onClick = { page = "account" },
                        )
                    }
                    item {
                        SettingsHubRow(
                            icon = FluentuiSystemIconsHomeOutline,
                            title = "Home",
                            detail = "$homeShown rows showing",
                            onClick = { page = "home" },
                        )
                    }
                    item {
                        SettingsHubRow(
                            icon = Icons.Outlined.Extension,
                            title = "Sources",
                            detail = selectedName,
                            onClick = { page = "sources" },
                        )
                    }
                    item {
                        SettingsHubRow(
                            icon = FluentuiSystemIconsSettingsOutline,
                            title = "App",
                            detail = "Version ${BuildConfig.VERSION_NAME}",
                            onClick = { page = "app" },
                        )
                    }
                }
                "account" -> {
                    item {
                        SpacePageHeader(
                            title = "Account",
                            subtitle = if (isLinked) "Your AniList profile." else "Sign in to load your lists.",
                            onBack = { page = "hub" },
                        )
                    }
                    if (isLinked) {
                        item {
                            AniListProfileCard(
                                auth = aniListAuth,
                                fallbackName = accountLabel.ifBlank { "AniList" },
                                syncLabel = syncLabel,
                                onOpenList = onOpenLibrary,
                                onSignOut = onSignOut,
                            )
                        }
                        item {
                            Button(
                                onClick = {
                                    scope.launch {
                                        onSyncLabel("Syncing\u2026")
                                        onSyncLabel(
                                            runCatching {
                                                val result = aniListSync.pull()
                                                "Synced ${result.imported} titles"
                                            }.getOrElse { e -> e.message },
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = KittyAccent,
                                    contentColor = KittyOnAccent,
                                ),
                            ) { Text("Sync now", fontWeight = FontWeight.Bold) }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                    } else {
                        item {
                            SpaceCard(onClick = { AniListOAuth.openAuthorize(context) }) {
                                Text(
                                    "Connect AniList",
                                    color = Color.White,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Text(
                                    "Your list and the next episode come back with you.",
                                    color = Color.White.copy(alpha = 0.5f),
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = Color.White.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                    }
                }
                "home" -> {
                    item {
                        SpacePageHeader(
                            title = "Home",
                            subtitle = "Turn rows on or off, and move them.",
                            onBack = { page = "hub" },
                        )
                    }
                    item { HomeLayoutSettings(homeLayout) }
                }
                "sources" -> {
                    item {
                        SpacePageHeader(
                            title = "Sources",
                            subtitle = "Anikoto, Gotaku, and Ani.pm ship in the app.",
                            onBack = { page = "hub" },
                        )
                    }
                    item {
                        Button(
                            onClick = onOpenStore,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = KittyAccent,
                                contentColor = KittyOnAccent,
                            ),
                        ) {
                            Text("Open Extension Store", fontWeight = FontWeight.Bold)
                        }
                        if (extensionStatus != null) {
                            Text(
                                extensionStatus!!,
                                color = Color.White.copy(alpha = 0.5f),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            )
                        }
                    }
                    lazyItems(resolvers.map { it.server }, key = { it.id }) { server ->
                        val selected = server.id == selectedId
                        val isExtension = installedExt.any { it.id == server.id }
                        Column(
                            modifier = Modifier
                                .padding(horizontal = 20.dp)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .spacePress { catalog.select(server.id) }
                                .background(Color(0xFF0C0C10))
                                .border(
                                    0.5.dp,
                                    if (selected) Color.White.copy(alpha = 0.45f) else Color.White.copy(alpha = 0.08f),
                                    RoundedCornerShape(12.dp),
                                )
                                .padding(14.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ExtensionIcon(
                                    iconUrl = server.iconUrl,
                                    contentDescription = server.name,
                                    size = 40.dp,
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            server.name,
                                            color = KittyText,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.weight(1f, fill = false),
                                        )
                                        if (selected) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                "ACTIVE",
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(999.dp))
                                                    .background(KittyAccent)
                                                    .padding(horizontal = 8.dp, vertical = 3.dp),
                                                color = KittyOnAccent,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp,
                                            )
                                        }
                                    }
                                    Text(
                                        if (isExtension) "Extension" else "Bundled",
                                        color = KittyFaint,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                            Text(
                                server.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = KittyMuted,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                            if (isExtension) {
                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(
                                    onClick = {
                                        catalog.uninstallExtension(server.id)
                                        extensionStatus = "Removed ${server.name}"
                                    },
                                    contentPadding = PaddingValues(0.dp),
                                ) {
                                    Text("Uninstall", color = KittyFaint, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
                else -> {
                    item {
                        SpacePageHeader(
                            title = "App",
                            subtitle = "Version ${BuildConfig.VERSION_NAME}",
                            onBack = { page = "hub" },
                        )
                    }
                    item { AppBuildsRow(onClick = onOpenBuilds) }
                    item {
                        Text(
                            "Copyright 2026 fampep. Apache License 2.0.",
                            color = Color.White.copy(alpha = 0.45f),
                            fontSize = 13.sp,
                            modifier = Modifier.padding(horizontal = 20.dp),
                        )
                    }
                }
            }
        }
        }
    }
}

@Composable
private fun SettingsHubRow(
    icon: ImageVector,
    title: String,
    detail: String,
    onClick: () -> Unit,
    avatarUrl: String? = null,
    useAvatar: Boolean = false,
) {
    SpaceCard(onClick = onClick) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (useAvatar) {
                ProfileMark(imageUrl = avatarUrl, size = 36.dp)
            } else {
                Box(
                    modifier = Modifier
                        .size(36.dp)
                        .clip(CircleShape)
                        .background(Color(0xFF141416)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = Color.White, modifier = Modifier.size(18.dp))
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = Color.White,
                    fontWeight = FontWeight.Medium,
                    fontSize = 15.sp,
                )
                Text(
                    detail,
                    color = Color.White.copy(alpha = 0.5f),
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(
                Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = Color.White.copy(alpha = 0.35f),
            )
        }
    }
}

