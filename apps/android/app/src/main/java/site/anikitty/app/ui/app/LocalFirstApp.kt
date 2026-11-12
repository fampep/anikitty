package site.anikitty.app.ui.app

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.IconButton
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
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.anilist.AnimeEpisodeItem
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.fribb.EpisodeThumbResolver
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.AnimatedSearchIcon
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.components.KittyBottomNav
import site.anikitty.app.ui.components.KittyContinueCard
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyHero
import site.anikitty.app.ui.components.KittyMetaChip
import site.anikitty.app.ui.components.KittyMetaChips
import site.anikitty.app.ui.components.KittyNavTab
import site.anikitty.app.ui.components.KittyPageHeader
import site.anikitty.app.ui.components.KittyPosterCard
import site.anikitty.app.ui.components.KittyPosterRow
import site.anikitty.app.ui.components.KittyPosterSkeletonRow
import site.anikitty.app.ui.components.KittyRoundIconButton
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyAtmosphere
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyGlass
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyGlassShapeTight
import site.anikitty.app.ui.theme.KittyGlassStrong
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText
import site.anikitty.app.ui.theme.kittyGlass
import site.anikitty.app.ui.theme.kittyGlassField
import site.anikitty.app.ui.theme.kittyGlassMirror
import site.anikitty.app.ui.theme.kittyGlassSoft

private sealed class Screen {
    data object Tabs : Screen()
    data class Detail(val anime: AnimeSummary, val startEpisode: Int? = null) : Screen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
    ) : Screen()
}

@Composable
fun LocalFirstApp(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    api: DedicatedApiClient,
    accountLabel: String,
    pendingAniListToken: String? = null,
    pendingAniListError: String? = null,
    onConsumedAniListToken: () -> Unit = {},
    onSignOut: () -> Unit,
) {
    // Tab survives recreation; detail/player stack relies on configChanges in the manifest
    // so landscape lock in PlayerScreen does not wipe navigation.
    var tab by rememberSaveable { mutableStateOf("home") }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }
    /** Prior detail frames when drilling into related / other seasons. */
    var detailBackStack by remember { mutableStateOf<List<Screen.Detail>>(emptyList()) }
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    var syncLabel by remember { mutableStateOf<String?>(null) }
    var aniLinkStatus by remember { mutableStateOf<String?>(null) }
    var aniLinkTick by remember { mutableIntStateOf(0) }

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
                onConsumedAniListToken()
            }
            !pendingAniListToken.isNullOrBlank() -> {
                screen = Screen.Tabs
                tab = "settings"
                if (aniListAuth.isLinked) {
                    aniLinkStatus = "AniList already linked — unlink first to switch accounts"
                    onConsumedAniListToken()
                } else {
                    aniLinkStatus = "Linking AniList…"
                    aniLinkStatus = runCatching {
                        val viewer = aniList.viewer(pendingAniListToken)
                            ?: error("Invalid AniList token")
                        aniListAuth.saveViewer(pendingAniListToken, viewer)
                        val synced = runCatching { aniListSync.pull() }.getOrNull()
                        aniLinkTick++
                        if (synced != null) {
                            syncLabel = "Synced ${synced.imported} from AniList"
                            "Linked @${viewer.name} · synced ${synced.imported} titles"
                        } else {
                            "Linked @${viewer.name}"
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
            KittyNavTab("home", "Home", Icons.Outlined.Home, Icons.Filled.Home),
            KittyNavTab("search", "Search", Icons.Outlined.Search, Icons.Filled.Search),
            KittyNavTab("store", "Store", Icons.Outlined.Extension, Icons.Filled.Extension),
            KittyNavTab("history", "Library", Icons.Outlined.History, Icons.Rounded.History),
            KittyNavTab("settings", "Account", Icons.Outlined.Person, Icons.Filled.Person),
        )
    }

    when (val current = screen) {
        is Screen.Player -> {
            var resumeMs by remember(current.anime.id, current.episode) { mutableStateOf(0L) }
            LaunchedEffect(current.anime.id, current.episode) {
                val entry = historyDao.get(current.anime.id)
                if (entry != null && entry.episode == current.episode && entry.positionMs > 2_000L) {
                    resumeMs = entry.positionMs
                }
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
                malId = current.anime.malId,
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
                    val total = current.anime.episodes
                    val hasNext = total == null || current.episode < total
                    if (!hasNext) {
                        null
                    } else {
                        {
                            scope.launch {
                                val next = current.episode + 1
                                runCatching {
                                    val resolved = streamServers.resolveWithFailover(
                                        anilistId = current.anime.id,
                                        episode = next,
                                        audio = "sub",
                                        titleHint = current.anime.searchTitles().joinToString(" || "),
                                    )
                                    val existing = historyDao.get(current.anime.id)
                                    historyDao.upsert(
                                        WatchHistoryEntity(
                                            anilistId = current.anime.id,
                                            title = current.anime.title,
                                            coverImageUrl = current.anime.coverImageUrl,
                                            episode = next,
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
                                            episode = next,
                                            totalEpisodes = current.anime.episodes,
                                        )
                                    }
                                    screen = Screen.Player(current.anime, next, resolved.sources)
                                }
                            }
                        }
                    }
                },
            )
            return
        }
        is Screen.Detail -> {
            TitleDetailScreen(
                anime = current.anime,
                initialEpisode = current.startEpisode,
                streamServers = streamServers,
                historyDao = historyDao,
                aniList = aniList,
                api = api,
                onBack = { popDetailOrTabs() },
                onChangeSource = {
                    detailBackStack = emptyList()
                    screen = Screen.Tabs
                    tab = "store"
                },
                onOpenRelated = { related ->
                    openDetail(related, pushCurrent = true)
                },
                onPlay = { episode, sources, resolvedAnime ->
                    screen = Screen.Player(resolvedAnime, episode, sources)
                },
            )
            return
        }
        Screen.Tabs -> Unit
    }

    Box(modifier = Modifier.fillMaxSize()) {
        KittyAtmosphere()
        AnimatedContent(
            targetState = tab,
            transitionSpec = {
                fadeIn(animationSpec = androidx.compose.animation.core.tween(180)) togetherWith
                    fadeOut(animationSpec = androidx.compose.animation.core.tween(120))
            },
            label = "tabFade",
            modifier = Modifier.fillMaxSize(),
        ) { currentTab ->
            when (currentTab) {
                "home" -> HomeFeed(
                    aniList = aniList,
                    aniListAuth = aniListAuth,
                    history = history,
                    historyDao = historyDao,
                    onOpen = { anime, ep -> openDetail(anime, ep) },
                    onOpenSearch = { tab = "search" },
                    accountLabel = accountLabel,
                )
                "search" -> SearchFeed(
                    aniList = aniList,
                    historyDao = historyDao,
                    onOpen = { openDetail(it) },
                )
                "store" -> ExtensionStoreFeed(catalog = streamServers)
                "history" -> HistoryFeed(
                    history = history,
                    historyDao = historyDao,
                    aniList = aniList,
                    aniListLinked = aniListAuth.isLinked,
                    syncLabel = syncLabel,
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
                )
                "settings" -> SettingsFeed(
                    catalog = streamServers,
                    api = api,
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
                    onSignOut = onSignOut,
                    onOpenStore = { tab = "store" },
                )
            }
        }

        KittyBottomNav(
            tabs = tabs,
            selectedId = tab,
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
    onOpenSearch: () -> Unit,
    accountLabel: String,
) {
    val homeDisplayName = aniListAuth.username?.takeIf { it.isNotBlank() }
        ?: accountLabel.takeIf { it.isNotBlank() }
        ?: "Guest"
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()
    var catalogJob by remember { mutableStateOf<Job?>(null) }
    val catalogBusy = loading || refreshing
    val continueWatching = remember(history) {
        history.filter {
            val s = it.listStatus?.uppercase()
            s == null || s == "CURRENT" || s == "REPEATING"
        }.ifEmpty { history }.take(12)
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
                    val p = async { aniList.popular(forceRefresh = fromPull) }
                    val s = async { aniList.seasonal(forceRefresh = fromPull) }
                    trending = t.await()
                    popular = p.await()
                    seasonal = s.await()
                }
            }.onFailure { error = it.message ?: "Failed to load" }
            loading = false
            refreshing = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            loading && trending.isEmpty() -> {
                LazyColumn(contentPadding = PaddingValues(bottom = 100.dp)) {
                    item {
                        HomeWelcomeHeader(
                            displayName = homeDisplayName,
                            onRefresh = { reload(fromPull = true) },
                            refreshBusy = catalogBusy,
                            onOpenSearch = onOpenSearch,
                        )
                    }
                    item { KittyPosterSkeletonRow("Trending Anime") }
                    item { KittyPosterSkeletonRow("Most popular") }
                }
            }
            error != null && trending.isEmpty() -> {
                Column(
                    modifier = Modifier
                        .align(Alignment.Center)
                        .padding(24.dp)
                        .fillMaxWidth(),
                ) {
                    HomeWelcomeHeader(
                        displayName = homeDisplayName,
                        onRefresh = { reload(fromPull = true) },
                        refreshBusy = catalogBusy,
                        onOpenSearch = onOpenSearch,
                    )
                    Spacer(modifier = Modifier.height(28.dp))
                    KittyEmptyState(
                        title = "Couldn’t load the catalog",
                        body = error ?: "Check your connection and try again.",
                        actionLabel = "Retry",
                        onAction = { reload() },
                    )
                }
            }
            else -> {
                LazyColumn(contentPadding = PaddingValues(bottom = 100.dp)) {
                    item {
                        HomeWelcomeHeader(
                            displayName = homeDisplayName,
                            onRefresh = { reload(fromPull = true) },
                            refreshBusy = catalogBusy,
                            onOpenSearch = onOpenSearch,
                        )
                    }
                    item {
                        KittyPosterRow(
                            title = "Trending Anime",
                            items = trending,
                            onMore = onOpenSearch,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(it) }
                                onOpen(it, null)
                            },
                        )
                    }
                    item {
                        KittyPosterRow(
                            title = "Most popular",
                            items = popular,
                            onMore = onOpenSearch,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(it) }
                                onOpen(it, null)
                            },
                        )
                    }
                    if (continueWatching.isNotEmpty()) {
                        item {
                            Column(modifier = Modifier.padding(top = 18.dp, bottom = 4.dp)) {
                                KittySectionHeading(title = "Continue watching")
                                Spacer(modifier = Modifier.height(12.dp))
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 12.dp),
                                    horizontalArrangement = Arrangement.spacedBy(10.dp),
                                ) {
                                    lazyItems(continueWatching, key = { it.anilistId }) { entry ->
                                        KittyContinueCard(
                                            title = entry.title,
                                            coverUrl = entry.coverImageUrl,
                                            episode = entry.episode,
                                            positionMs = entry.positionMs,
                                            durationMs = entry.durationMs,
                                            badge = listStatusBadge(entry.listStatus),
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
                                                    onOpen(detail, entry.episode)
                                                }
                                            },
                                        )
                                    }
                                }
                            }
                        }
                    }
                    item {
                        KittyPosterRow(
                            title = "Airing this season",
                            items = seasonal,
                            onMore = onOpenSearch,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(it) }
                                onOpen(it, null)
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HomeWelcomeHeader(
    displayName: String,
    onRefresh: () -> Unit,
    refreshBusy: Boolean = false,
    onOpenSearch: (() -> Unit)? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 14.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(
            modifier = Modifier
                .size(48.dp)
                .clip(CircleShape)
                .background(KittyAccent),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Filled.Person,
                contentDescription = null,
                tint = KittyOnAccent,
                modifier = Modifier.size(26.dp),
            )
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 12.dp),
        ) {
            Text(
                "Welcome back",
                color = KittyAccentGlow,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
            )
            Text(
                displayName,
                color = KittyText,
                style = MaterialTheme.typography.titleLarge,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            if (onOpenSearch != null) {
                KittyRoundIconButton(onClick = onOpenSearch) {
                    Icon(
                        Icons.Rounded.Search,
                        contentDescription = "Search",
                        tint = KittyText,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
            KittyRoundIconButton(onClick = onRefresh) {
                if (refreshBusy) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(18.dp),
                        strokeWidth = 2.dp,
                        color = KittyAccentGlow,
                    )
                } else {
                    Icon(
                        Icons.Rounded.Refresh,
                        contentDescription = "Refresh",
                        tint = KittyText,
                        modifier = Modifier.size(20.dp),
                    )
                }
            }
        }
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
private fun SearchFeed(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var discover by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var recentRaw by rememberSaveable { mutableStateOf("") }
    val recent = remember(recentRaw) {
        recentRaw.split('\u001f').map { it.trim() }.filter { it.isNotEmpty() }
    }
    val scope = rememberCoroutineScope()
    var searchJob by remember { mutableStateOf<Job?>(null) }

    fun rememberQuery(q: String) {
        val trimmed = q.trim()
        if (trimmed.length < 2) return
        val next = (listOf(trimmed) + recent.filterNot { it.equals(trimmed, ignoreCase = true) })
            .take(8)
        recentRaw = next.joinToString("\u001f")
    }

    fun runSearch(raw: String) {
        val q = raw.trim()
        searchJob?.cancel()
        if (q.length < 2) {
            items = emptyList()
            error = null
            loading = false
            return
        }
        searchJob = scope.launch {
            delay(350)
            loading = true
            error = null
            runCatching { aniList.search(q) }
                .onSuccess {
                    items = it
                    if (it.isNotEmpty()) rememberQuery(q)
                }
                .onFailure { error = it.message }
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        runCatching { aniList.trending(perPage = 12) }
            .onSuccess { discover = it }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp)
            .padding(top = 12.dp, bottom = 100.dp),
    ) {
        KittyPageHeader(
            title = "Search",
            subtitle = "Find something to watch",
        )
        Spacer(modifier = Modifier.height(14.dp))
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                runSearch(it)
            },
            modifier = Modifier
                .fillMaxWidth()
                .kittyGlassField(RoundedCornerShape(16.dp)),
            singleLine = true,
            placeholder = { Text("Title, studio, or character", color = KittyFaint) },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = KittyText,
                unfocusedTextColor = KittyText,
                cursorColor = KittyAccentGlow,
                focusedBorderColor = KittyAccentGlow.copy(alpha = 0.45f),
                unfocusedBorderColor = Color.Transparent,
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
            ),
            leadingIcon = {
                AnimatedSearchIcon(
                    tint = if (query.isNotBlank()) KittyAccentGlow else KittyMuted,
                    active = query.isBlank() || loading,
                )
            },
            trailingIcon = {
                if (query.isNotEmpty()) {
                    IconButton(
                        onClick = {
                            query = ""
                            runSearch("")
                        },
                    ) {
                        Icon(Icons.Rounded.Clear, contentDescription = "Clear search", tint = KittyMuted)
                    }
                }
            },
            shape = RoundedCornerShape(16.dp),
        )
        if (recent.isNotEmpty() && query.isBlank()) {
            Spacer(modifier = Modifier.height(10.dp))
            Text(
                "Recent",
                color = Color.White.copy(alpha = 0.45f),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                recent.forEach { q ->
                    Chip(q, selected = false) {
                        query = q
                        runSearch(q)
                    }
                }
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        when {
            loading -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = Color.White)
            }
            error != null && items.isEmpty() -> Text(error!!, color = MaterialTheme.colorScheme.error)
            items.isNotEmpty() -> Column(modifier = Modifier.weight(1f)) {
                Text(
                    "${items.size} result${if (items.size == 1) "" else "s"}",
                    color = KittyFaint,
                    style = MaterialTheme.typography.labelMedium,
                    fontWeight = FontWeight.SemiBold,
                    modifier = Modifier.padding(bottom = 10.dp),
                )
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(110.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    gridItems(items, key = { it.id }) { anime ->
                        KittyPosterCard(
                            anime = anime,
                            onClick = {
                                scope.launch { historyDao.touchFromCatalog(anime) }
                                onOpen(anime)
                            },
                            width = 110.dp,
                        )
                    }
                }
            }
            query.trim().length >= 2 && items.isEmpty() && !loading -> {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .kittyGlass(KittyGlassShape)
                        .padding(18.dp),
                ) {
                    Text(
                        "No titles matched “${query.trim()}”",
                        color = KittyText,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        "Try another spelling or a shorter title.",
                        color = KittyMuted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
            else -> {
                KittySectionHeading(
                    title = if (query.isBlank()) "Trending picks" else "Keep typing…",
                    subtitle = if (query.isBlank()) {
                        "Tap a poster to open"
                    } else {
                        "Need at least 2 characters"
                    },
                    padded = false,
                )
                Spacer(modifier = Modifier.height(10.dp))
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(110.dp),
                    verticalArrangement = Arrangement.spacedBy(14.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f),
                ) {
                    gridItems(discover, key = { it.id }) { anime ->
                        KittyPosterCard(
                            anime = anime,
                            onClick = {
                                scope.launch { historyDao.touchFromCatalog(anime) }
                                onOpen(anime)
                            },
                            width = 110.dp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryFeed(
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    aniListLinked: Boolean,
    syncLabel: String?,
    onSync: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    val watching = history.filter {
        val s = it.listStatus?.uppercase()
        s == null || s == "CURRENT" || s == "REPEATING"
    }
    val completed = history.filter { it.listStatus.equals("COMPLETED", ignoreCase = true) }
    val other = history.filter { entry ->
        watching.none { it.anilistId == entry.anilistId } &&
            completed.none { it.anilistId == entry.anilistId }
    }

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
                subtitle = when {
                    aniListLinked -> syncLabel ?: "Synced from AniList + this device"
                    else -> "Kept on this device"
                },
                trailing = if (aniListLinked) {
                    {
                        TextButton(
                            onClick = onSync,
                            modifier = Modifier.kittyGlassSoft(RoundedCornerShape(12.dp)),
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 8.dp),
                        ) {
                            Text("Sync", color = KittyText, fontWeight = FontWeight.SemiBold)
                        }
                    }
                } else {
                    null
                },
            )
        }
        if (history.isEmpty()) {
            item {
                KittyEmptyState(
                    title = if (aniListLinked) "No list entries yet" else "No history yet",
                    body = if (aniListLinked) {
                        "Pull Sync after linking, or start watching a title."
                    } else {
                        "Open something from Home or Search — it’ll land here."
                    },
                )
            }
        } else {
            item {
                TextButton(
                    onClick = { scope.launch { historyDao.clear() } },
                    contentPadding = PaddingValues(horizontal = 0.dp),
                ) {
                    Text("Clear local", color = Color.White.copy(alpha = 0.55f))
                }
            }
            if (watching.isNotEmpty()) {
                item {
                    KittySectionHeading(
                        title = "Watching",
                        subtitle = "${watching.size} title${if (watching.size == 1) "" else "s"}",
                        padded = false,
                    )
                }
                lazyItems(watching, key = { "w-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
            }
            if (completed.isNotEmpty()) {
                item {
                    KittySectionHeading(
                        title = "Completed",
                        subtitle = "${completed.size} title${if (completed.size == 1) "" else "s"}",
                        padded = false,
                    )
                }
                lazyItems(completed, key = { "c-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
            }
            if (other.isNotEmpty()) {
                item {
                    KittySectionHeading(
                        title = "More",
                        subtitle = "${other.size} title${if (other.size == 1) "" else "s"}",
                        padded = false,
                    )
                }
                lazyItems(other, key = { "o-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
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
        badge = listStatusBadge(entry.listStatus),
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

@Composable
private fun SettingsFeed(
    catalog: ServerCatalog,
    api: DedicatedApiClient,
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
    onSignOut: () -> Unit,
    onOpenStore: () -> Unit,
) {
    val selectedId by catalog.selectedId.collectAsState()
    val resolvers by catalog.resolvers.collectAsState()
    val installedExt by catalog.extensions.installed.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var profile by remember { mutableStateOf<DedicatedApiClient.Profile?>(null) }
    var displayName by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var favorites by remember { mutableStateOf<List<DedicatedApiClient.Favorite>>(emptyList()) }
    var aniToken by remember { mutableStateOf("") }
    var showTokenPaste by remember { mutableStateOf(!AniListOAuth.isConfigured()) }
    var linkBusy by remember { mutableStateOf(false) }
    var extensionStatus by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        runCatching { api.me() }.onSuccess {
            profile = it
            displayName = it.displayName
        }
        runCatching { api.favorites() }.onSuccess { favorites = it }
    }

    suspend fun completeAniListLink(token: String): String {
        require(!aniListAuth.isLinked) { "AniList already linked — unlink first to switch accounts" }
        val viewer = aniList.viewer(token) ?: error("Invalid AniList token")
        aniListAuth.saveViewer(token, viewer)
        val synced = runCatching { aniListSync.pull() }.getOrNull()
        onLinkTick()
        return if (synced != null) {
            onSyncLabel("Synced ${synced.imported} from AniList")
            "Linked @${viewer.name} · synced ${synced.imported} titles"
        } else {
            "Linked @${viewer.name}"
        }
    }

    // linkTick bumps after save/clear so Compose re-reads prefs-backed isLinked.
    val isLinked = linkTick.let { aniListAuth.isLinked }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = 100.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlass(KittyGlassShape)
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                if (!aniListAuth.avatarUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = aniListAuth.avatarUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(52.dp)
                            .clip(RoundedCornerShape(999.dp)),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(52.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color.White),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            (aniListAuth.username ?: displayName.ifBlank { "A" }).take(1).uppercase(),
                            color = Color.Black,
                            fontWeight = FontWeight.Black,
                            fontSize = 20.sp,
                        )
                    }
                }
                Spacer(modifier = Modifier.width(14.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        when {
                            isLinked -> aniListAuth.username ?: "AniList"
                            else -> displayName.ifBlank { "AniKitty viewer" }
                        },
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Text(
                        accountLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.40f),
                    )
                    if (isLinked) {
                        Text(
                            syncLabel ?: "AniList list syncs while you watch",
                            style = MaterialTheme.typography.labelMedium,
                            color = KittyMuted,
                        )
                    }
                    profile?.let {
                        Text(
                            "${it.favorites} favorites · ${it.comments} comments",
                            style = MaterialTheme.typography.labelMedium,
                            color = Color.White.copy(alpha = 0.65f),
                        )
                    }
                }
            }
        }
        item {
            KittySectionHeading(
                title = "AniList",
                subtitle = if (isLinked) {
                    "Optional list sync · already linked"
                } else {
                    "Optional — link after you’re signed in"
                },
                padded = false,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlass(KittyGlassShape)
                    .padding(14.dp),
            ) {
                if (isLinked) {
                    Text(
                        "Progress pushes while you watch. Pull anytime to refresh your list.",
                        style = MaterialTheme.typography.bodySmall,
                        color = KittyMuted,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
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
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black,
                            ),
                        ) { Text("Sync now", fontWeight = FontWeight.Bold) }
                        OutlinedButton(
                            onClick = {
                                aniListAuth.clear()
                                onLinkTick()
                                onSyncLabel(null)
                                onLinkStatus("AniList unlinked")
                            },
                            shape = RoundedCornerShape(12.dp),
                        ) { Text("Unlink") }
                    }
                } else {
                    Text(
                        "Import watching / completed / planning and keep episode progress in sync. Not required to use AniKitty.",
                        style = MaterialTheme.typography.bodySmall,
                        color = KittyMuted,
                    )
                    Spacer(modifier = Modifier.height(12.dp))
                    if (AniListOAuth.isConfigured()) {
                        Button(
                            onClick = {
                                onLinkStatus("Opening AniList…")
                                runCatching { AniListOAuth.openAuthorize(context) }
                                    .onFailure { e -> onLinkStatus("Error: ${e.message}") }
                            },
                            enabled = !linkBusy,
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black,
                            ),
                        ) { Text("Link AniList", fontWeight = FontWeight.Bold) }
                        TextButton(
                            onClick = { showTokenPaste = !showTokenPaste },
                            enabled = !linkBusy,
                        ) {
                            Text(
                                if (showTokenPaste) "Hide token paste" else "Paste access token instead",
                                color = KittyMuted,
                            )
                        }
                    } else {
                        Text(
                            "Paste an AniList access token. Create an API client at anilist.co → Settings → Developer (redirect anikitty://anilist).",
                            style = MaterialTheme.typography.bodySmall,
                            color = KittyMuted,
                        )
                        TextButton(
                            onClick = {
                                context.startActivity(
                                    Intent(
                                        Intent.ACTION_VIEW,
                                        Uri.parse("https://anilist.co/settings/developer"),
                                    ),
                                )
                            },
                            enabled = !linkBusy,
                        ) {
                            Text("Open AniList developer settings", color = KittyText)
                        }
                        showTokenPaste = true
                    }
                    if (showTokenPaste) {
                        OutlinedTextField(
                            value = aniToken,
                            onValueChange = { aniToken = it },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            label = { Text("AniList access token") },
                            enabled = !linkBusy,
                            shape = RoundedCornerShape(12.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                scope.launch {
                                    linkBusy = true
                                    onLinkStatus("Linking AniList…")
                                    onLinkStatus(
                                        runCatching {
                                            completeAniListLink(aniToken.trim())
                                        }.getOrElse { e -> "Error: ${e.message}" },
                                    )
                                    linkBusy = false
                                }
                            },
                            enabled = !linkBusy && aniToken.isNotBlank(),
                            modifier = Modifier.fillMaxWidth(),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = Color.White,
                                contentColor = Color.Black,
                            ),
                        ) { Text("Link with token", fontWeight = FontWeight.Bold) }
                    }
                }
                if (!linkStatus.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        linkStatus,
                        style = MaterialTheme.typography.bodySmall,
                        color = KittyMuted,
                    )
                }
            }
        }
        item {
            KittySectionHeading(
                title = "Display name",
                subtitle = "Shown on comments · 2–24 characters",
                padded = false,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlass(KittyGlassShape)
                    .padding(14.dp),
            ) {
                OutlinedTextField(
                    value = displayName,
                    onValueChange = { displayName = it.take(24) },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Name") },
                    shape = RoundedCornerShape(12.dp),
                )
                Spacer(modifier = Modifier.height(8.dp))
                Button(
                    onClick = {
                        scope.launch {
                            status = runCatching {
                                val saved = api.updateDisplayName(displayName.trim())
                                displayName = saved
                                profile = api.me()
                                "Saved"
                            }.getOrElse { e -> e.message }
                        }
                    },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KittyAccent,
                        contentColor = KittyOnAccent,
                    ),
                ) { Text("Save name", fontWeight = FontWeight.Bold) }
                if (status != null) {
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(status!!, color = KittyMuted, style = MaterialTheme.typography.bodySmall)
                }
            }
        }
        if (favorites.isNotEmpty()) {
            item {
                KittySectionHeading(
                    title = "Favorites",
                    subtitle = "Synced to your dedicated server",
                    padded = false,
                )
            }
            lazyItems(favorites, key = { it.anilistId }) { fav ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .kittyGlass(KittyGlassShapeTight)
                        .padding(10.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    AsyncImage(
                        model = fav.coverImageUrl,
                        contentDescription = fav.title,
                        modifier = Modifier
                            .width(44.dp)
                            .aspectRatio(2f / 3f)
                            .clip(RoundedCornerShape(6.dp)),
                        contentScale = ContentScale.Crop,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Text(
                        fav.title,
                        color = Color.White,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
        item {
            KittySectionHeading(
                title = "Stream source",
                subtitle = "Anikoto · Gotaku · Ani.pm ship in the APK · browse more in Store",
                padded = false,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = onOpenStore,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittyAccent,
                    contentColor = KittyOnAccent,
                ),
            ) {
                Text("Open Extension Store", fontWeight = FontWeight.Bold)
            }
            if (extensionStatus != null) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    extensionStatus!!,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
        lazyItems(resolvers.map { it.server }, key = { it.id }) { server ->
            val selected = server.id == selectedId
            val isExtension = installedExt.any { it.id == server.id }
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlass(KittyGlassShape)
                    .then(
                        if (selected) {
                            Modifier.border(1.dp, KittyAccentGlow.copy(alpha = 0.55f), KittyGlassShape)
                        } else {
                            Modifier
                        },
                    )
                    .clickable { catalog.select(server.id) }
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ExtensionIcon(
                        iconUrl = server.iconUrl,
                        contentDescription = server.name,
                        size = 40.dp,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            server.name,
                            color = KittyText,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            buildString {
                                append(if (isExtension) "Extension" else "Bundled")
                                if (selected) append(" · active")
                            },
                            color = if (selected) KittyAccentGlow else KittyFaint,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                    if (selected) {
                        Text(
                            "Selected",
                            color = KittyAccentGlow,
                            style = MaterialTheme.typography.labelSmall,
                            fontWeight = FontWeight.Bold,
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
        item {
            OutlinedButton(
                onClick = onSignOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp)
                    .kittyGlassSoft(RoundedCornerShape(14.dp)),
                shape = RoundedCornerShape(14.dp),
            ) {
                Text("Sign out", fontWeight = FontWeight.Bold, color = KittyMuted)
            }
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
    api: DedicatedApiClient,
    onBack: () -> Unit,
    onChangeSource: () -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
    onPlay: (episode: Int, sources: List<PlayableSource>, anime: AnimeSummary) -> Unit,
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
    var detail by remember(anime.id) { mutableStateOf(anime) }
    var episode by remember(anime.id) { mutableIntStateOf(initialEpisode ?: 1) }
    var audio by remember(anime.id) { mutableStateOf("sub") }
    var resolving by remember(anime.id) { mutableStateOf(false) }
    var status by remember(anime.id) { mutableStateOf<String?>(null) }
    var favorited by remember(anime.id) { mutableStateOf(false) }
    var comments by remember(anime.id) {
        mutableStateOf<List<DedicatedApiClient.Comment>>(emptyList())
    }
    var commentDraft by remember(anime.id) { mutableStateOf("") }
    var commentStatus by remember(anime.id) { mutableStateOf<String?>(null) }
    var listBadge by remember(anime.id) { mutableStateOf<String?>(null) }
    var lastWatchedEp by remember(anime.id) { mutableIntStateOf(0) }
    var synopsisExpanded by remember(anime.id) { mutableStateOf(false) }
    var detailLoading by remember(anime.id) { mutableStateOf(!anime.detailLoaded) }
    var episodeList by remember(anime.id) { mutableStateOf(anime.episodeItems()) }
    val maxEp = episodeList.size.coerceAtLeast(1)
    val seasonTabs = remember(detail) { detail.seasonEntries() }
    val episodeListState = rememberLazyListState()
    val thumbResolver = remember { EpisodeThumbResolver(context) }

    LaunchedEffect(detail) {
        val base = detail.episodeItems()
        episodeList = base
        // Fribb → TMDB/IMDb stills for placeholder cover thumbs (no-op without TMDB key).
        runCatching { thumbResolver.enrich(detail.id, base) }
            .onSuccess { enriched -> if (enriched != base) episodeList = enriched }
    }

    LaunchedEffect(anime.id, initialEpisode) {
        detail = anime
        detailLoading = !anime.detailLoaded
        resolving = false
        status = null
        commentDraft = ""
        commentStatus = null
        synopsisExpanded = false
        comments = emptyList()
        favorited = false
        val history = historyDao.get(anime.id)
        lastWatchedEp = history?.episode ?: 0
        episode = when {
            initialEpisode != null -> initialEpisode.coerceAtLeast(1)
            history?.episode != null -> history.episode.coerceAtLeast(1)
            else -> 1
        }
        audio = "sub"
        listBadge = listStatusBadge(history?.listStatus)
        runCatching { api.favorites() }
            .onSuccess { favorited = it.any { f -> f.anilistId.toInt() == anime.id } }
        runCatching { api.comments(anime.id) }
            .onSuccess { comments = it }
        if (!anime.detailLoaded) {
            runCatching { aniList.media(anime.id) }
                .onSuccess { full ->
                    if (full != null) {
                        detail = full
                        val freshMax = full.episodeItems().size.coerceAtLeast(1)
                        episode = episode.coerceIn(1, freshMax)
                    }
                }
            detailLoading = false
        } else {
            detailLoading = false
        }
    }

    LaunchedEffect(episode, episodeList.size) {
        val index = (episode - 1).coerceIn(0, (episodeList.size - 1).coerceAtLeast(0))
        if (episodeList.isNotEmpty()) {
            runCatching { episodeListState.animateScrollToItem(index) }
        }
    }

    val heroMeta = listOfNotNull(
        listBadge,
        detail.statusLabel(),
        detail.format,
        detail.seasonLabel(),
        detail.episodes?.let { "$it eps" },
        detail.durationMinutes?.let { "${it}m" },
        detail.scoreLabel()?.let { "★ $it" },
    )

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
                    titleHint = detail.searchTitles().joinToString(" || "),
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

    Box(modifier = Modifier.fillMaxSize()) {
        KittyAtmosphere()
        LazyColumn(contentPadding = PaddingValues(bottom = 118.dp)) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(500.dp),
                ) {
                    AsyncImage(
                        model = detail.bannerImageUrl ?: detail.coverImageUrl,
                        contentDescription = detail.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.48f),
                                    0.22f to Color.Black.copy(alpha = 0.06f),
                                    0.62f to Color.Black.copy(alpha = 0.55f),
                                    0.88f to Color.Black.copy(alpha = 0.9f),
                                    1f to KittyPage,
                                ),
                            ),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    0f to Color.Black.copy(alpha = 0.62f),
                                    0.48f to Color.Black.copy(alpha = 0.18f),
                                    0.85f to Color.Transparent,
                                ),
                            ),
                    )
                    KittyRoundIconButton(
                        onClick = onBack,
                        modifier = Modifier
                            .windowInsetsPadding(WindowInsets.statusBars)
                            .padding(12.dp),
                    ) {
                        Icon(
                            Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                        )
                    }
                    Row(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = 18.dp, vertical = 20.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        AsyncImage(
                            model = detail.coverImageUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .width(124.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(14.dp))
                                .border(1.dp, KittyOutline, RoundedCornerShape(14.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Spacer(modifier = Modifier.width(16.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                detail.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Black,
                                color = Color.White,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val alt = listOfNotNull(detail.romajiTitle, detail.nativeTitle)
                                .firstOrNull()
                            if (!alt.isNullOrBlank()) {
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(
                                    alt,
                                    style = MaterialTheme.typography.bodySmall,
                                    color = Color.White.copy(alpha = 0.62f),
                                    maxLines = 1,
                                    overflow = TextOverflow.Ellipsis,
                                )
                            }
                            if (heroMeta.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(10.dp))
                                KittyMetaChips(items = heroMeta, accentFirst = listBadge != null)
                            }
                            if (lastWatchedEp > 0) {
                                Spacer(modifier = Modifier.height(10.dp))
                                KittyMetaChip(
                                    label = "Continue ep $lastWatchedEp",
                                    emphasized = true,
                                )
                            }
                        }
                    }
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
                                .kittyGlassSoft(RoundedCornerShape(18.dp))
                                .padding(16.dp),
                        ) {
                            Text(
                                "Overview",
                                color = KittyText,
                                style = MaterialTheme.typography.titleSmall,
                                fontWeight = FontWeight.Bold,
                            )
                            Text(
                                "AniList is the catalog · extensions only stream",
                                color = KittyFaint,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Modifier.padding(top = 2.dp),
                            )
                            if (detail.genres.isNotEmpty()) {
                                Spacer(modifier = Modifier.height(12.dp))
                                KittyMetaChips(items = detail.genres.take(8))
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
                        if (watch != null) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(16f / 9f)
                                    .clip(RoundedCornerShape(16.dp))
                                    .border(1.dp, KittyOutlineSoft, RoundedCornerShape(16.dp))
                                    .clickable { openUrl(watch) },
                            ) {
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
                                        .size(56.dp)
                                        .clip(RoundedCornerShape(999.dp))
                                        .background(KittyAccent)
                                        .border(1.dp, Color.White.copy(alpha = 0.25f), RoundedCornerShape(999.dp)),
                                    contentAlignment = Alignment.Center,
                                ) {
                                    Icon(
                                        Icons.Filled.PlayArrow,
                                        contentDescription = "Play trailer",
                                        tint = KittyOnAccent,
                                        modifier = Modifier.size(30.dp),
                                    )
                                }
                                Text(
                                    "Trailer · ${trailer.site.replaceFirstChar { it.titlecase() }}",
                                    modifier = Modifier
                                        .align(Alignment.BottomStart)
                                        .padding(12.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(KittyGlass)
                                        .border(1.dp, KittyOutlineSoft, RoundedCornerShape(10.dp))
                                        .padding(horizontal = 10.dp, vertical = 5.dp),
                                    style = MaterialTheme.typography.labelMedium,
                                    color = KittyText,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                            Spacer(modifier = Modifier.height(12.dp))
                        }
                    }

                    if (!detail.description.isNullOrBlank()) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .kittyGlassSoft(RoundedCornerShape(16.dp))
                                .padding(14.dp),
                        ) {
                            Text(
                                "Synopsis",
                                color = KittyFaint,
                                style = MaterialTheme.typography.labelMedium,
                                fontWeight = FontWeight.SemiBold,
                                letterSpacing = 0.6.sp,
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                detail.description!!,
                                style = MaterialTheme.typography.bodyMedium,
                                color = KittyMuted,
                                maxLines = if (synopsisExpanded) 40 else 4,
                                overflow = TextOverflow.Ellipsis,
                            )
                            TextButton(
                                onClick = { synopsisExpanded = !synopsisExpanded },
                                contentPadding = PaddingValues(horizontal = 0.dp, vertical = 4.dp),
                            ) {
                                Text(
                                    if (synopsisExpanded) "Show less" else "Read more",
                                    color = KittyAccentGlow,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }

                    Row(
                        modifier = Modifier.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        Chip(if (favorited) "Favorited" else "Favorite", favorited) {
                            scope.launch {
                                runCatching {
                                    if (favorited) {
                                        api.deleteFavorite(detail.id)
                                        favorited = false
                                    } else {
                                        api.putFavorite(detail.id, detail.title, detail.coverImageUrl)
                                        favorited = true
                                    }
                                }
                            }
                        }
                        Chip("AniList", false) {
                            openUrl("https://anilist.co/anime/${detail.id}")
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
                        KittySectionHeading(
                            title = "Related",
                            subtitle = "Spin-offs and more from AniList · seasons switch below",
                            padded = false,
                        )
                        Spacer(modifier = Modifier.height(12.dp))
                        LazyRow(
                            horizontalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            lazyItems(relatedExtras, key = { it.id }) { rel ->
                                Column(
                                    modifier = Modifier
                                        .width(112.dp)
                                        .clip(RoundedCornerShape(14.dp))
                                        .kittyGlassSoft(RoundedCornerShape(14.dp))
                                        .clickable {
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
                                        .padding(6.dp),
                                ) {
                                    AsyncImage(
                                        model = rel.coverImageUrl,
                                        contentDescription = rel.title,
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .aspectRatio(2f / 3f)
                                            .clip(RoundedCornerShape(10.dp))
                                            .border(1.dp, KittyOutlineSoft, RoundedCornerShape(10.dp)),
                                        contentScale = ContentScale.Crop,
                                    )
                                    Spacer(modifier = Modifier.height(6.dp))
                                    Text(
                                        rel.relationType,
                                        style = MaterialTheme.typography.labelSmall,
                                        color = KittyAccentGlow,
                                        fontWeight = FontWeight.SemiBold,
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

                    Spacer(modifier = Modifier.height(18.dp))
                    KittySectionHeading(title = "Audio", subtitle = "Stream language", padded = false)
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Chip("SUB", audio == "sub") { audio = "sub" }
                        Chip("DUB", audio == "dub") { audio = "dub" }
                    }
                    Spacer(modifier = Modifier.height(18.dp))
                    KittySectionHeading(
                        title = "Stream source",
                        subtitle = "Play tries this first, then other installed providers",
                        padded = false,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .kittyGlass(KittyGlassShapeTight)
                            .clickable(onClick = onChangeSource)
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
                                "Tap to change in Store",
                                color = KittyAccentGlow,
                                style = MaterialTheme.typography.labelSmall,
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(22.dp))
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        verticalAlignment = Alignment.Bottom,
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        KittySectionHeading(
                            title = "Episodes",
                            subtitle = if (seasonTabs.size > 1) {
                                "AniList seasons · each has its own episode list"
                            } else {
                                "From AniList · swipe the rail"
                            },
                            padded = false,
                            modifier = Modifier.weight(1f),
                        )
                        KittyMetaChip(
                            label = "Ep $episode / $maxEp",
                            emphasized = true,
                        )
                    }
                    if (seasonTabs.size > 1) {
                        Spacer(modifier = Modifier.height(12.dp))
                        Text(
                            "Seasons",
                            color = KittyFaint,
                            style = MaterialTheme.typography.labelMedium,
                            fontWeight = FontWeight.SemiBold,
                            letterSpacing = 0.5.sp,
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
                    Spacer(modifier = Modifier.height(14.dp))
                    LazyRow(
                        state = episodeListState,
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        contentPadding = PaddingValues(horizontal = 2.dp),
                    ) {
                        lazyItems(episodeList, key = { it.number }) { item ->
                            val selected = item.number == episode
                            val watched = lastWatchedEp > 0 && item.number < lastWatchedEp
                            val continueEp = item.number == lastWatchedEp && lastWatchedEp > 0
                            KittyEpisodeCard(
                                episode = item,
                                selected = selected,
                                watched = watched,
                                continueEp = continueEp,
                                onClick = { episode = item.number },
                            )
                        }
                    }
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        EpisodeLegendDot(KittyAccent, "Selected")
                        EpisodeLegendDot(KittySurfaceElevated, "Watched")
                        EpisodeLegendDot(KittyAccentGlow.copy(alpha = 0.45f), "Continue")
                    }
                    if (status != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            status!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = if (status!!.startsWith("Getting")) KittyMuted else MaterialTheme.colorScheme.error,
                        )
                    }
                    Spacer(modifier = Modifier.height(24.dp))
                    KittySectionHeading(
                        title = "Comments",
                        subtitle = "Stored on your dedicated server",
                        padded = false,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = commentDraft,
                        onValueChange = { commentDraft = it.take(500) },
                        modifier = Modifier.fillMaxWidth(),
                        label = { Text("Say something") },
                        minLines = 2,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Button(
                        onClick = {
                            val body = commentDraft.trim()
                            if (body.length < 2) return@Button
                            scope.launch {
                                runCatching {
                                    val item = api.postComment(anime.id, body, episode)
                                    comments = listOf(item) + comments
                                    commentDraft = ""
                                    commentStatus = null
                                }.onFailure { commentStatus = it.message }
                            }
                        },
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black,
                        ),
                    ) { Text("Post", fontWeight = FontWeight.Bold) }
                    if (commentStatus != null) {
                        Text(commentStatus!!, color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    if (comments.isEmpty()) {
                        Text(
                            "No comments yet — be the first.",
                            color = Color.White.copy(alpha = 0.45f),
                        )
                    } else {
                        comments.forEach { c ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 6.dp)
                                    .clip(RoundedCornerShape(12.dp))
                                    .background(KittySurfaceElevated.copy(alpha = 0.55f))
                                    .padding(12.dp),
                            ) {
                                Text(
                                    c.displayName + (c.episode?.let { " · ep $it" } ?: ""),
                                    color = Color.White.copy(alpha = 0.55f),
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Spacer(modifier = Modifier.height(4.dp))
                                Text(c.body, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, KittyPage.copy(alpha = 0.92f), KittyPage),
                    ),
                )
                .navigationBarsPadding()
                .padding(horizontal = 16.dp, vertical = 12.dp),
        ) {
            Button(
                onClick = { playSelected() },
                enabled = !resolving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(54.dp),
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittyAccent,
                    contentColor = KittyOnAccent,
                ),
            ) {
                if (resolving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(22.dp),
                        strokeWidth = 2.dp,
                        color = KittyOnAccent,
                    )
                } else {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(
                        "Play Episode $episode",
                        fontWeight = FontWeight.Bold,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    activeServer?.name?.let { name ->
                        Spacer(modifier = Modifier.width(10.dp))
                        Box(
                            modifier = Modifier
                                .clip(RoundedCornerShape(999.dp))
                                .background(KittyOnAccent.copy(alpha = 0.12f))
                                .padding(horizontal = 8.dp, vertical = 3.dp),
                        ) {
                            Text(
                                name,
                                fontWeight = FontWeight.SemiBold,
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
}

@Composable
private fun SeasonRangeChip(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = Modifier
            .clip(shape)
            .then(
                if (selected) {
                    Modifier
                        .background(KittyAccent)
                        .border(1.dp, KittyAccent, shape)
                } else {
                    Modifier
                        .background(KittyGlass)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.White.copy(alpha = 0.10f), Color.Transparent),
                            ),
                        )
                        .border(1.dp, KittyOutlineSoft, shape)
                },
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    ) {
        Text(
            label,
            color = if (selected) KittyOnAccent else KittyText.copy(alpha = 0.88f),
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
        )
    }
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
        continueEp -> KittyAccentGlow.copy(alpha = 0.55f)
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
                            continueEp -> KittyAccentGlow.copy(alpha = 0.85f)
                            watched -> KittyGlassStrong
                            else -> KittyGlass
                        },
                    )
                    .padding(horizontal = 7.dp, vertical = 3.dp),
                style = MaterialTheme.typography.labelSmall,
                color = if (selected) KittyOnAccent else KittyText,
                fontWeight = FontWeight.Bold,
            )
            if (continueEp && !selected) {
                Text(
                    "CONTINUE",
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(KittyAccentGlow.copy(alpha = 0.9f))
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
                .background(if (selected) KittySurfaceElevated else KittyGlass)
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
        continueEp -> KittyAccentGlow.copy(alpha = 0.22f)
        watched -> KittySurfaceElevated.copy(alpha = 0.72f)
        else -> KittyGlass
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
            .then(
                if (!selected) {
                    Modifier.background(
                        Brush.verticalGradient(
                            listOf(Color.White.copy(alpha = 0.08f), Color.Transparent),
                        ),
                    )
                } else {
                    Modifier
                },
            )
            .border(
                width = 1.dp,
                color = when {
                    selected -> KittyAccent
                    continueEp -> KittyAccentGlow.copy(alpha = 0.45f)
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
private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(12.dp)
    Box(
        modifier = Modifier
            .then(
                if (selected) {
                    Modifier
                        .clip(shape)
                        .background(KittyAccent)
                        .border(1.dp, KittyAccent, shape)
                } else {
                    Modifier.kittyGlassSoft(shape)
                },
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (selected) KittyOnAccent else KittyText.copy(alpha = 0.82f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
        )
    }
}
