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

private sealed class Screen {
    data object Tabs : Screen()
    data class Detail(
        val anime: AnimeSummary,
        val startEpisode: Int? = null,
        val coverKey: String? = null,
    ) : Screen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
        val coverKey: String? = null,
    ) : Screen()
    data object Schedule : Screen()
    data object Builds : Screen()
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
) {
    val context = LocalContext.current
    val homeLayout = remember { HomeLayoutStore(context) }
    // Tab survives recreation; detail/player stack relies on configChanges in the manifest
    // so landscape lock in PlayerScreen does not wipe navigation.
    var tab by rememberSaveable {
        mutableStateOf("home")
    }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }
    /** Cover in flight. Null on a settled tab list, so posters stay ordinary images. */
    var activeCoverKey by remember { mutableStateOf<String?>(null) }
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

    fun openDetail(
        anime: AnimeSummary,
        startEpisode: Int? = null,
        pushCurrent: Boolean = false,
        coverKey: String? = null,
    ) {
        activeCoverKey = coverKey
        val next = Screen.Detail(anime, startEpisode, coverKey)
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
                    onOpen = { anime, ep, key -> openDetail(anime, ep, coverKey = key) },
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
                    homeLayout = homeLayout,
                )
                "schedule" -> ScheduleFeed(
                    aniList = aniList,
                    onBack = { tab = "home" },
                    onOpen = { anime, key -> openDetail(anime, coverKey = key) },
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
                    onOpen = { anime, key -> openDetail(anime, coverKey = key) },
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
                    onOpen = { anime, key -> openDetail(anime, coverKey = key) },
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


    val shown = screen
    if (shown is Screen.Player) {
        val current = shown
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
                        screen = Screen.Player(current.anime, nextEpisode, resolved.sources, current.coverKey)
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
                    // Detail stays out of the player tree. Keep the cover armed for the trip home.
                    activeCoverKey = current.coverKey
                    screen = Screen.Detail(current.anime, current.episode, current.coverKey)
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
    } else {
        SharedTransitionLayout(modifier = Modifier.fillMaxSize()) {
            CompositionLocalProvider(
                LocalSharedTransitionScope provides this,
                LocalActiveCoverKey provides activeCoverKey,
            ) {
                val screenTransition = updateTransition(targetState = screen, label = "screen")
                LaunchedEffect(screenTransition.isRunning, screenTransition.currentState) {
                    if (screenTransition.isRunning) return@LaunchedEffect
                    when (val settled = screenTransition.currentState) {
                        is Screen.Tabs -> activeCoverKey = null
                        is Screen.Detail -> activeCoverKey = settled.coverKey
                        else -> Unit
                    }
                }
                screenTransition.AnimatedContent(
                    modifier = Modifier.fillMaxSize(),
                    contentKey = { state ->
                        when (state) {
                            is Screen.Detail -> "detail-${state.anime.id}-${state.coverKey}"
                            is Screen.Player -> "player"
                            Screen.Tabs -> "tabs"
                            Screen.Schedule -> "schedule"
                            Screen.Builds -> "builds"
                        }
                    },
                    transitionSpec = {
                        (fadeIn(tween(280)) togetherWith fadeOut(tween(200))) using
                            SizeTransform(clip = false) { _, _ -> snap() }
                    },
                ) { current ->
                    val navScope = this
                    CompositionLocalProvider(LocalNavAnimatedVisibilityScope provides navScope) {
                        when (current) {
                            is Screen.Player -> Unit
                            Screen.Schedule -> {
                                ScheduleFeed(
                                    aniList = aniList,
                                    onBack = { screen = Screen.Tabs },
                                    onOpen = { anime, key -> openDetail(anime, coverKey = key) },
                                    followedEpisodes = followedEpisodes,
                                )
                            }
                            Screen.Builds -> {
                                BuildChannelPage(onBack = { screen = Screen.Tabs })
                            }
                            is Screen.Detail -> {
                                TitleDetailScreen(
                                    anime = current.anime,
                                    initialEpisode = current.startEpisode,
                                    sharedKey = current.coverKey,
                                    streamServers = streamServers,
                                    historyDao = historyDao,
                                    aniList = aniList,
                                    onBack = { popDetailOrTabs() },
                                    onChangeSource = {
                                        activeCoverKey = null
                                        detailBackStack = emptyList()
                                        screen = Screen.Tabs
                                        tab = "store"
                                    },
                                    onOpenRelated = { related, key ->
                                        openDetail(related, pushCurrent = true, coverKey = key)
                                    },
                                    onOpenGenre = { genre ->
                                        activeCoverKey = null
                                        searchGenre = genre
                                        detailBackStack = emptyList()
                                        screen = Screen.Tabs
                                        tab = "search"
                                    },
                                    aniListAuth = aniListAuth,
                                    onPlay = { episode, sources, resolvedAnime ->
                                        screen = Screen.Player(resolvedAnime, episode, sources, current.coverKey)
                                    },
                                )
                            }
                            Screen.Tabs -> {
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
                        }
                    }
                }
            }
        }
    }
