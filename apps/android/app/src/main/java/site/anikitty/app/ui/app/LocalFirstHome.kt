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
internal fun HomeFeed(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?, String?) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenGenre: (String) -> Unit,
    onOpenSchedule: () -> Unit,
    onOpenAccount: () -> Unit,
    homeLayout: HomeLayoutStore,
) {
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()
    var catalogJob by remember { mutableStateOf<Job?>(null) }
    val catalogBusy = loading || refreshing
    var airingToday by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    val airingClock = remember {
        java.text.SimpleDateFormat("h:mm a", java.util.Locale.getDefault())
    }
    LaunchedEffect(Unit) {
        val start = java.util.Calendar.getInstance().apply {
            set(java.util.Calendar.HOUR_OF_DAY, 0)
            set(java.util.Calendar.MINUTE, 0)
            set(java.util.Calendar.SECOND, 0)
            set(java.util.Calendar.MILLISECOND, 0)
        }
        val from = start.timeInMillis / 1000L
        airingToday = runCatching {
            aniList.airingSchedule(from, from + 24 * 60 * 60)
        }.getOrDefault(emptyList())
    }
    val continueWatching = remember(history) {
        history.filter { entry ->
            val status = entry.listStatus?.uppercase()
            val watching = status == null || status == "CURRENT" || status == "REPEATING"
            watching && (entry.episodesFinished() > 0 || entry.positionMs > 0L)
        }.take(12)
    }
    val planToWatch = remember(history) {
        history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.take(12)
    }
    var forYou by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var forYouFrom by remember { mutableStateOf<String?>(null) }
    val spotlightId = continueWatching.firstOrNull()?.anilistId
    LaunchedEffect(spotlightId) {
        val id = spotlightId
        if (id == null) {
            forYou = emptyList()
            forYouFrom = null
            return@LaunchedEffect
        }
        val full = runCatching { aniList.media(id, aniListAuth.accessToken) }.getOrNull()
        forYouFrom = continueWatching.firstOrNull { it.anilistId == id }?.title
        forYou = full?.recommendations.orEmpty().filter { it.id != id }
    }

    fun reload(fromPull: Boolean = false) {
        if (catalogJob?.isActive == true) return
        catalogJob = scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            runCatching {
                if (fromPull) aniList.invalidateCache()
                coroutineScope {
                    val t = async { aniList.trending(forceRefresh = fromPull) }
                    val s = async { aniList.seasonal(forceRefresh = fromPull) }
                    trending = t.await()
                    seasonal = s.await()
                }
            }.onFailure { error = friendlyFailure(it.message) }
            loading = false
            refreshing = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    val openCatalog: (AnimeSummary, String) -> Unit = { anime, key ->
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, null, key)
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        when {
            loading && trending.isEmpty() -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    HomeBar(
                        onRefresh = { reload(fromPull = true) },
                        refreshBusy = catalogBusy,
                        onOpenSearch = onOpenSearch,
                        onOpenAccount = onOpenAccount,
                        avatarUrl = aniListAuth.avatarUrl,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(280.dp)
                            .background(Color(0xFF0C0C10)),
                    )
                }
            }
            error != null && trending.isEmpty() -> {
                Column(modifier = Modifier.fillMaxWidth()) {
                    HomeBar(
                        onRefresh = { reload(fromPull = true) },
                        refreshBusy = catalogBusy,
                        onOpenSearch = onOpenSearch,
                        onOpenAccount = onOpenAccount,
                        avatarUrl = aniListAuth.avatarUrl,
                    )
                    Spacer(modifier = Modifier.height(28.dp))
                    KittyEmptyState(
                        title = "Couldn't load the catalog",
                        body = error ?: "Check your connection and try again.",
                        actionLabel = "Retry",
                        onAction = { reload() },
                    )
                }
            }
            else -> {
                LazyColumn(contentPadding = PaddingValues(bottom = 110.dp)) {
                    item {
                        HomeBar(
                            onRefresh = { reload(fromPull = true) },
                            refreshBusy = catalogBusy,
                            onOpenSearch = onOpenSearch,
                            onOpenAccount = onOpenAccount,
                            avatarUrl = aniListAuth.avatarUrl,
                        )
                    }
                    val phoneSections = homeLayout.sections()
                    phoneSections.forEach { section ->
                        if (!section.enabled) return@forEach
                        when (section.id) {
                            "featured" -> item {
                                HomeFeatured(items = trending, onOpen = openCatalog)
                            }
                            "continue" -> if (continueWatching.isNotEmpty()) item {
                                HomeBlock(title = "Continue") {
                                    HomeContinueRow(
                                        continueWatching.map { entry ->
                                            val target = playbackTarget(entry)
                                            val resume = target == entry.episode.coerceAtLeast(1)
                                            val fraction = if (resume && entry.durationMs > 0L) {
                                                (entry.positionMs.toFloat() / entry.durationMs.toFloat()).coerceIn(0f, 1f)
                                            } else {
                                                0f
                                            }
                                            val left = if (resume) {
                                                minutesLeft(entry.positionMs, entry.durationMs)
                                            } else {
                                                null
                                            }
                                            val key = coverKey("poster", entry.anilistId, "continue")
                                            HomeContinueCard(
                                                id = entry.anilistId,
                                                title = entry.title,
                                                imageUrl = entry.coverImageUrl,
                                                label = buildString {
                                                    append("Episode $target")
                                                    if (left != null) append(" · $left min left")
                                                },
                                                progress = fraction,
                                                coverKey = key,
                                                onClick = {
                                                    scope.launch {
                                                        val detail = aniList.media(entry.anilistId)
                                                            ?: AnimeSummary(
                                                                id = entry.anilistId,
                                                                title = entry.title,
                                                                coverImageUrl = entry.coverImageUrl,
                                                                episodes = null,
                                                                format = null,
                                                                averageScore = null,
                                                                malId = entry.malId,
                                                            )
                                                        val total = detail.releasedEpisodeCount().takeIf { it > 0 }
                                                        val play = if (total != null) {
                                                            target.coerceAtMost(total)
                                                        } else {
                                                            target
                                                        }
                                                        onOpen(detail, play, key)
                                                    }
                                                },
                                            )
                                        },
                                    )
                                }
                            }
                            "airing" -> if (airingToday.isNotEmpty()) item {
                                val now = System.currentTimeMillis() / 1000L
                                val upcoming = airingToday.filter { it.airingAtEpochSec >= now - 20 * 60 }
                                val shown = (if (upcoming.isNotEmpty()) upcoming else airingToday).take(5)
                                HomeBlock(
                                    title = "Airing today",
                                    onMore = onOpenSchedule,
                                ) {
                                    HomeAiringRow(
                                        shown.map { slot ->
                                            val key = coverKey("poster", slot.anime.id, "airing")
                                            HomeAiringCard(
                                                key = "${slot.anime.id}-${slot.episode}-${slot.airingAtEpochSec}",
                                                title = slot.anime.title,
                                                imageUrl = slot.anime.coverImageUrl,
                                                whenLabel = airingLabel(
                                                    slot.airingAtEpochSec,
                                                    now,
                                                    airingClock.format(java.util.Date(slot.airingAtEpochSec * 1000L)),
                                                ),
                                                episodeLabel = "Episode ${slot.episode}",
                                                coverKey = key,
                                                onClick = { openCatalog(slot.anime, key) },
                                            )
                                        },
                                    )
                                }
                            }
                            "season" -> if (seasonal.isNotEmpty()) item {
                                HomeBlock(
                                    title = "This season",
                                    onMore = onOpenSchedule,
                                ) {
                                    HomePosterGrid(items = seasonal.take(9), slot = "season", onOpen = openCatalog)
                                }
                            }
                            "foryou" -> if (forYou.isNotEmpty()) item {
                                HomeBlock(
                                    title = "For you",
                                    subtitle = forYouFrom?.let { "Because you watch $it" },
                                ) {
                                    HomePosterRow(items = forYou, slot = "foryou", onOpen = openCatalog)
                                }
                            }
                            "plan" -> if (planToWatch.isNotEmpty()) item {
                                HomeBlock(title = "Plan to watch") {
                                    HomePosterRow(
                                        slot = "plan",
                                        items = planToWatch.map { entry ->
                                            AnimeSummary(
                                                id = entry.anilistId,
                                                title = entry.title,
                                                coverImageUrl = entry.coverImageUrl,
                                                episodes = null,
                                                format = null,
                                                averageScore = null,
                                                malId = entry.malId,
                                            )
                                        },
                                        onOpen = { anime, key ->
                                            scope.launch {
                                                onOpen(aniList.media(anime.id) ?: anime, null, key)
                                            }
                                        },
                                    )
                                }
                            }
                            "genres" -> item {
                                HomeBlock(title = "Genres") {
                                    HomeGenreRow(
                                        names = listOf(
                                            "Action",
                                            "Romance",
                                            "Fantasy",
                                            "Comedy",
                                            "Drama",
                                            "Adventure",
                                            "Mystery",
                                            "Slice of Life",
                                        ),
                                        onOpen = onOpenGenre,
                                    )
                                }
                            }
                        }
                    }
                    if (phoneSections.none { it.enabled }) {
                        item {
                            Text(
                                "Every home row is turned off. Turn them back on in Settings.",
                                color = KittyMuted,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                            )
                        }
                    }
                }
            }
        }
    }
}

/** Resume the episode still in progress; otherwise play the one after the last finished. */
private fun playbackTarget(entry: WatchHistoryEntity): Int {
    val stored = entry.episode.coerceAtLeast(1)
    val hasDuration = entry.durationMs > 30_000L
    val ratio = if (hasDuration) entry.positionMs.toFloat() / entry.durationMs.toFloat() else 0f
    val inProgress = hasDuration && entry.positionMs >= 15_000L && ratio < 0.9f
    return if (inProgress) stored else stored + 1
}
