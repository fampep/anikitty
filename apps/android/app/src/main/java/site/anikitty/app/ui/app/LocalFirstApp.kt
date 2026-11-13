// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.activity.compose.BackHandler
import android.content.Intent
import android.net.Uri
import android.webkit.WebChromeClient
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
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
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material.icons.filled.CalendarMonth
import androidx.compose.material.icons.filled.DateRange
import androidx.compose.material.icons.automirrored.filled.FormatListBulleted
import androidx.compose.material.icons.filled.Info
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Favorite
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.Movie
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
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
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import coil.compose.AsyncImage
import coil.imageLoader
import coil.request.ImageRequest
import coil.request.SuccessResult
import androidx.core.graphics.drawable.toBitmap
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
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText

private sealed class Screen {
    data object Tabs : Screen()
    data class Detail(val anime: AnimeSummary, val startEpisode: Int? = null) : Screen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
    ) : Screen()
    data object Schedule : Screen()
    data object Builds : Screen()
}

@Composable
fun LocalFirstApp(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    accountLabel: String,
    pendingAniListToken: String? = null,
    pendingAniListError: String? = null,
    onConsumedAniListToken: () -> Unit = {},
    onAniListReady: () -> Unit = {},
    onSignOut: () -> Unit,
) {
    val context = LocalContext.current
    val homeLayout = remember { HomeLayoutStore(context) }
    // Tab survives recreation; detail/player stack relies on configChanges in the manifest
    // so landscape lock in PlayerScreen does not wipe navigation.
    var tab by rememberSaveable {
        mutableStateOf("home")
    }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }
    var searchGenre by remember { mutableStateOf<String?>(null) }
    var libraryFilter by rememberSaveable { mutableStateOf("all") }
    /** Prior detail frames when drilling into related / other seasons. */
    var detailBackStack by remember { mutableStateOf<List<Screen.Detail>>(emptyList()) }
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val listMarks = remember(history) {
        history.associate { entry ->
            entry.anilistId to (listStatusBadge(entry.listStatus) ?: "On list")
        }
    }
    val followedEpisodes = remember(history) {
        history.associate { it.anilistId to it.episodesFinished() }
    }
    val scope = rememberCoroutineScope()
    var syncLabel by remember { mutableStateOf<String?>(null) }
    var aniLinkStatus by remember { mutableStateOf<String?>(null) }
    var aniLinkTick by remember { mutableIntStateOf(0) }
    var openAccountTick by remember { mutableIntStateOf(0) }

    fun openDetail(anime: AnimeSummary, startEpisode: Int? = null, pushCurrent: Boolean = false) {
        val next = Screen.Detail(anime, startEpisode)
        if (pushCurrent) {
            val current = screen
            if (current is Screen.Detail) {
                detailBackStack = detailBackStack + current
            }
        } else {
            detailBackStack = emptyList()
        }
        screen = next
    }

    fun popDetailOrTabs() {
        val prior = detailBackStack.lastOrNull()
        if (prior != null) {
            detailBackStack = detailBackStack.dropLast(1)
            screen = prior
        } else {
            screen = Screen.Tabs
        }
    }

    // Apply OAuth callbacks at app-root (not only Account). Custom Tabs / singleTop
    // often resume on Home — keep the token until this effect consumes it.
    LaunchedEffect(pendingAniListToken, pendingAniListError) {
        when {
            !pendingAniListError.isNullOrBlank() -> {
                aniLinkStatus = "AniList: $pendingAniListError"
                screen = Screen.Tabs
                tab = "settings"
                openAccountTick++
                onConsumedAniListToken()
            }
            !pendingAniListToken.isNullOrBlank() -> {
                screen = Screen.Tabs
                tab = "settings"
                openAccountTick++
                if (aniListAuth.isLinked) {
                    onAniListReady()
                    aniLinkStatus = "Signed in as @${aniListAuth.username ?: "anilist"}"
                    onConsumedAniListToken()
                } else {
                    aniLinkStatus = "Signing in…"
                    aniLinkStatus = runCatching {
                        val viewer = aniList.viewer(pendingAniListToken)
                            ?: error("AniList did not accept that sign-in")
                        aniListAuth.saveViewer(pendingAniListToken, viewer)
                        onAniListReady()
                        val synced = runCatching { aniListSync.pull() }.getOrNull()
                        aniLinkTick++
                        if (synced != null) {
                            syncLabel = "Synced ${synced.imported} from AniList"
                            "Signed in as @${viewer.name}"
                        } else {
                            "Signed in as @${viewer.name}"
                        }
                    }.getOrElse { e -> "Error: ${e.message}" }
                    onConsumedAniListToken()
                }
            }
        }
    }

    // Pull AniList list on enter + every few minutes while the app is open.
    LaunchedEffect(aniListAuth.isLinked, aniLinkTick) {
        if (!aniListAuth.isLinked) return@LaunchedEffect
        while (true) {
            runCatching {
                val result = aniListSync.pull()
                syncLabel = "Synced ${result.imported} from AniList"
            }.onFailure { e ->
                syncLabel = e.message
            }
            delay(5 * 60_000L)
        }
    }

    val tabs = remember {
        listOf(
            KittyNavTab("home", "Home", FluentuiSystemIconsHomeOutline, FluentuiSystemIconsHomeFilled),
            KittyNavTab("search", "Search", FluentuiSystemIconsSearchSparkleOutline, FluentuiSystemIconsSearchSparkleOutline),
            KittyNavTab("schedule", "Schedule", FluentuiSystemIconsCalendarClockOutline, FluentuiSystemIconsCalendarClockFilled),
            KittyNavTab("history", "My Space", FluentuiSystemIconsPersonOutline, FluentuiSystemIconsPersonFilled),
        )
    }

    when (val current = screen) {
        is Screen.Player -> {
            var resumeMs by remember(current.anime.id, current.episode) { mutableStateOf(0L) }
            var watchedThrough by remember(current.anime.id) {
                mutableIntStateOf(current.anime.listState?.progress ?: 0)
            }
            var playerAudio by remember {
                mutableStateOf(
                    context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
                        .getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub",
                )
            }
            fun openResolved(nextEpisode: Int, nextAudio: String) {
                scope.launch {
                    context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
                        .edit()
                        .putString("audio", nextAudio)
                        .apply()
                    playerAudio = nextAudio
                    runCatching {
                        val resolved = streamServers.resolveWithFailover(
                            anilistId = current.anime.id,
                            episode = nextEpisode,
                            audio = nextAudio,
                            titleHint = current.anime.streamTitleHint(),
                        )
                        val existing = historyDao.get(current.anime.id)
                        historyDao.upsert(
                            WatchHistoryEntity(
                                anilistId = current.anime.id,
                                title = current.anime.title,
                                coverImageUrl = current.anime.coverImageUrl,
                                episode = nextEpisode,
                                positionMs = 0L,
                                durationMs = 0L,
                                updatedAtEpochMs = System.currentTimeMillis(),
                                listStatus = existing?.listStatus ?: "CURRENT",
                                malId = current.anime.malId ?: existing?.malId,
                            ),
                        )
                        if (aniListAuth.isLinked) {
                            aniListSync.pushProgress(
                                anilistId = current.anime.id,
                                episode = nextEpisode,
                                totalEpisodes = current.anime.episodes,
                            )
                        }
                        screen = Screen.Player(current.anime, nextEpisode, resolved.sources)
                    }
                }
            }
            LaunchedEffect(current.anime.id, current.episode) {
                val entry = historyDao.get(current.anime.id)
                if (entry != null && entry.episode == current.episode && entry.positionMs > 2_000L) {
                    resumeMs = entry.positionMs
                }
                watchedThrough = maxOf(
                    current.anime.listState?.progress ?: 0,
                    (entry?.episode ?: 1) - 1,
                ).coerceAtLeast(0)
                // Push episode progress to AniList when opening / advancing.
                if (aniListAuth.isLinked) {
                    aniListSync.pushProgress(
                        anilistId = current.anime.id,
                        episode = current.episode,
                        totalEpisodes = current.anime.episodes,
                    )
                }
            }
            PlayerScreen(
                title = current.anime.title,
                episode = current.episode,
                sources = current.sources,
                anilistId = current.anime.id,
                titleHint = current.anime.streamTitleHint(),
                loadSkip = streamServers::anikotoSkipTimes,
                startPositionMs = resumeMs,
                onClose = {
                    // Return to detail for this title without wiping related back-stack.
                    screen = Screen.Detail(current.anime, current.episode)
                },
                onProgress = { pos, dur ->
                    scope.launch {
                        val existing = historyDao.get(current.anime.id)
                        historyDao.upsert(
                            WatchHistoryEntity(
                                anilistId = current.anime.id,
                                title = current.anime.title,
                                coverImageUrl = current.anime.coverImageUrl
                                    ?: existing?.coverImageUrl,
                                episode = current.episode,
                                positionMs = pos,
                                durationMs = dur,
                                updatedAtEpochMs = System.currentTimeMillis(),
                                listStatus = existing?.listStatus ?: "CURRENT",
                                malId = current.anime.malId ?: existing?.malId,
                            ),
                        )
                    }
                },
                onNextEpisode = run {
                    val released = current.anime.releasedEpisodeCount()
                    val hasNext = released <= 0 || current.episode < released
                    if (!hasNext) null else {
                        { openResolved(current.episode + 1, playerAudio) }
                    }
                },
                totalEpisodes = current.anime.releasedEpisodeCount().coerceAtLeast(current.episode),
                watchedThrough = watchedThrough,
                audio = playerAudio,
                isMovie = current.anime.format.equals("MOVIE", ignoreCase = true),
                onPickEpisode = { picked ->
                    if (picked != current.episode) openResolved(picked, playerAudio)
                },
                onPickAudio = { picked ->
                    if (picked != playerAudio) openResolved(current.episode, picked)
                },
            )
            return
        }
        Screen.Schedule -> {
            ScheduleFeed(
                aniList = aniList,
                onBack = { screen = Screen.Tabs },
                onOpen = { openDetail(it) },
                followedEpisodes = followedEpisodes,
            )
            return
        }
        Screen.Builds -> {
            BuildChannelPage(onBack = { screen = Screen.Tabs })
            return
        }
        is Screen.Detail -> {
            TitleDetailScreen(
                anime = current.anime,
                initialEpisode = current.startEpisode,
                streamServers = streamServers,
                historyDao = historyDao,
                aniList = aniList,
                onBack = { popDetailOrTabs() },
                onChangeSource = {
                    detailBackStack = emptyList()
                    screen = Screen.Tabs
                    tab = "store"
                },
                onOpenRelated = { related ->
                    openDetail(related, pushCurrent = true)
                },
                onOpenGenre = { genre ->
                    searchGenre = genre
                    detailBackStack = emptyList()
                    screen = Screen.Tabs
                    tab = "search"
                },
                aniListAuth = aniListAuth,
                onPlay = { episode, sources, resolvedAnime ->
                    screen = Screen.Player(resolvedAnime, episode, sources)
                },
            )
            return
        }
        Screen.Tabs -> Unit
    }

    @Composable
    fun PhoneTabs(modifier: Modifier) {
        AnimatedContent(
            targetState = tab,
            transitionSpec = {
                val order = listOf("home", "search", "schedule", "history", "settings", "store")
                val forward = order.indexOf(targetState).coerceAtLeast(0) >=
                    order.indexOf(initialState).coerceAtLeast(0)
                val dir = if (forward) 1 else -1
                (slideInHorizontally(tween(280)) { it / 8 * dir } + fadeIn(tween(220))) togetherWith
                    (slideOutHorizontally(tween(200)) { -it / 10 * dir } + fadeOut(tween(160)))
            },
            label = "tabFade",
            modifier = modifier,
        ) { currentTab ->
            when (currentTab) {
                "home" -> HomeFeed(
                    aniList = aniList,
                    aniListAuth = aniListAuth,
                    history = history,
                    historyDao = historyDao,
                    onOpen = { anime, ep -> openDetail(anime, ep) },
                    onOpenGenre = { genre ->
                        searchGenre = genre
                        tab = "search"
                    },
                    onOpenSchedule = {
                        screen = Screen.Tabs
                        tab = "schedule"
                    },
                    onOpenAccount = { tab = "settings" },
                    homeLayout = homeLayout,
                )
                "schedule" -> ScheduleFeed(
                    aniList = aniList,
                    onBack = { tab = "home" },
                    onOpen = { openDetail(it) },
                    showBack = false,
                    bottomInset = 100.dp,
                    followedEpisodes = followedEpisodes,
                )
                "search" -> SearchFeed(
                    aniList = aniList,
                    historyDao = historyDao,
                    requestedGenre = searchGenre,
                    onRequestedGenreConsumed = { searchGenre = null },
                    listMarks = listMarks,
                    onOpen = { openDetail(it) },
                )
                "store" -> ExtensionStoreFeed(catalog = streamServers)
                "history" -> MySpaceFeed(
                    history = history,
                    historyDao = historyDao,
                    aniList = aniList,
                    aniListLinked = aniListAuth.isLinked,
                    accessToken = aniListAuth.accessToken,
                    accountLabel = accountLabel,
                    syncLabel = syncLabel,
                    libraryFilter = libraryFilter,
                    onSync = {
                        scope.launch {
                            syncLabel = "Syncing…"
                            syncLabel = runCatching {
                                val result = aniListSync.pull()
                                "Synced ${result.imported} from AniList"
                            }.getOrElse { e -> e.message }
                        }
                    },
                    onOpen = { openDetail(it) },
                    onOpenAccount = { tab = "settings" },
                    onSignOut = onSignOut,
                    avatarUrl = aniListAuth.avatarUrl,
                )
                "settings" -> SettingsFeed(
                    catalog = streamServers,
                    aniList = aniList,
                    aniListAuth = aniListAuth,
                    aniListSync = aniListSync,
                    accountLabel = accountLabel,
                    syncLabel = syncLabel,
                    onSyncLabel = { syncLabel = it },
                    linkStatus = aniLinkStatus,
                    onLinkStatus = { aniLinkStatus = it },
                    linkTick = aniLinkTick,
                    onLinkTick = { aniLinkTick++ },
                    onAccountReady = onAniListReady,
                    onSignOut = onSignOut,
                    onOpenStore = { tab = "store" },
                    onOpenBuilds = { screen = Screen.Builds },
                    openAccountTick = openAccountTick,
                    onOpenLibrary = { filter ->
                        libraryFilter = filter
                        screen = Screen.Tabs
                        tab = "history"
                    },
                    homeLayout = homeLayout,
                )
            }
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        KittyAtmosphere()
        PhoneTabs(Modifier.fillMaxSize())
        val profileAvatar = aniLinkTick.let { aniListAuth.avatarUrl }
        KittyBottomNav(
            tabs = tabs,
            selectedId = if (tab == "settings" || tab == "store") "history" else tab,
            profileTabId = "history",
            profileImageUrl = profileAvatar,
            onSelect = { tab = it },
            modifier = Modifier.align(Alignment.BottomCenter),
        )
    }
}

@Composable
private fun HomeFeed(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?) -> Unit,
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

    val openCatalog: (AnimeSummary) -> Unit = { anime ->
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, null)
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        when {
            loading && trending.isEmpty() -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    HomeBar(
                        onRefresh = { reload(fromPull = true) },
                        refreshBusy = catalogBusy,
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
                                HomeBlock(
                                    title = "Continue watching",
                                    subtitle = "Pick up where you left off",
                                ) {
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
                                            HomeContinueCard(
                                                id = entry.anilistId,
                                                title = entry.title,
                                                imageUrl = entry.coverImageUrl,
                                                label = buildString {
                                                    append("Episode $target")
                                                    if (left != null) append(" · $left min left")
                                                },
                                                progress = fraction,
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
                                                        onOpen(detail, play)
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
                                val shown = (if (upcoming.isNotEmpty()) upcoming else airingToday).take(12)
                                HomeBlock(
                                    title = "Airing today",
                                    subtitle = "What comes on next",
                                    onMore = onOpenSchedule,
                                ) {
                                    HomeAiringRow(
                                        shown.map { slot ->
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
                                                onClick = { openCatalog(slot.anime) },
                                            )
                                        },
                                    )
                                }
                            }
                            "season" -> if (seasonal.isNotEmpty()) item {
                                HomeBlock(
                                    title = "This season",
                                    subtitle = "Airing now",
                                    onMore = onOpenSchedule,
                                ) {
                                    HomePosterRow(items = seasonal, onOpen = openCatalog)
                                }
                            }
                            "foryou" -> if (forYou.isNotEmpty()) item {
                                HomeBlock(
                                    title = "For you",
                                    subtitle = forYouFrom?.let { "Because you watch $it" }
                                        ?: "From what you have been watching",
                                ) {
                                    HomePosterRow(items = forYou, onOpen = openCatalog)
                                }
                            }
                            "plan" -> if (planToWatch.isNotEmpty()) item {
                                HomeBlock(
                                    title = "Plan to watch",
                                    subtitle = "Saved for later",
                                ) {
                                    HomePosterRow(
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
                                        onOpen = { anime ->
                                            scope.launch {
                                                onOpen(aniList.media(anime.id) ?: anime, null)
                                            }
                                        },
                                    )
                                }
                            }
                            "genres" -> item {
                                HomeBlock(
                                    title = "Genres",
                                    subtitle = "Open a shelf in search",
                                ) {
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

private fun listStatusBadge(status: String?): String? = when (status?.uppercase()) {
    "CURRENT", "REPEATING" -> "Watching"
    "COMPLETED" -> "Done"
    "PLANNING" -> "Plan"
    "PAUSED" -> "Paused"
    "DROPPED" -> "Dropped"
    else -> null
}


@Composable
private fun HistoryFeed(
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
                listOf("recent" to "Recent", "title" to "A–Z", "episode" to "Episode").forEach { (id, label) ->
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
                if (isNotEmpty()) append(" · ")
                append(left)
                append(" min left")
            }
            watchedAgo(entry.updatedAtEpochMs).takeIf { it.isNotEmpty() }?.let { ago ->
                if (isNotEmpty()) append(" · ")
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
    val score = if (auth.meanScore <= 0f) "—" else auth.meanScore.toInt().toString()
    val syncing = syncLabel == "Syncing…"
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
                                        onSyncLabel("Syncing…")
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

@Composable
private fun TitleDetailScreen(
    anime: AnimeSummary,
    initialEpisode: Int?,
    streamServers: ServerCatalog,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    onBack: () -> Unit,
    onChangeSource: () -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
    onOpenGenre: (String) -> Unit,
    aniListAuth: AniListAuthStore,
    onPlay: (episode: Int, sources: List<PlayableSource>, anime: AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    val selectedId by streamServers.selectedId.collectAsState()
    val resolvers by streamServers.resolvers.collectAsState()
    val activeServer = remember(selectedId, resolvers) {
        resolvers.firstOrNull { it.server.id == selectedId }?.server
            ?: resolvers.firstOrNull()?.server
    }
    // Keyed by anime.id so related/season navigation never reuses prior episode/audio/comments.
    var detail by remember(anime.id) { mutableStateOf(anime) }
    var episode by remember(anime.id) { mutableIntStateOf(initialEpisode ?: 1) }
    var epJump by remember(anime.id) { mutableStateOf("") }
    val watchPrefs = remember {
        context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
    }
    var audio by remember(anime.id) {
        mutableStateOf(watchPrefs.getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub")
    }
    var resolving by remember(anime.id) { mutableStateOf(false) }
    var status by remember(anime.id) { mutableStateOf<String?>(null) }
    var listBadge by remember(anime.id) { mutableStateOf<String?>(null) }
    var listStatus by remember(anime.id) { mutableStateOf<String?>(null) }
    var listScore by remember(anime.id) { mutableIntStateOf(0) }
    var favourite by remember(anime.id) { mutableStateOf(anime.isFavourite) }
    var listBusy by remember(anime.id) { mutableStateOf(false) }
    var lastWatchedEp by remember(anime.id) { mutableIntStateOf(0) }
    var synopsisExpanded by remember(anime.id) { mutableStateOf(false) }
    var heroColor by remember(anime.id) { mutableStateOf(Color.Black) }
    var trailerPlaying by remember(anime.id) { mutableStateOf(false) }
    var detailLoading by remember(anime.id) { mutableStateOf(!anime.detailLoaded) }
    var episodeList by remember(anime.id) { mutableStateOf(anime.episodeItems()) }
    val maxEp = episodeList.maxOfOrNull { it.number }?.coerceAtLeast(1) ?: 1
    val episodePageSize = 100
    val rangeCount = ((maxEp + episodePageSize - 1) / episodePageSize).coerceAtLeast(1)
    var browseRange by remember(anime.id) { mutableIntStateOf(0) }
    val seasonTabs = remember(detail) { detail.seasonEntries() }
    val shownEpisodeCount = detail.releasedEpisodeCount().takeIf { it > 0 }
        ?: maxEp.takeIf {
            detail.detailLoaded && (detail.streamingEpisodes.isNotEmpty() || maxEp > 1)
        }

    LaunchedEffect(detail) {
        episodeList = detail.episodeItems()
    }
    LaunchedEffect(detail.bannerImageUrl, detail.coverImageUrl) {
        val imageUrl = detail.bannerImageUrl ?: detail.coverImageUrl ?: return@LaunchedEffect
        val result = runCatching {
            context.imageLoader.execute(
                ImageRequest.Builder(context)
                    .data(imageUrl)
                    .allowHardware(false)
                    .size(48)
                    .build(),
            )
        }.getOrNull()
        val bitmap = (result as? SuccessResult)?.drawable?.toBitmap() ?: return@LaunchedEffect
        heroColor = sampleBitmapColor(bitmap)
    }
    LaunchedEffect(anime.id, episode, rangeCount) {
        browseRange = ((episode - 1) / episodePageSize).coerceIn(0, (rangeCount - 1).coerceAtLeast(0))
    }

    LaunchedEffect(anime.id, initialEpisode) {
        detail = anime
        detailLoading = !anime.detailLoaded
        resolving = false
        status = null
        synopsisExpanded = false
        val history = historyDao.get(anime.id)
        lastWatchedEp = history?.episode ?: 0
        episode = when {
            initialEpisode != null -> initialEpisode.coerceAtLeast(1)
            history?.episode != null -> history.episode.coerceAtLeast(1)
            else -> 1
        }
        audio = watchPrefs.getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub"
        listStatus = history?.listStatus
        listBadge = listStatusBadge(history?.listStatus)
        favourite = anime.isFavourite
        if (!anime.detailLoaded || aniListAuth.isLinked) {
            runCatching { aniList.media(anime.id, aniListAuth.accessToken) }
                .onSuccess { full ->
                    if (full != null) {
                        detail = full
                        favourite = full.isFavourite
                        full.listState?.let { entry ->
                            listStatus = entry.status
                            listScore = entry.score
                            listBadge = listStatusBadge(entry.status)
                        }
                        val freshMax = full.episodeItems().size.coerceAtLeast(1)
                        episode = episode.coerceIn(1, freshMax)
                    }
                }
            detailLoading = false
        } else {
            detailLoading = false
        }
    }

    fun rememberListLocally(status: String, progress: Int) {
        scope.launch {
            val existing = historyDao.get(detail.id)
            val now = System.currentTimeMillis()
            if (existing != null) {
                historyDao.upsert(
                    existing.copy(
                        listStatus = status,
                        title = detail.title,
                        coverImageUrl = detail.coverImageUrl ?: existing.coverImageUrl,
                        updatedAtEpochMs = now,
                    ),
                )
            } else {
                historyDao.upsert(
                    WatchHistoryEntity(
                        anilistId = detail.id,
                        title = detail.title,
                        coverImageUrl = detail.coverImageUrl,
                        episode = progress.coerceAtLeast(1),
                        positionMs = 0L,
                        durationMs = 0L,
                        updatedAtEpochMs = now,
                        listStatus = status,
                        malId = detail.malId,
                    ),
                )
            }
        }
    }

    fun applyListStatus(next: String) {
        val token = aniListAuth.accessToken ?: return
        if (listBusy) return
        val previous = listStatus
        listBusy = true
        listStatus = next
        listBadge = listStatusBadge(next)
        scope.launch {
            val total = detail.episodes
            val ok = if (next == "COMPLETED" && total != null && total > 0) {
                aniList.saveProgress(token, detail.id, total, "COMPLETED")
            } else {
                aniList.saveList(token, detail.id, status = next)
            }
            listBusy = false
            if (ok) {
                rememberListLocally(next, if (next == "COMPLETED") total ?: lastWatchedEp else lastWatchedEp)
            } else {
                listStatus = previous
                listBadge = listStatusBadge(previous)
                status = "Could not update your list"
            }
        }
    }

    fun applyScore(point: Int) {
        val token = aniListAuth.accessToken ?: return
        if (listBusy) return
        val nextScore = if (listScore / 10 == point) 0 else point * 10
        val previous = listScore
        listBusy = true
        listScore = nextScore
        scope.launch {
            val ok = aniList.saveList(token, detail.id, score = nextScore)
            listBusy = false
            if (!ok) {
                listScore = previous
                status = "Could not save your score"
            }
        }
    }

    fun toggleFavourite() {
        val token = aniListAuth.accessToken ?: return
        val next = !favourite
        favourite = next
        scope.launch {
            val ok = runCatching { aniList.toggleFavourite(token, detail.id) }.isSuccess
            if (!ok) favourite = !next
        }
    }

    fun playSelected() {
        scope.launch {
            resolving = true
            status = "Getting stream…"
            runCatching {
                historyDao.touchFromCatalog(detail)
                val resolved = streamServers.resolveWithFailover(
                    anilistId = detail.id,
                    episode = episode,
                    audio = audio,
                    titleHint = detail.streamTitleHint(),
                    onAttempt = { name, index, total ->
                        status = if (total <= 1) {
                            "Getting stream via $name…"
                        } else {
                            "Trying $name (${index + 1}/$total)…"
                        }
                    },
                )
                historyDao.get(detail.id)?.let {
                    historyDao.upsert(
                        it.copy(
                            episode = episode,
                            updatedAtEpochMs = System.currentTimeMillis(),
                        ),
                    )
                }
                lastWatchedEp = episode
                onPlay(episode, resolved.sources, detail)
                status = if (resolved.usedFallback) {
                    "Playing via ${resolved.server.name}"
                } else {
                    null
                }
            }.onFailure {
                status = it.message ?: "All installed providers failed"
            }
            resolving = false
        }
    }

    fun openUrl(url: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    Box(modifier = Modifier.fillMaxSize().background(Color.Black)) {
        LazyColumn(contentPadding = PaddingValues(bottom = 148.dp)) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(300.dp),
                ) {
                    AsyncImage(
                        model = detail.bannerImageUrl ?: detail.coverImageUrl,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(
                                        heroColor.copy(alpha = 0.6f),
                                        heroColor.copy(alpha = 0.2f),
                                        Color.Transparent,
                                        Color.Black.copy(alpha = 0.5f),
                                        Color.Black,
                                    ),
                                ),
                            ),
                    )
                }
            }
            item {
                Column(
                    modifier = Modifier
                        .offset(y = (-45).dp)
                        .padding(horizontal = 24.dp),
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.spacedBy(20.dp),
                    ) {
                        AsyncImage(
                            model = detail.coverImageUrl,
                            contentDescription = detail.title,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .width(110.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(12.dp))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                .background(Color(0xFF0C0C10)),
                        )
                        Column(
                            modifier = Modifier.weight(1f),
                            verticalArrangement = Arrangement.spacedBy(4.dp),
                        ) {
                            Row(
                                verticalAlignment = Alignment.CenterVertically,
                                horizontalArrangement = Arrangement.spacedBy(6.dp),
                            ) {
                                detail.format?.takeIf { it.isNotBlank() }?.let { format ->
                                    Text(
                                        format,
                                        color = Color.White.copy(alpha = 0.5f),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                    )
                                    Box(
                                        modifier = Modifier
                                            .size(2.dp)
                                            .clip(CircleShape)
                                            .background(Color.White.copy(alpha = 0.2f)),
                                    )
                                }
                                detail.statusLabel()?.let { statusLabel ->
                                    val airing = detail.status.equals("RELEASING", true)
                                    Text(
                                        statusLabel,
                                        color = if (airing) Color.White else Color.White.copy(alpha = 0.4f),
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 11.sp,
                                    )
                                }
                            }
                            listBadge?.let { badge ->
                                Text(
                                    badge,
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 11.sp,
                                )
                            }
                            Text(
                                detail.title,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 22.sp,
                                lineHeight = 26.sp,
                                letterSpacing = (-0.4).sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            detail.studios.firstOrNull()?.let { studio ->
                                Text(
                                    studio,
                                    color = Color.White.copy(alpha = 0.4f),
                                    fontSize = 12.sp,
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            detail.nextAiring?.let { next ->
                                val left = (next.airingAtEpochSec - System.currentTimeMillis() / 1000L).coerceAtLeast(0L)
                                val days = left / 86_400
                                val hours = (left % 86_400) / 3_600
                                val countdown = if (days > 0) "${days}d ${hours}h" else "${hours}h"
                                Row(
                                    verticalAlignment = Alignment.CenterVertically,
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(Color.White.copy(alpha = 0.12f))
                                        .padding(horizontal = 8.dp, vertical = 3.dp),
                                ) {
                                    Icon(
                                        Icons.Filled.CalendarMonth,
                                        contentDescription = null,
                                        tint = Color.White,
                                        modifier = Modifier.size(10.dp),
                                    )
                                    Spacer(modifier = Modifier.width(4.dp))
                                    Text(
                                        "EP ${next.episode}: $countdown",
                                        color = Color.White,
                                        fontWeight = FontWeight.Bold,
                                        fontSize = 9.sp,
                                    )
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Button(
                            onClick = { playSelected() },
                            enabled = !resolving,
                            modifier = Modifier
                                .weight(1f)
                                .height(48.dp),
                            shape = RoundedCornerShape(16.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black,
                            ),
                        ) {
                            Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                            Spacer(modifier = Modifier.width(8.dp))
                            Text(
                                when {
                                    lastWatchedEp > 0 -> "Play Ep. $episode"
                                    else -> "Play now"
                                },
                                fontWeight = FontWeight.SemiBold,
                                color = Color.Black,
                            )
                        }
                        if (aniListAuth.isLinked) {
                            Box(
                                modifier = Modifier
                                    .size(48.dp)
                                    .spacePress { toggleFavourite() }
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(Color(0xFF0C0C10))
                                    .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp)),
                                contentAlignment = Alignment.Center,
                            ) {
                                Icon(
                                    if (favourite) Icons.Filled.Favorite else Icons.Outlined.FavoriteBorder,
                                    contentDescription = if (favourite) "Remove favourite" else "Favourite",
                                    tint = if (favourite) Color.White else Color.White.copy(alpha = 0.7f),
                                )
                            }
                        }
                    }
                    if (aniListAuth.isLinked) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            listOf(
                                "CURRENT" to "Watching",
                                "PLANNING" to "Plan",
                                "PAUSED" to "Paused",
                                "COMPLETED" to "Done",
                                "DROPPED" to "Dropped",
                            ).forEach { (value, label) ->
                                Chip(label, selected = listStatus.equals(value, ignoreCase = true)) {
                                    applyListStatus(value)
                                }
                            }
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                "Score",
                                color = Color.White.copy(alpha = 0.55f),
                                fontSize = 12.sp,
                                fontWeight = FontWeight.SemiBold,
                            )
                            (1..10).forEach { point ->
                                Chip(point.toString(), selected = listScore / 10 == point) {
                                    applyScore(point)
                                }
                            }
                        }
                    }
                }
            }
            item {
                val score = detail.averageScore
                val scoreColor = when {
                    score != null && score > 75 -> Color(0xFF4CAF50)
                    score != null && score > 50 -> Color(0xFFFFC107)
                    else -> Color.White
                }
                val movie = detail.format.equals("MOVIE", true)
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(Color(0xFF0C0C10))
                        .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                        .padding(horizontal = 12.dp, vertical = 14.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    DetailStat(
                        value = score?.let { "$it%" } ?: "--",
                        label = "Score",
                        icon = Icons.Filled.Star,
                        color = scoreColor,
                    )
                    DetailStatDivider()
                    DetailStat(
                        value = if (movie) {
                            "${detail.durationMinutes ?: "--"}m"
                        } else {
                            shownEpisodeCount?.let { "$it EP" } ?: "--"
                        },
                        label = if (movie) "Duration" else "Episodes",
                        icon = if (movie) Icons.Filled.Movie else Icons.AutoMirrored.Filled.FormatListBulleted,
                    )
                    DetailStatDivider()
                    DetailStat(
                        value = detail.seasonYear?.toString() ?: "--",
                        label = "Year",
                        icon = Icons.Filled.CalendarMonth,
                    )
                    DetailStatDivider()
                    DetailStat(
                        value = detail.format ?: "TV",
                        label = "Format",
                        icon = Icons.Filled.Info,
                    )
                }
                if (!movie && (detail.durationMinutes ?: 0) > 0) {
                    Text(
                        "About ${detail.durationMinutes} min each",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 8.dp),
                        color = Color.White.copy(alpha = 0.45f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                    )
                }
                if (listScore > 0) {
                    Text(
                        "Your score ${listScore / 10} / 10",
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(top = 6.dp),
                        color = Color.White.copy(alpha = 0.7f),
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        textAlign = TextAlign.Center,
                    )
                }
            }
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    if (
                        detail.genres.isNotEmpty() ||
                        detail.studios.isNotEmpty() ||
                        detail.popularity != null ||
                        detailLoading ||
                        !detail.seasonLabel().isNullOrBlank()
                    ) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0C0C10))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                .padding(16.dp),
                        ) {
                            Text(
                                "DETAILS",
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 1.sp,
                            )
                            if (detail.genres.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(12.dp))
                                KittyMetaChips(
                                    items = detail.genres.take(8),
                                    onItemClick = onOpenGenre,
                                )
                            }
                            val facts = listOfNotNull(
                                detail.seasonLabel(),
                                detail.statusLabel(),
                                detail.studios.takeIf { it.isNotEmpty() }?.joinToString(" · "),
                                detail.popularity?.let { "${"%,d".format(it)} on AniList" },
                            )
                            if (facts.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    facts.joinToString("  ·  "),
                                    style = MaterialTheme.typography.bodySmall,
                                    color = KittyMuted,
                                )
                            }
                            if (detailLoading) {
                                Spacer(modifier = Modifier.height(8.dp))
                                Text(
                                    "Loading AniList…",
                                    style = MaterialTheme.typography.labelSmall,
                                    color = KittyFaint,
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    detail.trailer?.let { trailer ->
                        val thumb = trailer.thumbnailUrl
                        val watch = trailer.watchUrl()
                        val youtube = trailer.site.equals("youtube", ignoreCase = true)
                        if (watch != null) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(16f / 9f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                    .clickable {
                                        if (youtube) trailerPlaying = true else openUrl(watch)
                                    },
                            ) {
                                if (youtube && trailerPlaying) {
                                    AndroidView(
                                        factory = { ctx ->
                                            WebView(ctx).apply {
                                                webViewClient = WebViewClient()
                                                webChromeClient = WebChromeClient()
                                                settings.javaScriptEnabled = true
                                                settings.mediaPlaybackRequiresUserGesture = false
                                                setBackgroundColor(android.graphics.Color.BLACK)
                                                loadUrl("https://www.youtube.com/embed/${trailer.id}?autoplay=1&playsinline=1")
                                            }
                                        },
                                        modifier = Modifier.fillMaxSize(),
                                    )
                                } else {
                                AsyncImage(
                                    model = thumb ?: detail.bannerImageUrl ?: detail.coverImageUrl,
                                    contentDescription = "Trailer",
                                    modifier = Modifier.fillMaxSize(),
                                    contentScale = ContentScale.Crop,
                                )
                                Box(
                                    modifier = Modifier
                                        .fillMaxSize()
                                        .background(Color.Black.copy(alpha = 0.35f)),
                                )
                                Box(
                                    modifier = Modifier
                                        .align(Alignment.Center)
                                        .size(52.dp)
                                        .clip(CircleShape)
                                        .background(Color.White),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Filled.PlayArrow,
                                        contentDescription = "Play trailer",
                                        tint = Color.Black,
                                        modifier = Modifier.size(28.dp),
                                    )
                                }
                                Text(
                                    "Trailer · ${trailer.site.replaceFirstChar { it.titlecase() }}",
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(12.dp)
                                        .clip(RoundedCornerShape(16.dp))
                                        .background(Color(0xFF0C0C10))
                                        .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                        .padding(horizontal = 10.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                }
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                    }

                    val watchedCount = maxOf(
                        detail.listState?.progress ?: 0,
                        (lastWatchedEp - 1).coerceAtLeast(0),
                    )
                    val totalEps = shownEpisodeCount
                    if (totalEps != null && totalEps > 0 && watchedCount > 0) {
                        val fraction = (watchedCount.toFloat() / totalEps.toFloat()).coerceIn(0f, 1f)
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0C0C10))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                .padding(14.dp),
                        ) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                            ) {
                                Text(
                                    "YOUR PROGRESS",
                                    color = Color.White.copy(alpha = 0.6f),
                                    fontWeight = FontWeight.SemiBold,
                                    fontSize = 11.sp,
                                    letterSpacing = 1.sp,
                                )
                                Text(
                                    "$watchedCount of $totalEps",
                                    color = Color.White.copy(alpha = 0.45f),
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Medium,
                                )
                            }
                            Spacer(modifier = Modifier.height(10.dp))
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .height(2.dp)
                                    .clip(RoundedCornerShape(999.dp))
                                    .background(Color.White.copy(alpha = 0.08f)),
                            ) {
                                Box(
                                    modifier = Modifier
                                        .fillMaxWidth(fraction)
                                        .height(2.dp)
                                        .background(Color.White),
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    if (!detail.description.isNullOrBlank()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .background(Color(0xFF0C0C10))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                .padding(14.dp),
                        ) {
                            Text(
                                "SYNOPSIS",
                                color = Color.White.copy(alpha = 0.6f),
                                fontSize = 11.sp,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 1.sp,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                detail.description!!,
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White.copy(alpha = 0.72f),
                                maxLines = if (synopsisExpanded) 40 else 4,
                                overflow = TextOverflow.Ellipsis,
                            )
                            Text(
                                if (synopsisExpanded) "Show less" else "Read more",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 13.sp,
                                modifier = Modifier
                                    .padding(top = 8.dp)
                                    .spacePress { synopsisExpanded = !synopsisExpanded },
                            )
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Chip("AniList", false) {
                            openUrl("https://anilist.co/anime/${detail.id}")
                        }
                        Chip("Copy title", false) {
                            clipboard.setText(AnnotatedString(detail.title))
                            status = "Title copied"
                        }
                        Chip("Share", false) {
                            val send = Intent(Intent.ACTION_SEND).apply {
                                type = "text/plain"
                                putExtra(
                                    Intent.EXTRA_TEXT,
                                    "${detail.title}\nhttps://anilist.co/anime/${detail.id}",
                                )
                            }
                            context.startActivity(Intent.createChooser(send, detail.title))
                        }
                        detail.malId?.let { mal ->
                            Chip("MyAnimeList", false) {
                                openUrl("https://myanimelist.net/anime/$mal")
                            }
                        }
                        detail.externalLinks
                            .filter { link ->
                                link.site !in setOf("AniList", "MyAnimeList")
                            }
                            .take(4)
                            .forEach { link ->
                                Chip(link.site, false) { openUrl(link.url) }
                            }
                    }

                    val relatedExtras = remember(detail) { detail.relatedOutsideSeasons() }
                    if (relatedExtras.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(20.dp))
                        Text(
                            "RELATED",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.sp,
                        )
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            "Spin-offs and more. Seasons switch below.",
                            color = Color.White.copy(alpha = 0.4f),
                            fontSize = 12.sp,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            lazyItems(relatedExtras, key = { it.id }) { rel ->
                                Column(
                                    modifier = Modifier
                                        .width(112.dp)
                                        .spacePress {
                                            onOpenRelated(
                                                AnimeSummary(
                                                    id = rel.id,
                                                    title = rel.title,
                                                    coverImageUrl = rel.coverImageUrl,
                                                    episodes = rel.episodes,
                                                    format = rel.format,
                                                    averageScore = null,
                                                    season = rel.season,
                                                    seasonYear = rel.seasonYear,
                                                ),
                                            )
                                        }
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF0C0C10))
                                        .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                        .padding(6.dp),
                                ) {
                                    AsyncImage(
                                        model = rel.coverImageUrl,
                                        contentDescription = rel.title,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFF141416)),
                                        contentScale = ContentScale.Crop,
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        rel.relationType.uppercase(),
                                        style = MaterialTheme.typography.labelSmall,
                                        color = Color.White.copy(alpha = 0.5f),
                                        fontWeight = FontWeight.SemiBold,
                                        letterSpacing = 0.6.sp,
                                        maxLines = 1,
                                    )
                                    Text(
                                        rel.title,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = KittyText,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                        lineHeight = 15.sp,
                                    )
                                    rel.seasonLabel()?.let { label ->
                                        Text(
                                            label,
                                            style = MaterialTheme.typography.labelSmall,
                                            color = KittyFaint,
                                            maxLines = 1,
                                        )
                                    }
                                }
                            }
                        }
                    }

                    if (detail.characters.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(20.dp))
                        PersonRow(title = "Characters", people = detail.characters)
                    }
                    if (detail.staff.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(16.dp))
                        PersonRow(title = "Staff", people = detail.staff)
                    }
                    if (detail.recommendations.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(20.dp))
                        Text(
                            "RECOMMENDED",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.sp,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            lazyItems(detail.recommendations, key = { "rec-${it.id}" }) { rec ->
                                Column(
                                    modifier = Modifier
                                        .width(112.dp)
                                        .spacePress { onOpenRelated(rec) }
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(Color(0xFF0C0C10))
                                        .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                                        .padding(6.dp),
                                ) {
                                    AsyncImage(
                                        model = rec.coverImageUrl,
                                        contentDescription = rec.title,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clip(RoundedCornerShape(8.dp))
                                            .background(Color(0xFF141416)),
                                        contentScale = ContentScale.Crop,
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        rec.title,
                                        style = MaterialTheme.typography.labelMedium,
                                        color = KittyText,
                                        fontWeight = FontWeight.SemiBold,
                                        maxLines = 2,
                                        overflow = TextOverflow.Ellipsis,
                                    )
                                }
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        listOf("sub" to "Subtitled", "dub" to "Dubbed").forEach { (key, label) ->
                            val selected = audio == key
                            val background by animateColorAsState(
                                if (selected) Color.White else Color(0xFF0C0C10),
                                tween(180),
                                label = "audioBg",
                            )
                            val textColor by animateColorAsState(
                                if (selected) Color.Black else Color.White.copy(alpha = 0.7f),
                                tween(180),
                                label = "audioText",
                            )
                            Box(
                                modifier = Modifier
                                    .weight(1f)
                                    .height(36.dp)
                                    .spacePress {
                                        audio = key
                                        watchPrefs.edit().putString("audio", key).apply()
                                    }
                                    .clip(RoundedCornerShape(16.dp))
                                    .background(background)
                                    .border(
                                        0.5.dp,
                                        if (selected) Color.White else Color.White.copy(alpha = 0.08f),
                                        RoundedCornerShape(16.dp),
                                    ),
                                contentAlignment = Alignment.Center,
                            ) {
                                Text(
                                    label,
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.SemiBold,
                                    color = textColor,
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    Text(
                        "SOURCE",
                        color = Color.White.copy(alpha = 0.6f),
                        fontSize = 11.sp,
                        fontWeight = FontWeight.SemiBold,
                        letterSpacing = 1.sp,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Play tries this first, then the other installed providers.",
                        color = Color.White.copy(alpha = 0.4f),
                        fontSize = 12.sp,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .spacePress(onChangeSource)
                            .clip(RoundedCornerShape(12.dp))
                            .background(Color(0xFF0C0C10))
                            .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ExtensionIcon(
                            iconUrl = activeServer?.iconUrl,
                            contentDescription = activeServer?.name,
                            size = 32.dp,
                        )
                        Spacer(modifier = Modifier.width(10.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                activeServer?.name ?: "No source",
                                color = KittyText,
                                fontWeight = FontWeight.SemiBold,
                            )
                            Text(
                                "Tap to change",
                                color = Color.White.copy(alpha = 0.45f),
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.Medium,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(22.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Box(
                            modifier = Modifier
                                .weight(1f)
                                .height(36.dp)
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color(0xFF0C0C10))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                .padding(horizontal = 12.dp),
                            contentAlignment = Alignment.CenterStart,
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                Text("#", color = Color.White.copy(alpha = 0.3f), fontSize = 11.sp, fontWeight = FontWeight.Bold)
                                Spacer(modifier = Modifier.width(4.dp))
                                BasicTextField(
                                    value = epJump,
                                    onValueChange = { next -> if (next.all { it.isDigit() }) epJump = next },
                                    textStyle = TextStyle(color = Color.White, fontSize = 11.sp, fontWeight = FontWeight.Medium),
                                    keyboardOptions = KeyboardOptions(
                                        keyboardType = KeyboardType.Number,
                                        imeAction = ImeAction.Go,
                                    ),
                                    keyboardActions = KeyboardActions(onGo = {
                                        val ep = epJump.toIntOrNull()
                                        when {
                                            ep == null -> status = "Type an episode number"
                                            ep !in 1..maxEp -> status = "Episodes only go to $maxEp"
                                            else -> {
                                                episode = ep
                                                epJump = ""
                                                status = null
                                            }
                                        }
                                    }),
                                    singleLine = true,
                                    decorationBox = { inner ->
                                        if (epJump.isEmpty()) {
                                            Text("Ep...", color = Color.White.copy(alpha = 0.3f), fontSize = 11.sp)
                                        }
                                        inner()
                                    },
                                )
                            }
                        }
                        EpisodeTool(
                            label = "Go",
                            enabled = epJump.isNotEmpty(),
                            onClick = {
                                val ep = epJump.toIntOrNull()
                                when {
                                    ep == null -> status = "Type an episode number"
                                    ep !in 1..maxEp -> status = "Episodes only go to $maxEp"
                                    else -> {
                                        episode = ep
                                        epJump = ""
                                        status = null
                                    }
                                }
                            },
                        )
                        EpisodeTool(
                            label = "Next",
                            enabled = episode < maxEp,
                            onClick = { if (episode < maxEp) episode += 1 },
                        )
                        EpisodeTool(
                            label = "Latest",
                            selected = episode == maxEp,
                            enabled = episode != maxEp,
                            onClick = { episode = maxEp },
                        )
                    }
                    Spacer(modifier = Modifier.height(14.dp))
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.spacedBy(6.dp),
                    ) {
                        Text(
                            "EPISODES",
                            color = Color.White.copy(alpha = 0.6f),
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 11.sp,
                            letterSpacing = 1.sp,
                        )
                        Text(
                            "$maxEp",
                            color = Color.White.copy(alpha = 0.45f),
                            fontWeight = FontWeight.Medium,
                            fontSize = 11.sp,
                        )
                    }
                    val selectedTitle = episodeList.firstOrNull { it.number == episode }?.title
                        ?.takeIf { it.isNotBlank() && !it.equals("Episode $episode", ignoreCase = true) }
                    if (selectedTitle != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(
                            "Ep $episode · $selectedTitle",
                            color = KittyMuted,
                            fontSize = 12.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 2,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (rangeCount > 1) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            for (index in 0 until rangeCount) {
                                val start = index * episodePageSize + 1
                                val end = minOf(maxEp, start + episodePageSize - 1)
                                SeasonRangeChip(
                                    label = "$start–$end",
                                    selected = browseRange == index,
                                    onClick = { browseRange = index },
                                )
                            }
                        }
                    }
                    if (seasonTabs.size > 1) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "SEASONS",
                            color = Color.White.copy(alpha = 0.6f),
                            fontSize = 11.sp,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 1.sp,
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            seasonTabs.forEach { season ->
                                val selectedSeason = season.id == detail.id
                                val label = buildString {
                                    append(
                                        season.seasonLabel()
                                            ?: if (season.relationType.equals("Current", true)) {
                                                "This season"
                                            } else {
                                                season.relationType
                                            },
                                    )
                                    season.episodes?.let { append(" · $it ep") }
                                }
                                SeasonRangeChip(
                                    label = label,
                                    selected = selectedSeason,
                                    onClick = {
                                        if (!selectedSeason) {
                                            onOpenRelated(
                                                AnimeSummary(
                                                    id = season.id,
                                                    title = season.title,
                                                    coverImageUrl = season.coverImageUrl,
                                                    episodes = season.episodes,
                                                    format = season.format,
                                                    averageScore = null,
                                                    season = season.season,
                                                    seasonYear = season.seasonYear,
                                                ),
                                            )
                                        }
                                    },
                                )
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    val finishedThrough = maxOf(
                        detail.listState?.progress ?: 0,
                        (lastWatchedEp - 1).coerceAtLeast(0),
                    )
                    if (finishedThrough > 0) {
                        Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                            EpisodeLegendDot(KittySurfaceElevated, "Watched")
                            EpisodeLegendDot(KittyAccent.copy(alpha = 0.22f), "Up next")
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    val columns = 6
                    val rangeStart = browseRange * episodePageSize + 1
                    val rangeEnd = minOf(maxEp, rangeStart + episodePageSize - 1)
                    episodeList.map { it.number }
                        .filter { it in rangeStart..rangeEnd }
                        .chunked(columns)
                        .forEach { rowItems ->
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(bottom = 6.dp),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                        ) {
                            rowItems.forEach { number ->
                                val selected = number == episode
                                val watched = finishedThrough > 0 && number <= finishedThrough
                                val continueEp = !watched && number == finishedThrough + 1
                                val cellBg by animateColorAsState(
                                    when {
                                        selected -> Color.White
                                        continueEp -> Color.White.copy(alpha = 0.14f)
                                        watched -> Color.White.copy(alpha = 0.04f)
                                        else -> Color(0xFF0C0C10)
                                    },
                                    tween(180),
                                    label = "epBg",
                                )
                                val cellText by animateColorAsState(
                                    when {
                                        selected -> Color.Black
                                        watched -> Color.White.copy(alpha = 0.35f)
                                        else -> Color.White.copy(alpha = 0.9f)
                                    },
                                    tween(180),
                                    label = "epText",
                                )
                                Box(
                                    modifier = Modifier
                                        .weight(1f)
                                        .aspectRatio(1f)
                                        .spacePress { episode = number }
                                        .clip(RoundedCornerShape(12.dp))
                                        .background(cellBg)
                                        .border(
                                            width = 0.5.dp,
                                            color = if (selected) Color.White else Color.White.copy(alpha = 0.08f),
                                            shape = RoundedCornerShape(12.dp),
                                        ),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Text(
                                        "$number",
                                        fontSize = 14.sp,
                                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                                        color = cellText,
                                    )
                                }
                            }
                            repeat(columns - rowItems.size) {
                                Spacer(modifier = Modifier.weight(1f))
                            }
                        }
                    }
                    if (status != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            status!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (status!!.startsWith("Getting") || status!!.startsWith("Title")) {
                                KittyMuted
                            } else {
                                MaterialTheme.colorScheme.error
                            },
                        )
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(KittyPage),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(1.dp)
                    .background(Color.White.copy(alpha = 0.08f)),
            )
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .navigationBarsPadding()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(bottom = 10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(16.dp))
                                .background(Color(0xFF0C0C10))
                                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                                .padding(horizontal = 10.dp, vertical = 5.dp),
                        ) {
                            Text(
                                "Ep $episode · ${audio.uppercase()}",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                            )
                        }
                        if (lastWatchedEp > 0 && lastWatchedEp != episode) {
                            Text(
                                "Last $lastWatchedEp",
                                color = KittyFaint,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    activeServer?.name?.let { name ->
                        Text(
                            name,
                            color = Color.White.copy(alpha = 0.55f),
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.Medium,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
                if (status != null) {
                    Text(
                        status!!,
                        style = MaterialTheme.typography.labelSmall,
                        color = if (
                            status!!.startsWith("Getting") ||
                            status!!.startsWith("Trying") ||
                            status!!.startsWith("Playing") ||
                            status!!.startsWith("Title")
                        ) {
                            KittyMuted
                        } else {
                            MaterialTheme.colorScheme.error
                        },
                        modifier = Modifier.padding(bottom = 8.dp),
                    )
                }
                Button(
                    onClick = { playSelected() },
                    enabled = !resolving,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = Color.White,
                        contentColor = Color.Black,
                    ),
                ) {
                    if (resolving) {
                        CircularProgressIndicator(
                            modifier = Modifier.size(22.dp),
                            strokeWidth = 2.dp,
                            color = Color.Black,
                        )
                    } else {
                        Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = Color.Black)
                        Spacer(modifier = Modifier.width(8.dp))
                        Text(
                            "Play episode $episode",
                            fontWeight = FontWeight.SemiBold,
                            color = Color.Black,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
        Box(
            modifier = Modifier
                .align(Alignment.TopStart)
                .windowInsetsPadding(WindowInsets.statusBars)
                .padding(16.dp)
                .size(36.dp)
                .spacePress(onBack)
                .clip(CircleShape)
                .background(Color(0xFF141416))
                .border(0.5.dp, Color.White.copy(alpha = 0.1f), CircleShape),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = "Back",
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Composable
private fun DetailStat(
    value: String,
    label: String,
    icon: ImageVector? = null,
    color: Color = Color.White,
) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        if (icon != null) {
            Icon(
                icon,
                contentDescription = null,
                tint = color.copy(alpha = 0.6f),
                modifier = Modifier.size(16.dp),
            )
        }
        Text(value, color = color, fontWeight = FontWeight.Bold, fontSize = 14.sp)
        Text(
            label.uppercase(),
            color = Color.White.copy(alpha = 0.3f),
            fontSize = 9.sp,
            letterSpacing = 1.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun DetailStatDivider() {
    Box(
        modifier = Modifier
            .height(24.dp)
            .width(1.dp)
            .background(Color.White.copy(alpha = 0.1f)),
    )
}

@Composable
private fun EpisodeTool(
    label: String,
    enabled: Boolean,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    val filled = selected
    val background by animateColorAsState(
        if (filled) Color.White else Color(0xFF0C0C10),
        tween(180),
        label = "toolBg",
    )
    val tint = when {
        filled -> Color.Black
        enabled -> Color.White.copy(alpha = 0.85f)
        else -> Color.White.copy(alpha = 0.3f)
    }
    Box(
        modifier = Modifier
            .height(36.dp)
            .then(if (enabled) Modifier.spacePress(onClick) else Modifier)
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .border(
                0.5.dp,
                if (filled) Color.White else Color.White.copy(alpha = if (enabled) 0.08f else 0.04f),
                RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
            color = tint,
        )
    }
}

@Composable
private fun KittySearchRow(
    anime: AnimeSummary,
    badge: String? = null,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(Color(0xFF0C0C10))
            .border(0.5.dp, Color.White.copy(alpha = 0.08f), shape)
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(72.dp)
                .aspectRatio(0.7f)
                .clip(RoundedCornerShape(8.dp))
                .background(Color(0xFF141416)),
        )
        Spacer(modifier = Modifier.width(12.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                anime.title,
                color = Color.White,
                fontWeight = FontWeight.Bold,
                fontSize = 14.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val meta = listOfNotNull(
                anime.format,
                anime.seasonYear?.toString(),
                anime.episodes?.let { "$it eps" },
                anime.scoreLabel(),
            ).joinToString(" · ")
            if (meta.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(meta, color = Color.White.copy(alpha = 0.45f), fontSize = 11.sp, maxLines = 1)
            }
            if (!badge.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    badge,
                    color = KittyOnAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(KittyAccent)
                        .padding(horizontal = 8.dp, vertical = 2.dp),
                )
            }
        }
    }
}

@Composable
private fun SeasonRangeChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val background by animateColorAsState(
        if (selected) Color.White else Color.White.copy(alpha = 0.06f),
        tween(180),
        label = "rangeBg",
    )
    val text by animateColorAsState(
        if (selected) Color.Black else Color.White.copy(alpha = 0.75f),
        tween(180),
        label = "rangeText",
    )
    Text(
        label,
        color = text,
        fontWeight = FontWeight.SemiBold,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .spacePress(onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun KittyEpisodeCard(
    episode: AnimeEpisodeItem,
    selected: Boolean,
    watched: Boolean,
    continueEp: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(14.dp)
    val border = when {
        selected -> KittyAccent
        continueEp -> KittyAccent
        else -> KittyOutlineSoft
    }
    Column(
        modifier = Modifier
            .width(168.dp)
            .clip(shape)
            .then(
                if (selected) {
                    Modifier.border(2.dp, border, shape)
                } else {
                    Modifier.border(1.dp, border, shape)
                },
            )
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(16f / 9f)
                .background(KittySurface),
        ) {
            AsyncImage(
                model = episode.thumbnailUrl,
                contentDescription = episode.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            0.55f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.78f),
                        ),
                    ),
            )
            Text(
                "E${episode.number}",
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp)
                    .clip(RoundedCornerShape(8.dp))
                    .background(
                        when {
                            selected -> KittyAccent
                            continueEp -> KittyAccent
                            watched -> KittySurfaceElevated
                            else -> KittySurface
                        },
                    )
                    .padding(horizontal = 7.dp, vertical = 3.dp),
                style = MaterialTheme.typography.labelSmall,
                color = if (selected || continueEp) KittyOnAccent else KittyText,
                fontWeight = FontWeight.Bold,
            )
            if (continueEp && !selected) {
                Text(
                    "CONTINUE",
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(KittyAccent)
                        .padding(horizontal = 6.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyOnAccent,
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                )
            }
        }
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .background(if (selected) KittySurfaceElevated else KittySurface)
                .padding(horizontal = 10.dp, vertical = 9.dp),
        ) {
            Text(
                episode.title,
                style = MaterialTheme.typography.labelLarge,
                color = KittyText,
                fontWeight = FontWeight.SemiBold,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                lineHeight = 16.sp,
            )
            episode.site?.takeIf { it.isNotBlank() }?.let { site ->
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    site,
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyFaint,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
        }
    }
}

@Composable
private fun EpisodeCell(
    number: Int,
    selected: Boolean,
    watched: Boolean,
    continueEp: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    val bg = when {
        selected -> KittyAccent
        continueEp -> KittyAccent.copy(alpha = 0.22f)
        watched -> KittySurfaceElevated
        else -> KittySurface
    }
    val fg = when {
        selected -> KittyOnAccent
        continueEp -> KittyText
        watched -> KittyFaint
        else -> KittyText.copy(alpha = 0.9f)
    }
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(shape)
            .background(bg)
            .border(
                width = 1.dp,
                color = when {
                    selected -> KittyAccent
                    continueEp -> KittyAccent
                    else -> KittyOutlineSoft
                },
                shape = shape,
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (watched && !selected && !continueEp) {
                Icon(
                    Icons.Rounded.Check,
                    contentDescription = null,
                    tint = fg,
                    modifier = Modifier.size(11.dp),
                )
                Spacer(modifier = Modifier.width(2.dp))
            }
            Text(
                "$number",
                color = fg,
                fontWeight = if (selected || continueEp) FontWeight.Bold else FontWeight.Medium,
                fontSize = 13.sp,
            )
        }
    }
}

@Composable
private fun EpisodeLegendDot(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically) {
        Box(
            modifier = Modifier
                .size(8.dp)
                .clip(RoundedCornerShape(3.dp))
                .background(color)
                .border(1.dp, KittyOutlineSoft, RoundedCornerShape(3.dp)),
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(label, color = KittyFaint, fontSize = 11.sp)
    }
}

@Composable
private fun PersonRow(title: String, people: List<site.anikitty.app.data.anilist.AnimePerson>) {
    Column {
        Text(
            title.uppercase(),
            color = Color.White.copy(alpha = 0.6f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            letterSpacing = 1.sp,
        )
        Spacer(modifier = Modifier.height(10.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
            lazyItems(people, key = { "$title-${it.id}-${it.role}" }) { person ->
                Column(modifier = Modifier.width(84.dp)) {
                    AsyncImage(
                        model = person.imageUrl,
                        contentDescription = person.name,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF1E1E20))
                            .border(0.5.dp, Color.White.copy(alpha = 0.08f), CircleShape),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        person.name,
                        color = KittyText,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    person.role?.let { role ->
                        Text(
                            role,
                            color = KittyFaint,
                            fontSize = 11.sp,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }
            }
        }
    }
}

private fun sampleBitmapColor(bitmap: android.graphics.Bitmap): Color {
    val width = bitmap.width
    val height = bitmap.height
    if (width <= 0 || height <= 0) return Color.Black
    var red = 0L
    var green = 0L
    var blue = 0L
    var count = 0
    val stepX = (width / 12).coerceAtLeast(1)
    val stepY = (height / 12).coerceAtLeast(1)
    var y = 0
    while (y < height) {
        var x = 0
        while (x < width) {
            val pixel = bitmap.getPixel(x, y)
            red += android.graphics.Color.red(pixel)
            green += android.graphics.Color.green(pixel)
            blue += android.graphics.Color.blue(pixel)
            count++
            x += stepX
        }
        y += stepY
    }
    if (count == 0) return Color.Black
    return Color(
        red = (red / count) / 255f * 0.45f,
        green = (green / count) / 255f * 0.45f,
        blue = (blue / count) / 255f * 0.45f,
    )
}

private fun formatAiring(epochSec: Long): String {
    val fmt = java.text.SimpleDateFormat("EEE, MMM d · h:mm a", java.util.Locale.getDefault())
    return fmt.format(java.util.Date(epochSec * 1000L))
}

@Composable
private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    val background by animateColorAsState(
        if (selected) Color.White else Color.White.copy(alpha = 0.05f),
        tween(180),
        label = "chipBg",
    )
    val stroke by animateColorAsState(
        if (selected) Color.White.copy(alpha = 0.3f) else Color.White.copy(alpha = 0.08f),
        tween(180),
        label = "chipStroke",
    )
    val text by animateColorAsState(
        if (selected) Color.Black else Color.White.copy(alpha = 0.75f),
        tween(180),
        label = "chipText",
    )
    Text(
        label,
        color = text,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .border(1.dp, stroke, RoundedCornerShape(16.dp))
            .spacePress(onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}
