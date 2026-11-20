// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.activity.compose.BackHandler
import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.AnimatedContentScope
import androidx.compose.animation.EnterTransition
import androidx.compose.animation.ExitTransition
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionLayout
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.animateContentSize
import androidx.compose.animation.core.Spring
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.spring
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
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
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyListState
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
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.nestedScroll
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
import coil.compose.AsyncImage
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.ensureActive
import kotlinx.coroutines.launch
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicInteger
import java.util.concurrent.atomic.AtomicReference
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import site.anikitty.app.data.tmdb.TmdbCatalog
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.airingLabel
import site.anikitty.app.data.watchedAgo
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.anilist.AnimeEpisodeItem
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.ContinueHidden
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.continueCue
import site.anikitty.app.data.local.continueQueue
import site.anikitty.app.data.local.markEpisode
import site.anikitty.app.data.local.AutoMarkDecision
import site.anikitty.app.data.local.autoMarkDecision
import site.anikitty.app.data.local.shouldMarkWatched
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ProviderLatestMapper
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.AnimatedSearchIcon
import site.anikitty.app.ui.components.EpisodeCarousel
import site.anikitty.app.ui.components.EpisodeSlide
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
import site.anikitty.app.ui.components.LocalPosterFlight
import site.anikitty.app.ui.components.LocalPosterMotion
import site.anikitty.app.ui.components.PosterFlight
import site.anikitty.app.ui.components.PosterMotion
import site.anikitty.app.ui.components.KittyDock
import site.anikitty.app.ui.components.rememberDockScroll
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyMenuEntry
import site.anikitty.app.ui.components.KittyOverflow
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
import site.anikitty.app.data.local.shareWatchProgress
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.LookState
import site.anikitty.app.ui.theme.ShimmerBox
import site.anikitty.app.ui.theme.prefersReducedMotion
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySpace
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText

private sealed class Screen {
    data object Tabs : Screen()
    data class Detail(
        val anime: AnimeSummary,
        val startEpisode: Int? = null,
        val autoPlay: Boolean = false,
    ) : Screen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
    ) : Screen()
    data object Schedule : Screen()
    data object Builds : Screen()
    data object Continue : Screen()
}

@OptIn(ExperimentalSharedTransitionApi::class)
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
    demo: Boolean = false,
) {
    val context = LocalContext.current
    ContinueHidden.install(context)
    val homeLayout = remember { HomeLayoutStore(context) }
    // Tab survives recreation; detail/player stack relies on configChanges in the manifest
    // so landscape lock in PlayerScreen does not wipe navigation.
    var tab by rememberSaveable {
        mutableStateOf("home")
    }
    /** Where Extension store Back returns — Settings or Home. */
    var storeReturnTab by rememberSaveable { mutableStateOf("settings") }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }
    var searchGenre by remember { mutableStateOf<String?>(null) }
    var libraryFilter by rememberSaveable { mutableStateOf("all") }
    var homeShelfName by rememberSaveable { mutableStateOf(HomeShelf.All.name) }
    var homeTopName by rememberSaveable { mutableStateOf(HomeTopWindow.Season.name) }
    val homeListState = rememberSaveable(saver = LazyListState.Saver) { LazyListState() }
    /** Prior detail frames when drilling into related / other seasons. */
    var detailBackStack by remember { mutableStateOf<List<Screen.Detail>>(emptyList()) }
    val storedHistory by historyDao.observeAll().collectAsState(initial = emptyList())
    val history = if (demo) site.anikitty.app.data.demo.DemoLibrary.history else storedHistory
    fun isolated(id: Int) = demo || site.anikitty.app.data.demo.DemoLibrary.find(id) != null
    val listMarks = remember(history) {
        history.mapNotNull { entry ->
            val badge = listStatusBadge(entry.listStatus)
                ?: if (entry.positionMs > 2_000L || entry.episodesFinished() > 1) "Continue" else null
            badge?.let { entry.anilistId to it }
        }.toMap()
    }
    val followedEpisodes = remember(history) {
        history.associate { it.anilistId to it.episodesFinished() }
    }
    val inProgressIds = remember(history) {
        history.mapNotNull { entry ->
            val stillWatching = entry.positionMs > 2_000L &&
                !shouldMarkWatched(entry.positionMs, entry.durationMs)
            entry.anilistId.takeIf { stillWatching }
        }.toSet()
    }
    val scope = rememberCoroutineScope()
    var syncLabel by remember { mutableStateOf<String?>(null) }
    var aniLinkStatus by remember { mutableStateOf<String?>(null) }
    var aniLinkTick by remember { mutableIntStateOf(0) }
    var openAccountTick by remember { mutableIntStateOf(0) }

    fun openDetail(
        anime: AnimeSummary,
        startEpisode: Int? = null,
        pushCurrent: Boolean = false,
        autoPlay: Boolean = false,
    ) {
        val next = Screen.Detail(anime, startEpisode, autoPlay)
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
                }.getOrElse { e -> friendlyFailure(e.message) }
                onConsumedAniListToken()
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
                syncLabel = friendlyFailure(e.message)
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

    suspend fun openHistory(entry: WatchHistoryEntity, episode: Int?, autoPlay: Boolean = false) {
        val detail = site.anikitty.app.data.demo.DemoLibrary.find(entry.anilistId)
            ?: aniList.media(entry.anilistId)
            ?: summaryFrom(entry)
        val total = detail.releasedEpisodeCount().takeIf { it > 0 }
        if (episode != null && total != null && episode > total) {
            openDetail(detail, null, autoPlay = false)
            return
        }
        val play = when {
            episode == null -> null
            total != null -> episode.coerceAtMost(total)
            else -> episode
        }
        openDetail(detail, play, autoPlay = autoPlay && play != null)
    }

    var releasedById by remember { mutableStateOf<Map<Int, Int>>(emptyMap()) }
    LaunchedEffect(demo, history.map { it.anilistId }) {
        if (demo) {
            releasedById = site.anikitty.app.data.demo.DemoLibrary.catalog
                .mapNotNull { anime ->
                    anime.releasedEpisodeCount().takeIf { it > 0 }?.let { anime.id to it }
                }
                .toMap()
            return@LaunchedEffect
        }
        val missing = history.map { it.anilistId }.distinct().filter { it !in releasedById }.take(24)
        if (missing.isEmpty()) return@LaunchedEffect
        val found = coroutineScope {
            missing.map { id ->
                async {
                    val count = runCatching { aniList.media(id) }.getOrNull()
                        ?.releasedEpisodeCount()
                        ?.takeIf { it > 0 }
                    if (count != null) id to count else null
                }
            }.awaitAll().filterNotNull()
        }
        if (found.isNotEmpty()) releasedById = releasedById + found
    }
    BackHandler(
        enabled = screen is Screen.Detail ||
            screen == Screen.Continue ||
            screen == Screen.Schedule ||
            (screen == Screen.Tabs && tab != "home"),
    ) {
        when {
            screen is Screen.Detail -> popDetailOrTabs()
            screen == Screen.Continue || screen == Screen.Schedule -> screen = Screen.Tabs
            screen == Screen.Tabs && tab != "home" -> tab = "home"
            else -> Unit
        }
    }

    when (screen) {
        Screen.Schedule -> {
            Box(modifier = Modifier.fillMaxSize()) {
                ScheduleFeed(
                    aniList = aniList,
                    onBack = { screen = Screen.Tabs },
                    onOpen = { anime, episode -> openDetail(anime, episode) },
                    followedEpisodes = followedEpisodes,
                    inProgressIds = inProgressIds,
                )
                DockOverlay(
                    tabs = tabs,
                    selectedId = "schedule",
                    profileImageUrl = aniListAuth.avatarUrl,
                    onSelect = { id ->
                        screen = Screen.Tabs
                        tab = id
                    },
                    modifier = Modifier.align(Alignment.BottomCenter),
                )
            }
            return
        }
        Screen.Continue -> {
            Box(modifier = Modifier.fillMaxSize()) {
                ContinueAllPage(
                    history = history,
                    releasedEpisodes = releasedById,
                    onBack = { screen = Screen.Tabs },
                    onOpen = { entry, episode ->
                        scope.launch { openHistory(entry, episode, autoPlay = true) }
                    },
                    onOpenTitle = { entry ->
                        scope.launch { openHistory(entry, null) }
                    },
                    onRemove = { entry -> ContinueHidden.hide(context, entry.anilistId) },
                    onMarkWatched = { entry, episode ->
                        scope.launch {
                            historyDao.markEpisode(summaryFrom(entry), episode)
                        }
                    },
                )
            }
            return
        }
        Screen.Builds -> {
            Box(modifier = Modifier.fillMaxSize()) {
                BuildChannelPage(onBack = { screen = Screen.Tabs })
                DockOverlay(
                    tabs = tabs,
                    selectedId = if (tab == "settings" || tab == "store") "history" else tab,
                    profileImageUrl = aniListAuth.avatarUrl,
                    onSelect = { id ->
                        screen = Screen.Tabs
                        tab = id
                    },
                    modifier = Modifier.align(Alignment.BottomCenter),
                )
            }
            return
        }
        else -> Unit
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
                    demo = demo,
                    history = history,
                    historyDao = historyDao,
                    streamServers = streamServers,
                    onOpen = { anime, ep -> openDetail(anime, ep) },
                    onOpenSearch = { tab = "search" },
                    onOpenGenre = { genre ->
                        searchGenre = genre
                        tab = "search"
                    },
                    onOpenSchedule = {
                        screen = Screen.Tabs
                        tab = "schedule"
                    },
                    onOpenAccount = { tab = "settings" },
                    onSeeAllContinue = { screen = Screen.Continue },
                    homeLayout = homeLayout,
                    shelfName = homeShelfName,
                    onShelfName = { homeShelfName = it },
                    topWindowName = homeTopName,
                    onTopWindowName = { homeTopName = it },
                    homeListState = homeListState,
                    releasedEpisodes = releasedById,
                    onResumeContinue = { entry, episode ->
                        scope.launch { openHistory(entry, episode, autoPlay = true) }
                    },
                    onOpenContinueTitle = { entry ->
                        scope.launch { openHistory(entry, null) }
                    },
                )
                "schedule" -> ScheduleFeed(
                    aniList = aniList,
                    demo = demo,
                    onBack = { tab = "home" },
                    onOpen = { anime, episode -> openDetail(anime, episode) },
                    showBack = false,
                    bottomInset = 100.dp,
                    followedEpisodes = followedEpisodes,
                    inProgressIds = inProgressIds,
                )
                "search" -> SearchFeed(
                    aniList = aniList,
                    demo = demo,
                    historyDao = historyDao,
                    requestedGenre = searchGenre,
                    onRequestedGenreConsumed = { searchGenre = null },
                    listMarks = listMarks,
                    onOpen = { openDetail(it) },
                )
                "store" -> ExtensionStoreFeed(
                    catalog = streamServers,
                    onBack = { tab = storeReturnTab },
                )
                "history" -> MySpaceFeed(
                    history = history,
                    historyDao = historyDao,
                    aniList = aniList,
                    demo = demo,
                    aniListLinked = aniListAuth.isLinked && !demo,
                    accessToken = if (demo) null else aniListAuth.accessToken,
                    accountLabel = accountLabel,
                    syncLabel = syncLabel,
                    libraryFilter = libraryFilter,
                    onSync = {
                        scope.launch {
                            syncLabel = "Syncing…"
                            syncLabel = runCatching {
                                val result = aniListSync.pull()
                                "Synced ${result.imported} from AniList"
                            }.getOrElse { e -> friendlyFailure(e.message) }
                        }
                    },
                    onOpen = { openDetail(it) },
                    onOpenAccount = { tab = "settings" },
                    onSeeAllContinue = { screen = Screen.Continue },
                    onBrowse = { tab = "search" },
                    onSignOut = onSignOut,
                    avatarUrl = aniListAuth.avatarUrl,
                )
                "settings" -> SettingsFeed(
                    demo = demo,
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
                    onOpenStore = {
                        storeReturnTab = "settings"
                        tab = "store"
                    },
                    onClose = { tab = "home" },
                    onOpenBuilds = { screen = Screen.Builds },
                    openAccountTick = openAccountTick,
                    onOpenLibrary = { filter ->
                        libraryFilter = filter
                        screen = Screen.Tabs
                        tab = "history"
                    },
                    homeLayout = homeLayout,
                    onExportProgress = { shareWatchProgress(context, history) },
                )
            }
        }
    }

    val reducedMotion = prefersReducedMotion()
    val bounds = BoundsTransform { _, _ ->
        if (reducedMotion) {
            snap()
        } else {
            spring(
                dampingRatio = Spring.DampingRatioNoBouncy,
                stiffness = Spring.StiffnessMediumLow,
            )
        }
    }
    Box(modifier = Modifier.fillMaxSize()) {
        SharedTransitionLayout(modifier = Modifier.fillMaxSize()) {
            val shared = this
            AnimatedContent(
                targetState = screen,
                contentKey = { state ->
                    when (state) {
                        is Screen.Player -> "player-${state.anime.id}-${state.episode}"
                        is Screen.Detail -> "detail-${state.anime.id}"
                        else -> "tabs"
                    }
                },
                transitionSpec = {
                    if (reducedMotion) {
                        EnterTransition.None togetherWith ExitTransition.None
                    } else {
                        fadeIn(tween(240)) togetherWith fadeOut(tween(180))
                    }
                },
                label = "watch",
            ) { current ->
                val animeId = when (current) {
                    is Screen.Player -> current.anime.id
                    is Screen.Detail -> current.anime.id
                    else -> 0
                }
                val artModifier = if (animeId == 0) {
                    Modifier
                } else {
                    with(shared) {
                        Modifier.sharedElement(
                            rememberSharedContentState(key = "art-$animeId"),
                            animatedVisibilityScope = this@AnimatedContent,
                            boundsTransform = bounds,
                        )
                    }
                }
                val posterFlight = remember { PosterFlight() }
                posterFlight.claimed.clear()
                CompositionLocalProvider(
                    LocalPosterMotion provides PosterMotion(
                        scope = shared,
                        visibility = this@AnimatedContent,
                        bounds = bounds,
                    ),
                    LocalPosterFlight provides posterFlight,
                ) {
                    when (current) {
        is Screen.Player -> {
            var resumeMs by remember(current.anime.id, current.episode) { mutableStateOf(0L) }
            var watchedThrough by remember(current.anime.id) {
                mutableIntStateOf(current.anime.listState?.progress ?: 0)
            }
            val historyWrite = remember(current.anime.id) { Mutex() }
            var playerAudio by remember {
                mutableStateOf(
                    context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
                        .getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub",
                )
            }
            // Last language a resolve actually loaded. Optimistic UI updates
            // must not become the rollback target for an older request.
            var committedAudio by remember { mutableStateOf(playerAudio) }
            val audioGeneration = remember { AtomicInteger(0) }
            val audioResolveJob = remember { AtomicReference<Job?>(null) }
            // The resolve runs on the app scope, so leaving this composition
            // does not cancel it. Back and dismiss clear this before the
            // attempt can save a language or reopen the player.
            val playerOpen = remember { AtomicBoolean(true) }
            fun abandonPlayerResolve() {
                playerOpen.set(false)
                audioResolveJob.get()?.cancel()
            }
            DisposableEffect(Unit) {
                onDispose { abandonPlayerResolve() }
            }
            fun openResolved(nextEpisode: Int, nextAudio: String) {
                val request = audioGeneration.incrementAndGet()
                val rollbackTo = committedAudio
                audioResolveJob.get()?.cancel()
                audioResolveJob.set(scope.launch {
                    val watchPrefs = context.getSharedPreferences(
                        "anikitty_watch",
                        android.content.Context.MODE_PRIVATE,
                    )
                    fun persist(audio: String) {
                        watchPrefs.edit().putString("audio", audio).apply()
                        committedAudio = audio
                        playerAudio = audio
                    }
                    playerAudio = nextAudio
                    fun languageToSave(failed: Boolean): String? =
                        site.anikitty.app.data.servers.audioToPersist(
                            request = request,
                            latest = audioGeneration.get(),
                            cancelled = false,
                            failed = failed,
                            requested = nextAudio,
                            committed = rollbackTo,
                            dismissed = !playerOpen.get(),
                        )
                    try {
                        val demoClip = if (demo) {
                            site.anikitty.app.data.demo.DemoLibrary.clip(context, current.anime.id)
                        } else {
                            null
                        }
                        val resolved = if (demoClip != null) {
                            site.anikitty.app.data.servers.ResolveFailoverResult(
                                sources = listOf(demoClip),
                                server = streamServers.resolvers.value.firstOrNull()?.server
                                    ?: site.anikitty.app.data.servers.StreamServer(
                                        id = "demo",
                                        name = "Demo",
                                        description = "Sample clip",
                                    ),
                                usedFallback = false,
                            )
                        } else {
                            streamServers.resolveWithFailover(
                                anilistId = current.anime.id,
                                episode = nextEpisode,
                                audio = nextAudio,
                                titleHint = current.anime.streamTitleHint(),
                            )
                        }
                        ensureActive()
                        if (languageToSave(failed = false) == null) return@launch
                        if (!isolated(current.anime.id)) {
                            historyWrite.withLock {
                                val existing = historyDao.get(current.anime.id)
                                val sameEpisode = nextEpisode == current.episode
                                historyDao.upsert(
                                    WatchHistoryEntity(
                                        anilistId = current.anime.id,
                                        title = current.anime.title,
                                        coverImageUrl = current.anime.coverImageUrl,
                                        episode = nextEpisode,
                                        positionMs = if (sameEpisode) existing?.positionMs ?: 0L else 0L,
                                        durationMs = if (sameEpisode) existing?.durationMs ?: 0L else 0L,
                                        updatedAtEpochMs = System.currentTimeMillis(),
                                        listStatus = existing?.listStatus ?: "CURRENT",
                                        malId = current.anime.malId ?: existing?.malId,
                                    ),
                                )
                            }
                        }
                        ensureActive()
                        val commit = languageToSave(failed = false) ?: return@launch
                        site.anikitty.app.data.servers.SourceBadgeCache.remember(
                            context,
                            current.anime.id,
                            nextEpisode,
                            resolved.sources,
                        )
                        if (languageToSave(failed = false) == null) return@launch
                        persist(commit)
                        if (languageToSave(failed = false) == null) return@launch
                        screen = Screen.Player(current.anime, nextEpisode, resolved.sources)
                    } catch (cancelled: CancellationException) {
                        // Cancellation is not a failed switch. A newer request
                        // already owns the choice; leaving the player must not
                        // write the language this attempt captured.
                        if (audioGeneration.get() == request) playerAudio = rollbackTo
                        throw cancelled
                    } catch (_: Exception) {
                        languageToSave(failed = true)?.let(::persist)
                    }
                })
            }
            LaunchedEffect(current.anime.id, current.episode) {
                val entry = if (demo) {
                    null
                } else {
                    historyDao.get(current.anime.id)
                }
                if (entry != null && entry.episode == current.episode && entry.positionMs > 2_000L) {
                    resumeMs = entry.positionMs
                }
                val sample = if (demo) {
                    site.anikitty.app.data.demo.DemoLibrary.history
                        .firstOrNull { it.anilistId == current.anime.id }
                } else {
                    null
                }
                watchedThrough = maxOf(
                    current.anime.listState?.progress ?: 0,
                    ((sample?.episode ?: entry?.episode ?: 1) - 1),
                ).coerceAtLeast(0)
            }
            var reportedEpisode by remember(current.anime.id, current.episode) { mutableStateOf(false) }
            var reportInFlight by remember(current.anime.id, current.episode) { mutableStateOf(false) }
            // Local frontier already moved for this episode, and AniList still needs the same count.
            var localMarked by remember(current.anime.id, current.episode) { mutableStateOf(false) }
            PlayerScreen(
                title = current.anime.title,
                episode = current.episode,
                sources = current.sources,
                anilistId = current.anime.id,
                titleHint = current.anime.streamTitleHint(),
                loadAniSkip = streamServers::aniSkipStamps,
                startPositionMs = resumeMs,
                onClose = {
                    // Drop an in-flight resolve before leaving, or it can save
                    // the language and open the player again.
                    abandonPlayerResolve()
                    // Return to detail for this title without wiping related back-stack.
                    screen = Screen.Detail(current.anime, current.episode)
                },
                onDismiss = {
                    abandonPlayerResolve()
                    screen = Screen.Tabs
                },
                onToggleWatched = { number ->
                    if (!isolated(current.anime.id)) scope.launch {
                        val finished = historyWrite.withLock {
                            historyDao.markEpisode(current.anime, number)
                        } ?: return@launch
                        watchedThrough = maxOf(
                            current.anime.listState?.progress ?: 0,
                            finished,
                        )
                        if (aniListAuth.isLinked && !demo) {
                            aniListSync.pushProgress(
                                anilistId = current.anime.id,
                                episode = finished,
                                totalEpisodes = current.anime.episodes,
                            )
                        }
                    }
                },
                onProgress = { pos, dur, skip ->
                    if (!isolated(current.anime.id)) scope.launch {
                        val existing = historyWrite.withLock {
                            val row = historyDao.get(current.anime.id)
                            // A watched toggle already moved this row to a later
                            // episode. The playhead for the episode on screen
                            // must not pull that frontier back.
                            if ((row?.episode ?: 0) > current.episode) {
                                row
                            } else {
                                val written = WatchHistoryEntity(
                                    anilistId = current.anime.id,
                                    title = current.anime.title,
                                    coverImageUrl = current.anime.coverImageUrl
                                        ?: row?.coverImageUrl,
                                    episode = current.episode,
                                    positionMs = pos,
                                    durationMs = dur,
                                    updatedAtEpochMs = System.currentTimeMillis(),
                                    listStatus = row?.listStatus ?: "CURRENT",
                                    malId = current.anime.malId ?: row?.malId,
                                )
                                historyDao.upsert(written)
                                written
                            }
                        }
                        ContinueHidden.reveal(context, current.anime.id)
                        val stored = existing?.episode ?: 0
                        // Retry only while the row is still the next episode. A later
                        // mark, or an unwatch that put it back, owns AniList.
                        val decision = autoMarkDecision(stored, current.episode, localMarked)
                        val due = decision == AutoMarkDecision.RetryPush ||
                            shouldMarkWatched(pos, dur, skip)
                        if (!reportedEpisode && !reportInFlight && decision != AutoMarkDecision.Stop && due) {
                            reportInFlight = true
                            val saved = try {
                                val completed = historyWrite.withLock {
                                    val nowStored = historyDao.get(current.anime.id)?.episode ?: 0
                                    when (autoMarkDecision(nowStored, current.episode, localMarked)) {
                                        AutoMarkDecision.Stop -> null
                                        AutoMarkDecision.RetryPush -> current.episode
                                        AutoMarkDecision.MarkLocal ->
                                            historyDao.markEpisode(current.anime, current.episode)
                                    }
                                }
                                if (completed != null) localMarked = true
                                when {
                                    completed == null -> false
                                    aniListAuth.isLinked && !demo -> aniListSync.pushProgress(
                                        anilistId = current.anime.id,
                                        episode = completed,
                                        totalEpisodes = current.anime.episodes,
                                    )
                                    else -> true
                                }
                            } finally {
                                reportInFlight = false
                            }
                            if (saved) reportedEpisode = true
                        }
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
                episodeSlides = current.anime.episodeItems().map { item ->
                    EpisodeSlide(
                        number = item.number,
                        title = item.title,
                        imageUrl = item.thumbnailUrl?.takeIf { url ->
                            url.isNotBlank() && url != current.anime.coverImageUrl
                        },
                        marker = item.marker,
                    )
                },
                fallbackArt = current.anime.bannerImageUrl ?: current.anime.coverImageUrl,
                stageModifier = artModifier,
            )
        }
        is Screen.Detail -> {
            TitleDetailScreen(
                anime = current.anime,
                initialEpisode = current.startEpisode,
                autoPlay = current.autoPlay,
                streamServers = streamServers,
                historyDao = historyDao,
                aniList = aniList,
                onBack = { popDetailOrTabs() },
                onChangeSource = {
                    detailBackStack = emptyList()
                    screen = Screen.Tabs
                    storeReturnTab = "home"
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
                posterModifier = artModifier,
            )
        }
        else -> {
            Box(modifier = Modifier.fillMaxSize()) {
                KittyAtmosphere()
                PhoneTabs(Modifier.fillMaxSize())
                val profileAvatar = aniLinkTick.let { aniListAuth.avatarUrl }
                DockOverlay(
                    tabs = tabs,
                    selectedId = if (tab == "settings" || tab == "store") "history" else tab,
                    profileImageUrl = profileAvatar,
                    onSelect = { tab = it },
                    modifier = Modifier.align(Alignment.BottomCenter),
                )
            }
        }
                }

                }
            }
        }
        if (screen is Screen.Detail) {
            DockOverlay(
                tabs = tabs,
                selectedId = if (tab == "settings" || tab == "store") "history" else tab,
                profileImageUrl = aniListAuth.avatarUrl,
                onSelect = { id ->
                    detailBackStack = emptyList()
                    screen = Screen.Tabs
                    tab = id
                },
                modifier = Modifier.align(Alignment.BottomCenter),
            )
        }
    }
}

@Composable
private fun DockOverlay(
    tabs: List<KittyNavTab>,
    selectedId: String,
    profileImageUrl: String?,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val reduced = prefersReducedMotion()
    val shift by animateDpAsState(
        targetValue = if (KittyDock.shown) 0.dp else 108.dp,
        animationSpec = if (reduced) snap() else tween(220, easing = FastOutSlowInEasing),
        label = "dock",
    )
    KittyBottomNav(
        tabs = tabs,
        selectedId = selectedId,
        profileTabId = "history",
        profileImageUrl = profileImageUrl,
        onSelect = onSelect,
        modifier = modifier.graphicsLayer { translationY = shift.toPx() },
    )
}

@Composable
private fun HomeFeed(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    demo: Boolean = false,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onOpenSearch: () -> Unit,
    onOpenGenre: (String) -> Unit,
    onOpenSchedule: () -> Unit,
    onOpenAccount: () -> Unit,
    onSeeAllContinue: () -> Unit,
    homeLayout: HomeLayoutStore,
    shelfName: String,
    onShelfName: (String) -> Unit,
    topWindowName: String,
    onTopWindowName: (String) -> Unit,
    homeListState: LazyListState,
    releasedEpisodes: Map<Int, Int> = emptyMap(),
    onResumeContinue: (WatchHistoryEntity, Int) -> Unit,
    onOpenContinueTitle: (WatchHistoryEntity) -> Unit,
) {
    val context = LocalContext.current
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()
    var catalogJob by remember { mutableStateOf<Job?>(null) }
    val catalogBusy = loading || refreshing
    var airingToday by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    var latestDub by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    var latestTick by remember { mutableIntStateOf(0) }
    LaunchedEffect(demo, latestTick) {
        if (demo) {
            val now = System.currentTimeMillis() / 1000L
            val demoSlots = site.anikitty.app.data.demo.DemoLibrary.airing(now)
            airingToday = demoSlots
            latestDub = demoSlots.filter { (it.dubEpisodes ?: 0) > 0 }.map { slot ->
                slot.copy(episode = slot.dubEpisodes ?: slot.episode)
            }
            return@LaunchedEffect
        }
        val known = (trending + seasonal).associateBy { it.id }
        val (subItems, dubItems) = coroutineScope {
            val scrapedSub = async {
                runCatching { streamServers.anikotoLatestUpdates("sub") }.getOrDefault(emptyList())
            }
            val scrapedDub = async {
                runCatching { streamServers.anikotoLatestUpdates("dub") }.getOrDefault(emptyList())
            }
            scrapedSub.await() to scrapedDub.await()
        }
        val mappedSub = if (subItems.isNotEmpty()) {
            ProviderLatestMapper.toSlots(subItems, "sub", aniList, known)
        } else {
            emptyList()
        }
        val mappedDub = if (dubItems.isNotEmpty()) {
            ProviderLatestMapper.toSlots(dubItems, "dub", aniList, known)
        } else {
            emptyList()
        }
        if (mappedSub.isNotEmpty() || mappedDub.isNotEmpty()) {
            // Keep Sub and Dub lists separate — never show Dub cards under Sub.
            airingToday = mappedSub
            latestDub = mappedDub
        } else {
            val now = System.currentTimeMillis() / 1000L
            airingToday = runCatching {
                aniList.airingSchedule(now - 36 * 60 * 60, now, newestFirst = true)
            }.getOrDefault(emptyList())
            latestDub = emptyList()
        }
    }
    val shelf = HomeShelf.entries.firstOrNull { it.name == shelfName } ?: HomeShelf.All
    val topWindow = HomeTopWindow.entries.firstOrNull { it.name == topWindowName } ?: HomeTopWindow.Season
    val hiddenContinue = ContinueHidden.ids
    val continueWatching = remember(history, hiddenContinue, releasedEpisodes) {
        continueQueue(history, hiddenContinue, releasedEpisodes).take(12)
    }
    val planToWatch = remember(history) {
        history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.take(12)
    }
    var topTen by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var upcoming by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var upcomingDates by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var topRated by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var because by remember { mutableStateOf<Pair<String, List<AnimeSummary>>?>(null) }
    var networkRow by remember { mutableStateOf<Triple<String, String?, List<AnimeSummary>>?>(null) }
    var heroLogos by remember { mutableStateOf<Map<Int, String>>(emptyMap()) }
    var collection by remember { mutableStateOf<Pair<String, List<AnimeSummary>>?>(null) }
    var forYou by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var forYouFrom by remember { mutableStateOf<String?>(null) }
    val spotlightId = continueWatching.firstOrNull()?.anilistId
    LaunchedEffect(spotlightId) {
        if (demo) {
            val spot = site.anikitty.app.data.demo.DemoLibrary.harbor
            forYouFrom = spot.title
            forYou = spot.recommendations.filter { it.id != spot.id }
            return@LaunchedEffect
        }
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
        if (demo) {
            trending = site.anikitty.app.data.demo.DemoLibrary.featured
            seasonal = site.anikitty.app.data.demo.DemoLibrary.seasonal
            airingToday = site.anikitty.app.data.demo.DemoLibrary.airing(System.currentTimeMillis() / 1000L)
            val film = site.anikitty.app.data.demo.DemoLibrary.catalog.firstOrNull { it.format == "MOVIE" }
            upcoming = listOfNotNull(film)
            upcomingDates = film?.let { mapOf(it.id to "2026") }.orEmpty()
            site.anikitty.app.data.demo.DemoLibrary.catalog.forEach { anime ->
                val clip = site.anikitty.app.data.demo.DemoLibrary.clip(context, anime.id) ?: return@forEach
                site.anikitty.app.data.servers.SourceBadgeCache.remember(context, anime.id, 0, listOf(clip))
                anime.episodeItems().forEach { item ->
                    site.anikitty.app.data.servers.SourceBadgeCache.remember(
                        context,
                        anime.id,
                        item.number,
                        listOf(clip),
                    )
                }
            }
            prefetchCovers(context, trending)
            loading = false
            refreshing = false
            error = null
            return
        }
        if (fromPull) latestTick++
        if (catalogJob?.isActive == true) {
            if (!fromPull) return
            catalogJob?.cancel()
        }
        catalogJob = scope.launch {
            if (fromPull) refreshing = true else loading = true
            error = null
            runCatching {
                if (fromPull) aniList.invalidateCache()
                coroutineScope {
                    val t = async { aniList.trending(forceRefresh = fromPull) }
                    val s = async { aniList.seasonal(forceRefresh = fromPull) }
                    val seasonTop = async {
                        val now = java.util.Calendar.getInstance()
                        val season = when (now.get(java.util.Calendar.MONTH)) {
                            in 0..2 -> "WINTER"
                            in 3..5 -> "SPRING"
                            in 6..8 -> "SUMMER"
                            else -> "FALL"
                        }
                        runCatching {
                            aniList.browse(
                                season = season,
                                seasonYear = now.get(java.util.Calendar.YEAR),
                                sort = "TRENDING_DESC",
                                perPage = 12,
                            )
                        }.getOrDefault(emptyList())
                    }
                    trending = t.await()
                    seasonal = s.await()
                    topTen = seasonTop.await().ifEmpty { trending }.take(10)
                    prefetchCovers(context, trending + seasonal + topTen)
                }
            }.onFailure {
                if (it is CancellationException) throw it
                error = friendlyFailure(it.message)
            }
            loading = false
            refreshing = false
            if (error != null && trending.isEmpty()) return@launch
            runCatching {
                val shown = trending + seasonal + topTen
                val catalog = TmdbCatalog.shared(context)
                val heroes = trending.take(5).map { it.id }
                val art = runCatching { withContext(Dispatchers.IO) { catalog.heroArt(heroes) } }.getOrDefault(emptyMap())
                if (art.isNotEmpty()) {
                    heroLogos = art.mapNotNull { (id, pair) -> pair.first?.let { id to it } }.toMap()
                    trending = trending.map { anime ->
                        val backdrop = art[anime.id]?.second
                        if (backdrop != null) anime.copy(bannerImageUrl = backdrop) else anime
                    }
                }
                suspend fun showsFor(ids: List<Int>): List<AnimeSummary> {
                    return ids.take(8).mapNotNull { id ->
                        shown.firstOrNull { it.id == id } ?: runCatching { aniList.media(id) }.getOrNull()
                    }
                }
                val dated = runCatching { withContext(Dispatchers.IO) { catalog.upcomingTitles() } }.getOrDefault(emptyList())
                val upcomingShows = dated.mapNotNull { item ->
                    showsFor(listOf(item.anilistId)).firstOrNull()?.let { it to item.dateLabel }
                }
                upcoming = upcomingShows.map { it.first }
                upcomingDates = upcomingShows.associate { it.first.id to it.second }
                topRated = showsFor(runCatching { withContext(Dispatchers.IO) { catalog.topRatedIds() } }.getOrDefault(emptyList()))
                val watched = continueWatching.firstOrNull()
                if (watched != null) {
                    val related = showsFor(
                        runCatching { withContext(Dispatchers.IO) { catalog.becauseYouWatched(watched.anilistId) } }
                            .getOrDefault(emptyList()),
                    )
                    because = if (related.isNotEmpty()) watched.title to related else null
                }
                val shelf = trending.firstOrNull()?.let { anime ->
                    runCatching { withContext(Dispatchers.IO) { catalog.networkShelf(anime.id) } }.getOrNull()
                }
                if (shelf != null) {
                    val onNetwork = showsFor(shelf.anilistIds)
                    networkRow = if (onNetwork.isNotEmpty()) Triple(shelf.name, shelf.logoUrl, onNetwork) else null
                }
                val seed = continueWatching.firstOrNull()?.anilistId ?: trending.firstOrNull()?.id
                if (seed != null) {
                    val group = runCatching { withContext(Dispatchers.IO) { catalog.collection(seed) } }.getOrNull()
                    val shows = group?.second.orEmpty().mapNotNull { id ->
                        shown.firstOrNull { it.id == id }
                            ?: trending.firstOrNull { it.id == id }
                            ?: runCatching { aniList.media(id) }.getOrNull()
                    }
                    collection = if (group != null && shows.isNotEmpty()) group.first to shows else null
                }
            }.onFailure {
                if (it is CancellationException) throw it
            }
        }
    }

    LaunchedEffect(Unit) { reload() }

    val openCatalog: (AnimeSummary) -> Unit = { anime ->
        val known = site.anikitty.app.data.demo.DemoLibrary.find(anime.id)
        if (!demo && known == null) {
            scope.launch { historyDao.touchFromCatalog(anime) }
        }
        onOpen(known ?: anime, null)
    }
    val shuffleCatalog = {
        val pool = (trending + seasonal).filter { it.onShelf(shelf) }.distinctBy { it.id }
        if (pool.isNotEmpty()) openCatalog(pool.random())
    }

    val pageColor = LocalKittyPalette.current.page
    Box(modifier = Modifier.fillMaxSize().background(pageColor)) {
        when {
            loading && trending.isEmpty() -> {
                Column(modifier = Modifier.fillMaxSize()) {
                    HomeBar(
                        onRefresh = { reload(fromPull = true) },
                        refreshBusy = catalogBusy,
                        onOpenSearch = onOpenSearch,
                        onOpenAccount = onOpenAccount,
                        avatarUrl = aniListAuth.avatarUrl,
                        onShuffle = shuffleCatalog,
                    )
                    Row(
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 8.dp),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        repeat(4) { index ->
                            ShimmerBox(
                                modifier = Modifier
                                    .width(if (index == 0) 56.dp else 84.dp)
                                    .height(32.dp)
                                    .clip(RoundedCornerShape(16.dp)),
                            )
                        }
                    }
                    ShimmerBox(
                        modifier = Modifier
                            .padding(horizontal = 16.dp)
                            .fillMaxWidth()
                            .height(376.dp)
                            .clip(RoundedCornerShape(22.dp)),
                    )
                    Spacer(modifier = Modifier.height(KittySpace.lg))
                    ContinueSkeletonRow()
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
                        onShuffle = shuffleCatalog,
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
                val nowSec = System.currentTimeMillis() / 1000L
                fun AiringSlot.onLatestShelf(): Boolean {
                    val aired = airingAtEpochSec <= 0L || airingAtEpochSec <= nowSec
                    return aired && anime.onShelf(shelf)
                }
                val latestSlots = airingToday.filter { it.onLatestShelf() }
                val latestDubSlots = latestDub.filter { it.onLatestShelf() }
                val heroItems = trending.filter { it.onShelf(shelf) }
                val topAiringItems = (seasonal + trending)
                    .filter { it.status.equals("RELEASING", ignoreCase = true) && it.onShelf(shelf) }
                    .distinctBy { it.id }
                    .take(8)
                val upcomingItems = upcoming.filter { it.onShelf(shelf) }.take(8)
                val listedIds = history.mapNotNull { entry ->
                    entry.anilistId.takeIf { !entry.listStatus.isNullOrBlank() }
                }.toSet()
                var listedExtra by remember { mutableStateOf(setOf<Int>()) }
                val savedIds = listedIds + listedExtra
                fun addToPlan(anime: AnimeSummary) {
                    if (anime.id in savedIds) return
                    listedExtra = listedExtra + anime.id
                    if (demo || site.anikitty.app.data.demo.DemoLibrary.find(anime.id) != null) return
                    scope.launch {
                        val existing = historyDao.get(anime.id)
                        historyDao.upsert(
                            WatchHistoryEntity(
                                anilistId = anime.id,
                                title = anime.title,
                                coverImageUrl = anime.coverImageUrl ?: existing?.coverImageUrl,
                                episode = existing?.episode ?: 1,
                                positionMs = existing?.positionMs ?: 0L,
                                durationMs = existing?.durationMs ?: 0L,
                                updatedAtEpochMs = System.currentTimeMillis(),
                                listStatus = "PLANNING",
                                malId = anime.malId ?: existing?.malId,
                            ),
                        )
                        val token = aniListAuth.accessToken
                        if (token != null) {
                            aniList.saveList(token, anime.id, status = "PLANNING")
                        }
                    }
                }
                val openAt: (AnimeSummary, Int?) -> Unit = { anime, episode ->
                    val known = site.anikitty.app.data.demo.DemoLibrary.find(anime.id)
                    if (!demo && known == null) {
                        scope.launch { historyDao.touchFromCatalog(anime) }
                    }
                    onOpen(known ?: anime, episode)
                }
                fun watchEpisode(anime: AnimeSummary): Int {
                    val entry = history.firstOrNull { it.anilistId == anime.id } ?: return 1
                    val cap = releasedEpisodes[anime.id]
                    val raw = continueCue(entry, cap)?.episode ?: entry.episode.coerceAtLeast(1)
                    return if (cap != null && cap > 0) raw.coerceAtMost(cap) else raw
                }
                fun railEntries(items: List<AnimeSummary>, dates: Map<Int, String> = emptyMap()) =
                    items.map { anime ->
                        HomeRailEntry(
                            id = anime.id,
                            title = anime.title,
                            imageUrl = anime.coverImageUrl,
                            meta = homeRailMeta(anime, dates[anime.id]),
                            live = anime.status.equals("RELEASING", ignoreCase = true),
                            onClick = { openAt(anime, null) },
                        )
                    }
                BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
                val wideHome = maxWidth >= 600.dp
                LazyColumn(
                    state = homeListState,
                    modifier = Modifier.nestedScroll(rememberDockScroll()),
                    contentPadding = PaddingValues(bottom = 124.dp),
                ) {
                    item(key = "bar", contentType = "bar") {
                        HomeBar(
                            onRefresh = { reload(fromPull = true) },
                            refreshBusy = catalogBusy,
                            onOpenSearch = onOpenSearch,
                            onOpenAccount = onOpenAccount,
                            avatarUrl = aniListAuth.avatarUrl,
                            onShuffle = shuffleCatalog,
                        )
                    }
                    item(key = "shelves", contentType = "chips") {
                        HomeShelfChips(selected = shelf, onSelect = { onShelfName(it.name) })
                    }
                    item(key = "shelf-gap", contentType = "gap") {
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                    val phoneSections = homeLayout.sections()
                    val stageIds = setOf("featured", "fresh", "airing", "upcoming")
                    var stagePlaced = false
                    phoneSections.forEach { section ->
                        if (!section.enabled) return@forEach
                        if (wideHome && section.id in stageIds) {
                            if (!stagePlaced) {
                                stagePlaced = true
                                item(key = "miruro-stage", contentType = "stage") {
                                    val enabled = phoneSections.filter { it.enabled }.map { it.id }.toSet()
                                    HomeMiruroStage(
                                        hero = heroItems,
                                        showHero = "featured" in enabled,
                                        latest = latestSlots,
                                        latestDub = latestDubSlots,
                                        showLatest = "fresh" in enabled,
                                        airing = railEntries(topAiringItems),
                                        showAiring = "airing" in enabled,
                                        upcoming = railEntries(upcomingItems, upcomingDates),
                                        showUpcoming = "upcoming" in enabled,
                                        logos = heroLogos,
                                        savedIds = savedIds,
                                        onOpen = { openAt(it, null) },
                                        onWatch = { anime -> openAt(anime, watchEpisode(anime)) },
                                        onAdd = ::addToPlan,
                                        onLatest = { slot -> openAt(slot.anime, slot.episode) },
                                    )
                                }
                            }
                            return@forEach
                        }
                        when (section.id) {
                            "featured" -> {
                                if (heroItems.isNotEmpty()) item(key = "featured", contentType = "hero") {
                                    HomeFeatured(
                                        items = heroItems,
                                        onOpen = { openAt(it, null) },
                                        onWatch = { anime -> openAt(anime, watchEpisode(anime)) },
                                        onAdd = ::addToPlan,
                                        savedIds = savedIds,
                                        logos = heroLogos,
                                    )
                                }
                            }
                            "continue" -> {
                                if (continueWatching.isNotEmpty() && LookState.abandonedReminders) {
                                    val stale = continueWatching.firstOrNull {
                                        System.currentTimeMillis() - it.updatedAtEpochMs >
                                            14L * 24 * 60 * 60 * 1000
                                    }
                                    if (stale != null) item(key = "stale", contentType = "note") {
                                        val episode = continueCue(stale)?.episode ?: stale.episode
                                        Text(
                                            "You left ${stale.title} a while ago. Episode $episode is still here.",
                                            color = LocalKittyPalette.current.muted,
                                            fontSize = 13.sp,
                                            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                                        )
                                    }
                                }
                                if (continueWatching.isNotEmpty()) item(key = "continue", contentType = "continue") {
                                    HomeBlock(
                                        title = "Continue watching",
                                        subtitle = "Where you left off",
                                        onMore = onSeeAllContinue,
                                    ) {
                                        ContinueWatchRow(
                                            entries = continueWatching,
                                            releasedEpisodes = releasedEpisodes,
                                            onOpen = onResumeContinue,
                                            onOpenTitle = onOpenContinueTitle,
                                            onRemove = { entry ->
                                                ContinueHidden.hide(context, entry.anilistId)
                                            },
                                            onMarkWatched = { entry, episode ->
                                                scope.launch {
                                                    historyDao.markEpisode(summaryFrom(entry), episode)
                                                }
                                            },
                                        )
                                    }
                                }
                            }
                            "top" -> {
                                val rankedSource = if (topWindow == HomeTopWindow.Trending) {
                                    trending
                                } else {
                                    topTen.ifEmpty { trending }
                                }
                                val ranked = rankedSource.filter { it.onShelf(shelf) }
                                if (ranked.isNotEmpty()) item(key = "top10", contentType = "rank") {
                                    HomeBlock(title = "Top 10", subtitle = topWindow.label) {
                                        HomeTopWindowChips(
                                            selected = topWindow,
                                            onSelect = { onTopWindowName(it.name) },
                                        )
                                        HomeRankRow(items = ranked, onOpen = openCatalog)
                                    }
                                }
                            }
                            "fresh" -> {
                                if (latestSlots.isNotEmpty() || latestDubSlots.isNotEmpty()) {
                                    item(key = "fresh", contentType = "fresh") {
                                        HomeLatestEpisodes(
                                            slots = latestSlots,
                                            dubSlots = latestDubSlots,
                                            onOpen = { slot -> openAt(slot.anime, slot.episode) },
                                        )
                                    }
                                }
                            }
                            "upcoming" -> {
                                if (upcomingItems.isNotEmpty()) item(key = "upcoming", contentType = "upcoming") {
                                    HomeRail(
                                        title = "Upcoming",
                                        entries = railEntries(upcomingItems, upcomingDates),
                                    )
                                }
                            }
                            "rated" -> {
                                val shownRated = topRated.filter { it.onShelf(shelf) }
                                if (shownRated.isNotEmpty()) item(key = "rated", contentType = "rated") {
                                    HomeBlock(title = "Top rated", subtitle = "Recent Japanese animation") {
                                        HomePosterRow(items = shownRated, onOpen = openCatalog)
                                    }
                                }
                            }
                            "because" -> because?.let { (title, shows) ->
                                val shownBecause = shows.filter { it.onShelf(shelf) }
                                if (shownBecause.isNotEmpty()) item(key = "because", contentType = "because") {
                                    HomeBlock(title = "Because you watched", subtitle = title) {
                                        HomePosterRow(items = shownBecause, onOpen = openCatalog)
                                    }
                                }
                            }
                            "network" -> networkRow?.let { (name, logo, shows) ->
                                val shownNetwork = shows.filter { it.onShelf(shelf) }
                                if (shownNetwork.isEmpty()) return@let
                                item(key = "network", contentType = "network") {
                                    HomeBlock(title = name, subtitle = "Same network") {
                                        if (!logo.isNullOrBlank()) {
                                            coil.compose.AsyncImage(
                                                model = logo,
                                                contentDescription = name,
                                                modifier = Modifier
                                                    .padding(horizontal = 16.dp)
                                                    .padding(bottom = 8.dp)
                                                    .height(28.dp),
                                            )
                                        }
                                        HomePosterRow(items = shownNetwork, onOpen = openCatalog)
                                    }
                                }
                            }
                            "collection" -> collection?.let { (name, shows) ->
                                val shownCollection = shows.filter { it.onShelf(shelf) }
                                if (shownCollection.isNotEmpty()) item(key = "collection", contentType = "collection") {
                                    HomeBlock(title = name, subtitle = "Same collection") {
                                        HomePosterRow(items = shownCollection, onOpen = openCatalog)
                                    }
                                }
                            }
                            "airing" -> {
                                if (topAiringItems.isNotEmpty()) item(key = "airing", contentType = "airing") {
                                    HomeRail(
                                        title = "Top airing",
                                        entries = railEntries(topAiringItems),
                                    )
                                }
                            }
                            "season" -> {
                                val shownSeason = seasonal.filter { it.onShelf(shelf) }
                                if (shownSeason.isNotEmpty()) item(key = "season", contentType = "posters") {
                                    HomeBlock(
                                        title = "This season",
                                        subtitle = "New this season",
                                        onMore = onOpenSchedule,
                                    ) {
                                        HomePosterGrid(items = shownSeason.take(9), onOpen = openCatalog)
                                    }
                                }
                            }
                            "foryou" -> {
                                val shownForYou = forYou.filter { it.onShelf(shelf) }
                                if (shownForYou.isNotEmpty()) item(key = "foryou", contentType = "posters") {
                                    HomeBlock(
                                        title = "For you",
                                        subtitle = forYouFrom?.let { "Because you watch $it" },
                                    ) {
                                        HomePosterRow(items = shownForYou, onOpen = openCatalog)
                                    }
                                }
                            }
                            "plan" -> if (planToWatch.isNotEmpty()) item(key = "plan", contentType = "posters") {
                                HomeBlock(title = "Plan to watch") {
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
                                                val known = site.anikitty.app.data.demo.DemoLibrary.find(anime.id)
                                                onOpen(known ?: aniList.media(anime.id) ?: anime, null)
                                            }
                                        },
                                    )
                                }
                            }
                            "genres" -> if (shelf == HomeShelf.All) item(key = "genres", contentType = "chips") {
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
                        item(key = "empty-home", contentType = "note") {
                            Text(
                                "Every home row is turned off. Turn them back on in Settings.",
                                color = LocalKittyPalette.current.muted,
                                fontSize = 14.sp,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 12.dp),
                            )
                        }
                    } else if (shelf != HomeShelf.All) {
                        val rankedSource = if (topWindow == HomeTopWindow.Trending) {
                            trending
                        } else {
                            topTen.ifEmpty { trending }
                        }
                        val hasShelfRows = trending.any { it.onShelf(shelf) } ||
                            rankedSource.any { it.onShelf(shelf) } ||
                            airingToday.any { it.anime.onShelf(shelf) } ||
                            upcoming.any { it.onShelf(shelf) } ||
                            topRated.any { it.onShelf(shelf) } ||
                            because?.second?.any { it.onShelf(shelf) } == true ||
                            networkRow?.third?.any { it.onShelf(shelf) } == true ||
                            collection?.second?.any { it.onShelf(shelf) } == true ||
                            seasonal.any { it.onShelf(shelf) } ||
                            forYou.any { it.onShelf(shelf) }
                        if (!hasShelfRows) {
                            item(key = "empty-shelf", contentType = "note") {
                                KittyEmptyState(
                                    title = "Nothing on ${shelf.label}",
                                    body = "This shelf only keeps titles that match. All still has the full home.",
                                )
                            }
                        }
                    }
                }
                }
            }
        }
    }
}

private fun prefetchCovers(context: android.content.Context, animes: List<AnimeSummary>) {
    val loader = coil.Coil.imageLoader(context)
    animes.take(16).forEach { anime ->
        val url = anime.coverImageUrl ?: return@forEach
        loader.enqueue(
            coil.request.ImageRequest.Builder(context)
                .data(url)
                .size(360, 540)
                .memoryCacheKey("$url@360")
                .build(),
        )
    }
}

private fun summaryFrom(entry: WatchHistoryEntity) = AnimeSummary(
    id = entry.anilistId,
    title = entry.title,
    coverImageUrl = entry.coverImageUrl,
    episodes = null,
    format = null,
    averageScore = null,
    malId = entry.malId,
)

@Composable
private fun LookSettings(onExport: () -> Unit) {
    val context = LocalContext.current
    val palette = LocalKittyPalette.current
    val playerPrefs = remember { context.getSharedPreferences("anikitty_player", 0) }
    var startTheater by remember { mutableStateOf(playerPrefs.getBoolean("start_theater", false)) }
    Column(
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Look", color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Text("Accent", color = palette.muted, fontSize = 12.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            LookState.presets.forEach { color ->
                val selected = LookState.accent == color
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(color)
                        .border(
                            if (selected) 2.dp else 1.dp,
                            if (selected) palette.text else palette.hairline,
                            CircleShape,
                        )
                        .clickable { LookState.setAccent(context, color) },
                )
            }
        }
        Text(
            "The accent shows on the dark theme. Light mode stays ink so buttons stay readable.",
            color = palette.muted,
            fontSize = 12.sp,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Open the player full screen",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = startTheater,
                onCheckedChange = {
                    startTheater = it
                    playerPrefs.edit().putBoolean("start_theater", it).apply()
                },
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Remind me about shows I left",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = LookState.abandonedReminders,
                onCheckedChange = { LookState.setAbandonedReminders(context, it) },
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Weekly goal · ${LookState.weekGoalMinutes} min",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Text(
                "−",
                color = palette.text,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable {
                        LookState.setWeekGoal(context, LookState.weekGoalMinutes - 15)
                    }
                    .wrapContentHeight(),
            )
            Text(
                "+",
                color = palette.text,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable {
                        LookState.setWeekGoal(context, LookState.weekGoalMinutes + 15)
                    }
                    .wrapContentHeight(),
            )
        }
        Button(
            onClick = onExport,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = palette.accent,
                contentColor = palette.onAccent,
            ),
        ) {
            Text("Export watch progress", fontWeight = FontWeight.Bold)
        }
        val keyPrefs = remember { context.getSharedPreferences("anikitty_keys", 0) }
        var tmdbKey by remember { mutableStateOf(keyPrefs.getString("tmdb", "") ?: "") }
        var fanartKey by remember { mutableStateOf(keyPrefs.getString("fanart", "") ?: "") }
        Text("Backdrop keys", color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Text(
            "Optional. A key built into the app is used when a field is empty. An entry here replaces it.",
            color = palette.muted,
            fontSize = 12.sp,
        )
        OutlinedTextField(
            value = tmdbKey,
            onValueChange = {
                tmdbKey = it
                keyPrefs.edit().putString("tmdb", it.trim()).apply()
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("TMDB API key") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = palette.text,
                unfocusedTextColor = palette.text,
                focusedBorderColor = palette.accent,
                unfocusedBorderColor = palette.hairline,
                focusedLabelColor = palette.muted,
                unfocusedLabelColor = palette.muted,
            ),
        )
        OutlinedTextField(
            value = fanartKey,
            onValueChange = {
                fanartKey = it
                keyPrefs.edit().putString("fanart", it.trim()).apply()
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("fanart.tv API key") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = palette.text,
                unfocusedTextColor = palette.text,
                focusedBorderColor = palette.accent,
                unfocusedBorderColor = palette.hairline,
                focusedLabelColor = palette.muted,
                unfocusedLabelColor = palette.muted,
            ),
        )
        TmdbCredit()
    }
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
                    HistoryRow(entry, aniList, historyDao, onOpen)
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
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    ContinueWatchCard(
        entry = entry,
        fillWidth = true,
        showWithoutCue = true,
        onOpen = {
            scope.launch {
                onOpen(
                    site.anikitty.app.data.demo.DemoLibrary.find(entry.anilistId)
                        ?: aniList.media(entry.anilistId)
                        ?: summaryFrom(entry),
                )
            }
        },
        onMarkWatched = { episode ->
            scope.launch { historyDao.markEpisode(summaryFrom(entry), episode) }
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
    val palette = LocalKittyPalette.current
    val name = auth.username?.takeIf { it.isNotBlank() } ?: fallbackName
    val days = auth.minutesWatched / 1440
    val score = if (auth.meanScore <= 0f) "—" else auth.meanScore.toInt().toString()
    val syncing = syncLabel == "Syncing…"
    val onBanner = !auth.bannerUrl.isNullOrBlank()
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
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                color = palette.muted,
                modifier = Modifier
                    .defaultMinSize(minHeight = 48.dp)
                    .spacePress(onSignOut),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (onBanner) Color(0xFF0C0C10) else palette.surface)
                .border(0.5.dp, if (onBanner) Color.White.copy(alpha = 0.08f) else palette.hairline, RoundedCornerShape(12.dp)),
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
                            .background(palette.surface),
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
                        color = if (onBanner) Color.White else palette.text,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = if (syncing) "Syncing..." else "Connected",
                        color = if (onBanner) Color.White.copy(alpha = if (syncing) 1f else 0.72f) else palette.muted,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
        if (!auth.about.isNullOrBlank()) {
            Text(
                auth.about.orEmpty(),
                color = palette.muted,
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
                color = palette.muted,
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
        val palette = LocalKittyPalette.current
        Text(
            value,
            color = palette.text,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
        )
        Text(
            label,
            color = palette.muted,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
        )
    }
}

@Composable
internal fun SettingsFeed(
    demo: Boolean = false,
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
    onClose: () -> Unit = {},
    onOpenBuilds: () -> Unit,
    onOpenLibrary: (String) -> Unit = {},
    homeLayout: HomeLayoutStore,
    openAccountTick: Int = 0,
    onExportProgress: () -> Unit = {},
) {
    val palette = LocalKittyPalette.current
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
    BackHandler {
        if (page != "hub") page = "hub" else onClose()
    }
    val selectedName = resolvers.firstOrNull { it.server.id == selectedId }?.server?.name ?: "None selected"
    val homeShown = homeLayout.sections().count { it.enabled }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LocalKittyPalette.current.page)
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
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when (current) {
                "hub" -> {
                    item {
                        SpacePageHeader(
                            title = "Settings",
                            subtitle = if (demo) {
                                "Sample library. Not your AniList account."
                            } else {
                                "Account, home layout, sources, and app look."
                            },
                            onBack = onClose,
                        )
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                            SettingsGroup(title = "You") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsPersonOutline,
                                    title = "Account",
                                    detail = when {
                                        demo -> "Demo library"
                                        isLinked -> aniListAuth.username?.takeIf { it.isNotBlank() }?.let { "@$it" }
                                            ?: accountLabel.ifBlank { "Signed in" }
                                        else -> "Not signed in"
                                    },
                                    avatarUrl = linkTick.let { aniListAuth.avatarUrl },
                                    useAvatar = true,
                                    plain = true,
                                    onClick = { page = "account" },
                                )
                            }
                            SettingsGroup(title = "Library") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsHomeOutline,
                                    title = "Home layout",
                                    detail = "$homeShown rows showing",
                                    plain = true,
                                    onClick = { page = "home" },
                                )
                            }
                            SettingsGroup(title = "Playback") {
                                SettingsHubRow(
                                    icon = Icons.Outlined.Extension,
                                    title = "Sources & store",
                                    detail = selectedName,
                                    plain = true,
                                    onClick = { page = "sources" },
                                )
                            }
                            SettingsGroup(title = "App") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsSettingsOutline,
                                    title = "Appearance",
                                    detail = "Version ${BuildConfig.VERSION_NAME}",
                                    plain = true,
                                    onClick = { page = "app" },
                                )
                            }
                        }
                    }
                }
                "account" -> {
                    item {
                        SpacePageHeader(
                            title = "Account",
                            subtitle = when {
                                demo -> "Sample library. Not your AniList account."
                                isLinked -> "Your AniList profile."
                                else -> "Sign in to load your lists."
                            },
                            onBack = { page = "hub" },
                        )
                    }
                    if (demo) {
                        item {
                            SpaceCard(onClick = onSignOut) {
                                Text(
                                    "Leave demo",
                                    color = palette.text,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Text(
                                    "Returns to sign-in. Your AniList account, if you have one, stays untouched.",
                                    color = palette.text.copy(alpha = 0.5f),
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                    } else if (isLinked) {
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
                                            }.getOrElse { e -> friendlyFailure(e.message) },
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = palette.accent,
                                    contentColor = palette.onAccent,
                                ),
                            ) { Text("Sync now", fontWeight = FontWeight.Bold) }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = palette.text.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                    } else {
                        item {
                            SpaceCard(onClick = { AniListOAuth.openAuthorize(context) }) {
                                Text(
                                    "Connect AniList",
                                    color = palette.text,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Text(
                                    "Your list and the next episode come back with you.",
                                    color = palette.text.copy(alpha = 0.5f),
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = palette.text.copy(alpha = 0.5f),
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
                            subtitle = "Anikoto (kotoplay.to if Anikoto is down), Gotaku, reanime, mkissa, kaa, animex, and xanime ship in the app.",
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
                                containerColor = palette.accent,
                                contentColor = palette.onAccent,
                            ),
                        ) {
                            Text("Open Extension Store", fontWeight = FontWeight.Bold)
                        }
                        if (extensionStatus != null) {
                            Text(
                                extensionStatus!!,
                                color = palette.text.copy(alpha = 0.5f),
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
                                .background(palette.surface)
                                .border(
                                    0.5.dp,
                                    if (selected) palette.text.copy(alpha = 0.45f) else palette.text.copy(alpha = 0.08f),
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
                                            color = palette.text,
                                            fontWeight = FontWeight.SemiBold,
                                            modifier = Modifier.weight(1f, fill = false),
                                        )
                                        if (selected) {
                                            Spacer(modifier = Modifier.width(8.dp))
                                            Text(
                                                "ACTIVE",
                                                modifier = Modifier
                                                    .clip(RoundedCornerShape(999.dp))
                                                    .background(palette.text)
                                                    .padding(horizontal = 8.dp, vertical = 3.dp),
                                                color = palette.page,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp,
                                            )
                                        }
                                    }
                                    Text(
                                        if (isExtension) "Extension" else "Bundled",
                                        color = palette.faint,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                            Text(
                                server.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = palette.muted,
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
                                    Text("Uninstall", color = palette.muted, fontSize = 12.sp)
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
                    item { LookSettings(onExportProgress) }
                    item {
                        Column(
                            modifier = Modifier.padding(horizontal = 20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Text(
                                "Copyright 2026 fampep. Apache License 2.0.",
                                color = palette.text.copy(alpha = 0.45f),
                                fontSize = 13.sp,
                            )
                            TmdbCredit()
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
private fun TmdbCredit() {
    val palette = LocalKittyPalette.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(
            painter = androidx.compose.ui.res.painterResource(site.anikitty.app.R.drawable.tmdb_logo),
            contentDescription = "The Movie Database",
            modifier = Modifier
                .height(16.dp)
                .width(22.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            "This product uses the TMDB API but is not endorsed or certified by TMDB.",
            color = palette.muted,
            fontSize = 12.sp,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
private fun SettingsGroup(
    title: String,
    content: @Composable () -> Unit,
) {
    val palette = LocalKittyPalette.current
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            title,
            color = palette.muted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.6.sp,
            modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(site.anikitty.app.ui.theme.KittyRadius.lg))
                .background(palette.surface)
                .border(0.5.dp, palette.hairline, RoundedCornerShape(site.anikitty.app.ui.theme.KittyRadius.lg)),
            content = { content() },
        )
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
    plain: Boolean = false,
) {
    val palette = LocalKittyPalette.current
    val row: @Composable () -> Unit = {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 2.dp),
        ) {
            if (useAvatar) {
                ProfileMark(imageUrl = avatarUrl, size = 40.dp)
            } else {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(palette.page),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = palette.text, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = palette.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                )
                Text(
                    detail,
                    color = palette.muted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(
                Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = palette.faint,
                modifier = Modifier.size(22.dp),
            )
        }
    }
    if (plain) {
        Box(modifier = Modifier.fillMaxWidth().spacePress(onClick).padding(horizontal = 14.dp, vertical = 15.dp)) {
            row()
        }
    } else {
        SpaceCard(onClick = onClick) { row() }
    }
}

@Composable
private fun TitleDetailScreen(
    anime: AnimeSummary,
    initialEpisode: Int?,
    autoPlay: Boolean = false,
    streamServers: ServerCatalog,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    onBack: () -> Unit,
    onChangeSource: () -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
    onOpenGenre: (String) -> Unit,
    aniListAuth: AniListAuthStore,
    onPlay: (episode: Int, sources: List<PlayableSource>, anime: AnimeSummary) -> Unit,
    posterModifier: Modifier = Modifier,
) {
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val selectedId by streamServers.selectedId.collectAsState()
    val resolvers by streamServers.resolvers.collectAsState()
    val activeServer = remember(selectedId, resolvers) {
        resolvers.firstOrNull { it.server.id == selectedId }?.server
            ?: resolvers.firstOrNull()?.server
    }
    // Keyed by anime.id so related/season navigation never reuses prior episode/audio/comments.
    var detail by remember(anime.id) {
        mutableStateOf(site.anikitty.app.data.demo.DemoLibrary.find(anime.id) ?: anime)
    }
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
    var resumeAtMs by remember(anime.id) { mutableLongStateOf(0L) }
    var resumeEpisode by remember(anime.id) { mutableIntStateOf(0) }
    var resumeDurationMs by remember(anime.id) { mutableLongStateOf(0L) }
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
    LaunchedEffect(anime.id, episode, rangeCount) {
        browseRange = ((episode - 1) / episodePageSize).coerceIn(0, (rangeCount - 1).coerceAtLeast(0))
    }

    LaunchedEffect(anime.id, initialEpisode) {
        detail = anime
        detailLoading = !anime.detailLoaded
        resolving = false
        status = null
        val sampleHistory = site.anikitty.app.data.demo.DemoLibrary.history
            .firstOrNull { it.anilistId == anime.id }
        val history = sampleHistory ?: historyDao.get(anime.id)
        val cue = history?.let { continueCue(it) }
        lastWatchedEp = history?.episode ?: 0
        if (history != null && cue != null && !cue.next) {
            resumeAtMs = history.positionMs
            resumeEpisode = cue.episode
            resumeDurationMs = history.durationMs
        } else {
            resumeAtMs = 0L
            resumeEpisode = 0
            resumeDurationMs = 0L
        }
        episode = when {
            initialEpisode != null -> initialEpisode.coerceAtLeast(1)
            cue != null -> cue.episode
            else -> 1
        }
        audio = watchPrefs.getString("audio", "sub")?.takeIf { it == "dub" } ?: "sub"
        listStatus = history?.listStatus
        listBadge = listStatusBadge(history?.listStatus)
        favourite = anime.isFavourite
        if (sampleHistory != null) {
            detailLoading = false
        } else if (!anime.detailLoaded || aniListAuth.isLinked) {
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
                        val requested = initialEpisode?.coerceAtLeast(1)
                        val watched = history?.episode?.coerceAtLeast(0) ?: 0
                        val hasPlayback = history != null &&
                            (history.positionMs > 0L || history.durationMs > 0L)
                        val cap = when {
                            requested != null -> maxOf(freshMax, requested)
                            cue == null || cue.episode <= freshMax -> freshMax
                            // Still inside an episode the shelf does not list yet.
                            !cue.next -> cue.episode
                            // Finished that episode: stay on it, not one past the shelf.
                            hasPlayback && watched > freshMax -> watched
                            // Mark-watched and an AniList frontier store the next
                            // episode with no playback. Don't select it if it is not out.
                            else -> freshMax
                        }
                        episode = episode.coerceIn(1, cap)
                    }
                }
            detailLoading = false
        } else {
            detailLoading = false
        }
    }

    fun rememberListLocally(status: String, progress: Int) {
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) return
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

    fun removeFromList() {
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) {
            listStatus = null
            listBadge = null
            return
        }
        val token = aniListAuth.accessToken ?: run {
            status = "Sign in to edit your list"
            return
        }
        if (listBusy) return
        val previous = listStatus
        listBusy = true
        listStatus = null
        listBadge = null
        scope.launch {
            val lookup = aniList.lookupListEntryId(token, detail.id)
            val ok = lookup.fold(
                onSuccess = { id -> id == null || aniList.deleteListEntry(token, id) },
                onFailure = { false },
            )
            listBusy = false
            if (ok) {
                historyDao.get(detail.id)?.let { existing ->
                    historyDao.upsert(
                        existing.copy(
                            listStatus = null,
                            updatedAtEpochMs = System.currentTimeMillis(),
                        ),
                    )
                }
            } else {
                listStatus = previous
                listBadge = listStatusBadge(previous)
                status = "Could not update your list"
            }
        }
    }

    fun applyListStatus(next: String) {
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) {
            if (listStatus.equals(next, ignoreCase = true)) {
                listStatus = null
                listBadge = null
            } else {
                listStatus = next
                listBadge = listStatusBadge(next)
            }
            return
        }
        val token = aniListAuth.accessToken ?: run {
            status = "Sign in to save this to a list"
            return
        }
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
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) {
            listScore = if (listScore / 10 == point) 0 else point * 10
            return
        }
        val token = aniListAuth.accessToken ?: run {
            status = "Sign in to save a score"
            return
        }
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
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) {
            favourite = !favourite
            return
        }
        val token = aniListAuth.accessToken ?: return
        val next = !favourite
        favourite = next
        scope.launch {
            val ok = runCatching { aniList.toggleFavourite(token, detail.id) }.isSuccess
            if (!ok) favourite = !next
        }
    }

    fun playSelected(number: Int = episode) {
        val playEpisode = number.coerceAtLeast(1)
        episode = playEpisode
        scope.launch {
            resolving = true
            status = "Getting stream…"
            val sample = site.anikitty.app.data.demo.DemoLibrary.clip(context, detail.id)
            if (sample != null) {
                site.anikitty.app.data.servers.SourceBadgeCache.remember(
                    context,
                    detail.id,
                    playEpisode,
                    listOf(sample),
                )
                onPlay(playEpisode, listOf(sample), detail)
                status = null
                resolving = false
                return@launch
            }
            runCatching {
                historyDao.touchFromCatalog(detail)
                val resolved = streamServers.resolveWithFailover(
                    anilistId = detail.id,
                    episode = playEpisode,
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
                    val sameEpisode = it.episode == playEpisode
                    historyDao.upsert(
                        it.copy(
                            episode = playEpisode,
                            positionMs = if (sameEpisode) it.positionMs else 0L,
                            durationMs = if (sameEpisode) it.durationMs else 0L,
                            updatedAtEpochMs = System.currentTimeMillis(),
                        ),
                    )
                }
                lastWatchedEp = playEpisode
                site.anikitty.app.data.servers.SourceBadgeCache.remember(
                    context,
                    detail.id,
                    playEpisode,
                    resolved.sources,
                )
                onPlay(playEpisode, resolved.sources, detail)
                status = if (resolved.usedFallback) {
                    "Playing via ${resolved.server.name}"
                } else {
                    null
                }
            }.onFailure {
                status = friendlyFailure(it.message ?: "All installed providers failed")
            }
            resolving = false
        }
    }

    LaunchedEffect(anime.id, autoPlay) {
        if (autoPlay) playSelected(initialEpisode ?: episode)
    }

    fun openUrl(url: String) {
        runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }
    }

    val finishedThrough = maxOf(
        detail.listState?.progress ?: 0,
        (lastWatchedEp - 1).coerceAtLeast(0),
    )
    val rangeStart = browseRange * episodePageSize + 1
    val rangeEnd = minOf(maxEp, rangeStart + episodePageSize - 1)
    val episodeSlides = episodeList
        .filter { it.number in rangeStart..rangeEnd }
        .map { item ->
            EpisodeSlide(
                number = item.number,
                title = item.title,
                imageUrl = item.thumbnailUrl?.takeIf { it.isNotBlank() },
                marker = item.marker,
            )
        }
    val sampleTitle = site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null
    TitleStage(
        detail = detail,
        posterModifier = posterModifier,
        detailLoading = detailLoading,
        episode = episode,
        maxEp = maxEp,
        audio = audio,
        onAudio = { next ->
            audio = next
            watchPrefs.edit().putString("audio", next).apply()
        },
        resumeEpisode = resumeEpisode,
        resumeAtMs = resumeAtMs,
        resumeDurationMs = resumeDurationMs,
        lastWatchedEp = lastWatchedEp,
        watchedThrough = finishedThrough,
        resolving = resolving,
        status = status,
        listStatus = listStatus,
        listScore = listScore,
        favourite = favourite,
        canEditList = sampleTitle || aniListAuth.isLinked,
        activeServer = activeServer,
        episodeSlides = episodeSlides,
        rangeCount = rangeCount,
        browseRange = browseRange,
        episodePageSize = episodePageSize,
        seasonTabs = seasonTabs,
        epJump = epJump,
        onEpJump = { epJump = it },
        onJumpCommit = {
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
        onBrowseRange = { browseRange = it },
        onPickEpisode = { episode = it },
        onPlayEpisode = { playSelected(it) },
        onToggleWatched = { number ->
            if (!sampleTitle) {
                scope.launch {
                    historyDao.markEpisode(detail, number)
                    lastWatchedEp = historyDao.get(detail.id)?.episode ?: lastWatchedEp
                }
            }
        },
        onPlay = { playSelected() },
        onBack = onBack,
        onMyList = {
            if (listStatus == null) applyListStatus("PLANNING") else removeFromList()
        },
        onListStatus = { applyListStatus(it) },
        onRemoveFromList = { removeFromList() },
        onScore = { applyScore(it) },
        onFavourite = { toggleFavourite() },
        onShare = { shareTitle(context, detail) },
        onTrailer = when {
            detail.trailer?.watchUrl() != null -> {
                val watch = detail.trailer?.watchUrl()
                if (watch != null) {
                    { openUrl(watch) }
                } else {
                    null
                }
            }
            sampleTitle -> {
                { playSelected() }
            }
            else -> null
        },
        onSources = onChangeSource,
        onOpenUrl = { openUrl(it) },
        onOpenRelated = onOpenRelated,
        onOpenRelation = { season ->
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
        },
        onOpenGenre = onOpenGenre,
        loadAudioAvailability = if (sampleTitle) {
            null
        } else {
            { title ->
                streamServers.anikotoAudioAvailability(title.id, title.streamTitleHint())
            }
        },
    )
}

@Composable
private fun EpisodeTool(
    label: String,
    enabled: Boolean,
    selected: Boolean = false,
    onClick: () -> Unit,
) {
    val palette = LocalKittyPalette.current
    val filled = selected
    val background by animateColorAsState(
        if (filled) palette.accent else palette.surface,
        tween(180),
        label = "toolBg",
    )
    val tint = when {
        filled -> palette.onAccent
        enabled -> palette.text.copy(alpha = 0.85f)
        else -> palette.text.copy(alpha = 0.3f)
    }
    Box(
        modifier = Modifier
            .height(36.dp)
            .then(if (enabled) Modifier.spacePress(onClick) else Modifier)
            .clip(RoundedCornerShape(16.dp))
            .background(background)
            .border(
                0.5.dp,
                if (filled) palette.accent else palette.hairline,
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
            title,
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            letterSpacing = (-0.2).sp,
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

private fun formatAiring(epochSec: Long): String {
    val fmt = java.text.SimpleDateFormat("EEE, MMM d · h:mm a", java.util.Locale.getDefault())
    return fmt.format(java.util.Date(epochSec * 1000L))
}

@Composable
private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    site.anikitty.app.ui.components.KittyChip(label = label, selected = selected, onClick = onClick)
}
