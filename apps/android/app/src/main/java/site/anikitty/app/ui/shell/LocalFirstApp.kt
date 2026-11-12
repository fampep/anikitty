package site.anikitty.app.ui.shell

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.History
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
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
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.KittyBottomNav
import site.anikitty.app.ui.components.KittyContinueCard
import site.anikitty.app.ui.components.KittyHero
import site.anikitty.app.ui.components.KittyNavTab
import site.anikitty.app.ui.components.KittyPosterCard
import site.anikitty.app.ui.components.KittyPosterRow
import site.anikitty.app.ui.components.KittyPosterSkeletonRow
import site.anikitty.app.ui.components.KittyRoundIconButton
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOutline
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
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()
    var syncLabel by remember { mutableStateOf<String?>(null) }

    // Pull AniList list on enter + every few minutes while the app is open.
    LaunchedEffect(aniListAuth.isLinked) {
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
                onClose = { screen = Screen.Detail(current.anime, current.episode) },
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
                onNextEpisode = {
                    scope.launch {
                        val next = current.episode + 1
                        runCatching {
                            val sources = streamServers.selectedResolver().resolve(
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
                            screen = Screen.Player(current.anime, next, sources)
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
                api = api,
                onBack = { screen = Screen.Tabs },
                onPlay = { episode, sources ->
                    screen = Screen.Player(current.anime, episode, sources)
                },
            )
            return
        }
        Screen.Tabs -> Unit
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage),
    ) {
        when (tab) {
            "home" -> HomeFeed(
                aniList = aniList,
                aniListAuth = aniListAuth,
                history = history,
                historyDao = historyDao,
                onOpen = { anime, ep -> screen = Screen.Detail(anime, ep) },
                onSignOut = onSignOut,
                accountLabel = accountLabel,
            )
            "search" -> SearchFeed(
                aniList = aniList,
                historyDao = historyDao,
                onOpen = { screen = Screen.Detail(it) },
            )
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
                onOpen = { screen = Screen.Detail(it) },
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
                pendingAniListToken = pendingAniListToken,
                pendingAniListError = pendingAniListError,
                onConsumedAniListToken = onConsumedAniListToken,
                onSignOut = onSignOut,
            )
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
    onSignOut: () -> Unit,
    accountLabel: String,
) {
    var loading by remember { mutableStateOf(true) }
    var refreshing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()
    val continueWatching = remember(history) {
        history.filter {
            val s = it.listStatus?.uppercase()
            s == null || s == "CURRENT" || s == "REPEATING"
        }.ifEmpty { history }.take(12)
    }

    fun reload(fromPull: Boolean = false) {
        scope.launch {
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
                        FloatingTopChrome(
                            accountLabel = accountLabel,
                            greeting = aniListAuth.username?.let { "Hey @$it" },
                            onSignOut = onSignOut,
                            compact = false,
                        )
                    }
                    item { KittyPosterSkeletonRow("Spotlight") }
                    item { KittyPosterSkeletonRow("Trending now") }
                    item { KittyPosterSkeletonRow("Most popular") }
                }
            }
            error != null && trending.isEmpty() -> {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text("Couldn’t load the catalog", color = Color.White, fontWeight = FontWeight.SemiBold)
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(error!!, color = MaterialTheme.colorScheme.error, textAlign = TextAlign.Center)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(
                        onClick = { reload() },
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black,
                        ),
                        shape = RoundedCornerShape(12.dp),
                    ) { Text("Retry", fontWeight = FontWeight.Bold) }
                }
            }
            else -> {
                LazyColumn(contentPadding = PaddingValues(bottom = 100.dp)) {
                    item {
                        trending.firstOrNull()?.let { hero ->
                            KittyHero(
                                anime = hero,
                                eyebrow = "Spotlight",
                                cta = "Watch now",
                                onOpen = {
                                    scope.launch { historyDao.touchFromCatalog(hero) }
                                    onOpen(hero, null)
                                },
                                topOverlay = {
                                    FloatingTopChrome(
                                        accountLabel = accountLabel,
                                        greeting = aniListAuth.username?.let { "@$it" },
                                        onSignOut = onSignOut,
                                        compact = true,
                                    )
                                },
                            )
                        } ?: run {
                            FloatingTopChrome(
                                accountLabel = accountLabel,
                                greeting = aniListAuth.username?.let { "Hey @$it" },
                                onSignOut = onSignOut,
                                compact = false,
                            )
                        }
                    }
                    item {
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 16.dp, vertical = 8.dp),
                            horizontalArrangement = Arrangement.End,
                        ) {
                            TextButton(
                                onClick = { if (!refreshing) reload(fromPull = true) },
                                enabled = !refreshing,
                            ) {
                                Row(verticalAlignment = Alignment.CenterVertically) {
                                    if (refreshing) {
                                        CircularProgressIndicator(
                                            modifier = Modifier.size(12.dp),
                                            strokeWidth = 1.5.dp,
                                            color = KittyFaint,
                                        )
                                        Spacer(modifier = Modifier.width(8.dp))
                                    }
                                    Text(
                                        if (refreshing) "Refreshing…" else "Refresh catalog",
                                        color = KittyFaint,
                                        fontSize = 12.sp,
                                    )
                                }
                            }
                        }
                    }
                    item {
                        if (continueWatching.isNotEmpty()) {
                            Column(modifier = Modifier.padding(top = 8.dp)) {
                                KittySectionHeading(
                                    title = "Continue watching",
                                    subtitle = if (aniListAuth.isLinked) {
                                        "Your list · synced with AniList"
                                    } else {
                                        "Pick up where you left off"
                                    },
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
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
                        } else {
                            Column(modifier = Modifier.padding(top = 20.dp, start = 16.dp, end = 16.dp)) {
                                KittySectionHeading(
                                    title = "Continue watching",
                                    subtitle = if (aniListAuth.isLinked) {
                                        "Nothing in progress — open a title to start"
                                    } else {
                                        "Start something — it’ll land here"
                                    },
                                    padded = false,
                                )
                            }
                        }
                    }
                    item {
                        KittyPosterRow(
                            title = "Trending now",
                            subtitle = "What everyone is watching",
                            items = trending,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(it) }
                                onOpen(it, null)
                            },
                        )
                    }
                    item {
                        KittyPosterRow(
                            title = "Most popular",
                            subtitle = "All-time favorites",
                            items = popular,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(it) }
                                onOpen(it, null)
                            },
                        )
                    }
                    item {
                        KittyPosterRow(
                            title = "Airing this season",
                            subtitle = "New episodes weekly",
                            items = seasonal,
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
private fun FloatingTopChrome(
    accountLabel: String,
    onSignOut: () -> Unit,
    compact: Boolean = false,
    greeting: String? = null,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(
                horizontal = 16.dp,
                vertical = if (compact) 6.dp else 10.dp,
            ),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                "AniKitty",
                style = if (compact) MaterialTheme.typography.titleLarge else MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = KittyText,
                letterSpacing = (-0.6).sp,
            )
            if (!greeting.isNullOrBlank() && !compact) {
                Text(
                    greeting,
                    style = MaterialTheme.typography.labelMedium,
                    color = KittyFaint,
                )
            }
        }
        if (!compact) {
            Text(
                accountLabel,
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
                modifier = Modifier.padding(end = 6.dp),
            )
        } else if (!greeting.isNullOrBlank()) {
            Text(
                greeting,
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
                modifier = Modifier.padding(end = 6.dp),
            )
        }
        TextButton(
            onClick = onSignOut,
            contentPadding = PaddingValues(horizontal = 8.dp, vertical = 2.dp),
        ) {
            Text(
                "Sign out",
                color = KittyFaint,
                fontSize = 11.sp,
                fontWeight = FontWeight.Medium,
            )
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
        KittySectionHeading(
            title = "Search",
            subtitle = "Type a title — results update as you type",
            padded = false,
        )
        Spacer(modifier = Modifier.height(12.dp))
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it
                runSearch(it)
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text("Anime title") },
            trailingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
            shape = RoundedCornerShape(14.dp),
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
            items.isNotEmpty() -> LazyVerticalGrid(
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
            query.trim().length >= 2 && items.isEmpty() && !loading -> {
                Text(
                    "No titles matched “${query.trim()}”",
                    color = Color.White.copy(alpha = 0.55f),
                )
            }
            else -> {
                KittySectionHeading(
                    title = if (query.isBlank()) "Trending picks" else "Keep typing…",
                    subtitle = if (query.isBlank()) "Tap a poster to open" else "Need at least 2 characters",
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
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    KittySectionHeading(
                        title = "Library",
                        subtitle = when {
                            aniListLinked -> syncLabel ?: "Synced from AniList + this device"
                            else -> "Kept on this device"
                        },
                        padded = false,
                    )
                }
                if (aniListLinked) {
                    TextButton(onClick = onSync) {
                        Text("Sync", color = Color.White, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        if (history.isEmpty()) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(vertical = 48.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        if (aniListLinked) "No list entries yet" else "No history yet",
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleMedium,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        if (aniListLinked) {
                            "Pull Sync to import your AniList watching / completed shows."
                        } else {
                            "Watch something from Home — it shows up here with progress."
                        },
                        color = Color.White.copy(alpha = 0.45f),
                        textAlign = TextAlign.Center,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
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
                    Text(
                        "Watching",
                        color = Color.White.copy(alpha = 0.55f),
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                lazyItems(watching, key = { "w-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
            }
            if (completed.isNotEmpty()) {
                item {
                    Text(
                        "Completed",
                        color = Color.White.copy(alpha = 0.55f),
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelLarge,
                    )
                }
                lazyItems(completed, key = { "c-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, onOpen)
                }
            }
            if (other.isNotEmpty()) {
                item {
                    Text(
                        "More",
                        color = Color.White.copy(alpha = 0.55f),
                        fontWeight = FontWeight.SemiBold,
                        style = MaterialTheme.typography.labelLarge,
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
    pendingAniListToken: String?,
    pendingAniListError: String?,
    onConsumedAniListToken: () -> Unit,
    onSignOut: () -> Unit,
) {
    val selectedId by catalog.selectedId.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var profile by remember { mutableStateOf<DedicatedApiClient.Profile?>(null) }
    var displayName by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var favorites by remember { mutableStateOf<List<DedicatedApiClient.Favorite>>(emptyList()) }
    var aniToken by remember { mutableStateOf("") }
    var showTokenPaste by remember { mutableStateOf(!AniListOAuth.isConfigured()) }
    var linkBusy by remember { mutableStateOf(false) }
    var linkStatus by remember { mutableStateOf<String?>(null) }
    var linkedTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(Unit) {
        runCatching { api.me() }.onSuccess {
            profile = it
            displayName = it.displayName
        }
        runCatching { api.favorites() }.onSuccess { favorites = it }
    }

    suspend fun completeAniListLink(token: String): String {
        val viewer = aniList.viewer(token) ?: error("Invalid AniList token")
        aniListAuth.saveViewer(token, viewer)
        val synced = runCatching { aniListSync.pull() }.getOrNull()
        linkedTick++
        return if (synced != null) {
            "Linked @${viewer.name} · synced ${synced.imported} titles"
        } else {
            "Linked @${viewer.name}"
        }
    }

    LaunchedEffect(pendingAniListToken, pendingAniListError) {
        when {
            !pendingAniListError.isNullOrBlank() -> {
                linkStatus = "AniList: $pendingAniListError"
                onConsumedAniListToken()
            }
            !pendingAniListToken.isNullOrBlank() -> {
                linkBusy = true
                linkStatus = "Linking AniList…"
                linkStatus = runCatching { completeAniListLink(pendingAniListToken) }
                    .getOrElse { e -> "Error: ${e.message}" }
                linkBusy = false
                onConsumedAniListToken()
            }
        }
    }

    // linkedTick bumps after save/clear so Compose re-reads prefs-backed isLinked.
    val isLinked = linkedTick.let { aniListAuth.isLinked }

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
                    .clip(RoundedCornerShape(16.dp))
                    .background(KittySurface)
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
                    .clip(RoundedCornerShape(14.dp))
                    .background(KittySurface)
                    .border(1.dp, KittyOutline, RoundedCornerShape(14.dp))
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
                                linkedTick++
                                onSyncLabel(null)
                                linkStatus = "AniList unlinked"
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
                                runCatching { AniListOAuth.openAuthorize(context) }
                                    .onFailure { e -> linkStatus = "Error: ${e.message}" }
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
                                    linkStatus = "Linking AniList…"
                                    linkStatus = runCatching {
                                        completeAniListLink(aniToken.trim())
                                    }.getOrElse { e -> "Error: ${e.message}" }
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
                        linkStatus!!,
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
                    containerColor = Color.White,
                    contentColor = Color.Black,
                ),
            ) { Text("Save name", fontWeight = FontWeight.Bold) }
            if (status != null) {
                Text(status!!, color = MaterialTheme.colorScheme.onSurfaceVariant)
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
                        .clip(RoundedCornerShape(12.dp))
                        .background(KittySurface)
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
                subtitle = "Built-in resolvers · streams stay on this phone",
                padded = false,
            )
        }
        lazyItems(catalog.servers, key = { it.id }) { server ->
            val selected = server.id == selectedId
            val shape = RoundedCornerShape(14.dp)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(shape)
                    .background(KittySurface)
                    .border(
                        width = if (selected) 1.dp else 0.dp,
                        color = if (selected) Color.White else Color.Transparent,
                        shape = shape,
                    )
                    .clickable { catalog.select(server.id) }
                    .padding(16.dp),
            ) {
                Text(server.name, color = Color.White, fontWeight = FontWeight.SemiBold)
                Text(
                    server.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.55f),
                )
            }
        }
        item {
            Button(
                onClick = onSignOut,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black,
                ),
            ) { Text("Sign out", fontWeight = FontWeight.Bold) }
        }
    }
}

@Composable
private fun TitleDetailScreen(
    anime: AnimeSummary,
    initialEpisode: Int?,
    streamServers: ServerCatalog,
    historyDao: WatchHistoryDao,
    api: DedicatedApiClient,
    onBack: () -> Unit,
    onPlay: (episode: Int, sources: List<PlayableSource>) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var episode by remember { mutableIntStateOf(initialEpisode ?: 1) }
    var audio by remember { mutableStateOf("sub") }
    var resolving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    var favorited by remember { mutableStateOf(false) }
    var comments by remember { mutableStateOf<List<DedicatedApiClient.Comment>>(emptyList()) }
    var commentDraft by remember { mutableStateOf("") }
    var commentStatus by remember { mutableStateOf<String?>(null) }
    var listBadge by remember { mutableStateOf<String?>(null) }
    var lastWatchedEp by remember { mutableIntStateOf(0) }
    var synopsisExpanded by remember { mutableStateOf(false) }
    val maxEp = (anime.episodes ?: 24).coerceAtLeast(1).coerceAtMost(500)
    val pageSize = 24
    val pageCount = ((maxEp - 1) / pageSize) + 1
    var epPage by remember { mutableIntStateOf(0) }

    LaunchedEffect(anime.id, initialEpisode) {
        val history = historyDao.get(anime.id)
        lastWatchedEp = history?.episode ?: 0
        if (initialEpisode != null) {
            episode = initialEpisode.coerceIn(1, maxEp)
        } else {
            history?.episode?.let { episode = it.coerceIn(1, maxEp) }
        }
        listBadge = listStatusBadge(history?.listStatus)
        epPage = ((episode - 1) / pageSize).coerceIn(0, pageCount - 1)
        runCatching { api.favorites() }
            .onSuccess { favorited = it.any { f -> f.anilistId.toInt() == anime.id } }
        runCatching { api.comments(anime.id) }
            .onSuccess { comments = it }
    }

    val pageStart = epPage * pageSize + 1
    val pageEnd = minOf(maxEp, pageStart + pageSize - 1)

    fun playSelected() {
        scope.launch {
            resolving = true
            status = "Getting stream…"
            runCatching {
                historyDao.touchFromCatalog(anime)
                val sources = streamServers.selectedResolver().resolve(
                    anilistId = anime.id,
                    episode = episode,
                    audio = audio,
                    titleHint = anime.searchTitles().joinToString(" || "),
                )
                historyDao.get(anime.id)?.let {
                    historyDao.upsert(
                        it.copy(
                            episode = episode,
                            updatedAtEpochMs = System.currentTimeMillis(),
                        ),
                    )
                }
                lastWatchedEp = episode
                onPlay(episode, sources)
                status = null
            }.onFailure { status = it.message ?: "Failed" }
            resolving = false
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage),
    ) {
        LazyColumn(contentPadding = PaddingValues(bottom = 118.dp)) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(340.dp),
                ) {
                    AsyncImage(
                        model = anime.bannerImageUrl ?: anime.coverImageUrl,
                        contentDescription = anime.title,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.42f),
                                    0.4f to Color.Black.copy(alpha = 0.18f),
                                    1f to KittyPage,
                                ),
                            ),
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.horizontalGradient(
                                    0f to Color.Black.copy(alpha = 0.45f),
                                    0.55f to Color.Transparent,
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
                            .padding(horizontal = 16.dp, vertical = 18.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        AsyncImage(
                            model = anime.coverImageUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .width(112.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, KittyOutline, RoundedCornerShape(12.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                "OVERVIEW",
                                style = MaterialTheme.typography.labelSmall,
                                color = KittyFaint,
                                letterSpacing = 1.2.sp,
                                fontWeight = FontWeight.Bold,
                            )
                            Spacer(modifier = Modifier.height(4.dp))
                            Text(
                                anime.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val meta = listOfNotNull(
                                listBadge,
                                anime.format,
                                anime.episodes?.let { "$it eps" },
                                anime.averageScore?.let { "★ $it" },
                            ).joinToString(" · ")
                            if (meta.isNotBlank()) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    meta,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = KittyMuted,
                                )
                            }
                            if (lastWatchedEp > 0) {
                                Spacer(modifier = Modifier.height(6.dp))
                                Text(
                                    "Continue · ep $lastWatchedEp",
                                    style = MaterialTheme.typography.labelMedium,
                                    color = Color.White.copy(alpha = 0.85f),
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
            }
            item {
                Column(modifier = Modifier.padding(horizontal = 16.dp)) {
                    if (!anime.description.isNullOrBlank()) {
                        Text(
                            anime.description!!,
                            style = MaterialTheme.typography.bodyMedium,
                            color = KittyMuted,
                            maxLines = if (synopsisExpanded) 20 else 3,
                            overflow = TextOverflow.Ellipsis,
                        )
                        TextButton(onClick = { synopsisExpanded = !synopsisExpanded }) {
                            Text(
                                if (synopsisExpanded) "Show less" else "Read synopsis",
                                color = KittyText,
                            )
                        }
                        Spacer(modifier = Modifier.height(8.dp))
                    }
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Chip(if (favorited) "Favorited" else "Favorite", favorited) {
                            scope.launch {
                                runCatching {
                                    if (favorited) {
                                        api.deleteFavorite(anime.id)
                                        favorited = false
                                    } else {
                                        api.putFavorite(anime.id, anime.title, anime.coverImageUrl)
                                        favorited = true
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
                    Spacer(modifier = Modifier.height(22.dp))
                    KittySectionHeading(
                        title = "Episodes",
                        subtitle = "Ep $episode selected · $pageStart–$pageEnd of $maxEp",
                        padded = false,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    if (pageCount > 1) {
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            for (p in 0 until pageCount) {
                                val start = p * pageSize + 1
                                val end = minOf(maxEp, start + pageSize - 1)
                                Chip("$start–$end", p == epPage) { epPage = p }
                            }
                        }
                        Spacer(modifier = Modifier.height(12.dp))
                    }
                    BoxWithConstraints(modifier = Modifier.fillMaxWidth()) {
                        val columns = when {
                            maxWidth < 380.dp -> 4
                            maxWidth < 560.dp -> 5
                            maxWidth < 720.dp -> 6
                            else -> 8
                        }
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(14.dp))
                                .background(KittySurface)
                                .border(1.dp, KittyOutline, RoundedCornerShape(14.dp))
                                .padding(10.dp),
                            verticalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            for (rowStart in pageStart..pageEnd step columns) {
                                Row(
                                    modifier = Modifier.fillMaxWidth(),
                                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                                ) {
                                    val filled = minOf(columns, pageEnd + 1 - rowStart)
                                    for (n in rowStart until rowStart + filled) {
                                        val selected = n == episode
                                        val watched = lastWatchedEp > 0 && n < lastWatchedEp
                                        val continueEp = n == lastWatchedEp && lastWatchedEp > 0
                                        EpisodeCell(
                                            number = n,
                                            selected = selected,
                                            watched = watched,
                                            continueEp = continueEp,
                                            modifier = Modifier.weight(1f),
                                            onClick = { episode = n },
                                        )
                                    }
                                    repeat(columns - filled) {
                                        Spacer(modifier = Modifier.weight(1f))
                                    }
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(8.dp))
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        EpisodeLegendDot(Color.White, "Selected")
                        EpisodeLegendDot(KittySurfaceElevated, "Watched")
                        EpisodeLegendDot(Color.White.copy(alpha = 0.18f), "Continue")
                    }
                    if (status != null) {
                        Spacer(modifier = Modifier.height(10.dp))
                        Text(
                            status!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                                    .background(KittySurface)
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
                    Icon(Icons.Filled.PlayArrow, contentDescription = null)
                    Spacer(modifier = Modifier.width(6.dp))
                    Text("Play episode $episode · ${audio.uppercase()}", fontWeight = FontWeight.Bold)
                }
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
    val bg = when {
        selected -> Color.White
        continueEp -> Color.White.copy(alpha = 0.18f)
        watched -> KittySurfaceElevated
        else -> Color(0xFF121212)
    }
    val fg = when {
        selected -> Color.Black
        else -> Color.White.copy(alpha = if (watched) 0.55f else 0.92f)
    }
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(RoundedCornerShape(10.dp))
            .background(bg)
            .border(
                width = 1.dp,
                color = when {
                    selected -> Color.White
                    continueEp -> Color.White.copy(alpha = 0.35f)
                    else -> Color.White.copy(alpha = 0.08f)
                },
                shape = RoundedCornerShape(10.dp),
            )
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (watched && !selected) {
                Icon(
                    Icons.Rounded.Check,
                    contentDescription = null,
                    tint = fg,
                    modifier = Modifier.size(12.dp),
                )
                Spacer(modifier = Modifier.width(2.dp))
            }
            Text(
                "$number",
                color = fg,
                fontWeight = if (selected || continueEp) FontWeight.Bold else FontWeight.SemiBold,
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
                .clip(RoundedCornerShape(999.dp))
                .background(color)
                .border(1.dp, Color.White.copy(alpha = 0.2f), RoundedCornerShape(999.dp)),
        )
        Spacer(modifier = Modifier.width(6.dp))
        Text(label, color = KittyFaint, fontSize = 11.sp)
    }
}

@Composable
private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) Color.White else KittySurface)
            .border(
                width = 1.dp,
                color = if (selected) Color.White else Color.White.copy(alpha = 0.10f),
                shape = RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (selected) Color.Black else Color.White.copy(alpha = 0.78f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 12.sp,
        )
    }
}
