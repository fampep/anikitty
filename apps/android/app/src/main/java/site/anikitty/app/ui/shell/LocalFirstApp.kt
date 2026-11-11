package site.anikitty.app.ui.shell

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
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
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Job
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
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
import site.anikitty.app.ui.components.KittyRoundIconButton
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySurface

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
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    api: DedicatedApiClient,
    accountLabel: String,
    onSignOut: () -> Unit,
) {
    // Tab survives recreation; detail/player stack relies on configChanges in the manifest
    // so landscape lock in PlayerScreen does not wipe navigation.
    var tab by rememberSaveable { mutableStateOf("home") }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    val tabs = remember {
        listOf(
            KittyNavTab("home", "Home", Icons.Outlined.Home, Icons.Filled.Home),
            KittyNavTab("search", "Search", Icons.Outlined.Search, Icons.Filled.Search),
            KittyNavTab("history", "History", Icons.Outlined.History, Icons.Outlined.History),
            KittyNavTab("settings", "Account", Icons.Outlined.Settings, Icons.Filled.Settings),
        )
    }

    when (val current = screen) {
        is Screen.Player -> {
            PlayerScreen(
                title = current.anime.title,
                episode = current.episode,
                sources = current.sources,
                onClose = { screen = Screen.Detail(current.anime, current.episode) },
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
                            historyDao.get(current.anime.id)?.let {
                                historyDao.upsert(
                                    it.copy(episode = next, updatedAtEpochMs = System.currentTimeMillis()),
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
                onOpen = { screen = Screen.Detail(it) },
            )
            "settings" -> SettingsFeed(
                catalog = streamServers,
                api = api,
                accountLabel = accountLabel,
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
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onSignOut: () -> Unit,
    accountLabel: String,
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            runCatching {
                coroutineScope {
                    val t = async { aniList.trending() }
                    val p = async { aniList.popular() }
                    val s = async { aniList.seasonal() }
                    trending = t.await()
                    popular = p.await()
                    seasonal = s.await()
                }
            }.onFailure { error = it.message ?: "Failed to load" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    Box(modifier = Modifier.fillMaxSize()) {
        when {
            loading && trending.isEmpty() -> {
                CircularProgressIndicator(Modifier.align(Alignment.Center))
            }
            error != null && trending.isEmpty() -> {
                Column(
                    modifier = Modifier.align(Alignment.Center).padding(24.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(error!!, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = { reload() }) { Text("Retry") }
                }
            }
            else -> {
                LazyColumn(contentPadding = PaddingValues(bottom = 100.dp)) {
                    item {
                        FloatingTopChrome(accountLabel = accountLabel, onSignOut = onSignOut)
                    }
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
                            )
                        }
                    }
                    item {
                        if (history.isNotEmpty()) {
                            Column(modifier = Modifier.padding(top = 22.dp)) {
                                KittySectionHeading(
                                    title = "Continue watching",
                                    subtitle = "Pick up where you left off",
                                )
                                Spacer(modifier = Modifier.height(12.dp))
                                LazyRow(
                                    contentPadding = PaddingValues(horizontal = 16.dp),
                                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                                ) {
                                    lazyItems(history.take(12), key = { it.anilistId }) { entry ->
                                        KittyContinueCard(
                                            title = entry.title,
                                            coverUrl = entry.coverImageUrl,
                                            episode = entry.episode,
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
private fun FloatingTopChrome(accountLabel: String, onSignOut: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(horizontal = 16.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                "AniKitty",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = Color.White,
                letterSpacing = (-0.4).sp,
            )
            Text(
                accountLabel,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.40f),
            )
        }
        TextButton(onClick = onSignOut) {
            Text("Sign out", color = Color.White.copy(alpha = 0.72f))
        }
    }
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
    val scope = rememberCoroutineScope()
    var searchJob by remember { mutableStateOf<Job?>(null) }

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
                .onSuccess { items = it }
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
        Text(
            "Search",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
        Text(
            "Type a title — results update as you type",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
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
            label = { Text("Anime title") },
            trailingIcon = { Icon(Icons.Rounded.Search, contentDescription = null) },
        )
        Spacer(modifier = Modifier.height(12.dp))
        when {
            loading -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
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
            else -> {
                Text(
                    if (query.isBlank()) "Trending picks" else "Keep typing…",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
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
    onOpen: (AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(16.dp)
            .padding(bottom = 84.dp),
    ) {
        Text(
            "History",
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.Bold,
            color = Color.White,
        )
        Text(
            "Kept on this device",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        if (history.isEmpty()) {
            Text(
                "Nothing here yet — start something from Home.",
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            TextButton(onClick = { scope.launch { historyDao.clear() } }) {
                Text("Clear all")
            }
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                lazyItems(history, key = { it.anilistId }) { entry ->
                    KittyContinueCard(
                        title = entry.title,
                        coverUrl = entry.coverImageUrl,
                        episode = entry.episode,
                        onClick = {
                            scope.launch {
                                val detail = aniList.media(entry.anilistId) ?: AnimeSummary(
                                    id = entry.anilistId,
                                    title = entry.title,
                                    coverImageUrl = entry.coverImageUrl,
                                    episodes = null,
                                    format = null,
                                    averageScore = null,
                                )
                                onOpen(detail)
                            }
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun SettingsFeed(
    catalog: ServerCatalog,
    api: DedicatedApiClient,
    accountLabel: String,
    onSignOut: () -> Unit,
) {
    val selectedId by catalog.selectedId.collectAsState()
    val scope = rememberCoroutineScope()
    var profile by remember { mutableStateOf<DedicatedApiClient.Profile?>(null) }
    var displayName by remember { mutableStateOf("") }
    var status by remember { mutableStateOf<String?>(null) }
    var favorites by remember { mutableStateOf<List<DedicatedApiClient.Favorite>>(emptyList()) }

    LaunchedEffect(Unit) {
        runCatching { api.me() }.onSuccess {
            profile = it
            displayName = it.displayName
        }
        runCatching { api.favorites() }.onSuccess { favorites = it }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(16.dp)
            .padding(bottom = 100.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text(
                "Account",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            Text(
                accountLabel,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            profile?.let {
                Text(
                    "${it.favorites} favorites · ${it.comments} comments",
                    style = MaterialTheme.typography.labelMedium,
                    color = MaterialTheme.colorScheme.primary,
                )
            }
        }
        item {
            Text("Display name", color = Color.White, fontWeight = FontWeight.SemiBold)
            Text(
                "Shown on comments. Optional, 2–24 characters.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = displayName,
                onValueChange = { displayName = it.take(24) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("Name") },
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
                shape = RoundedCornerShape(20.dp),
            ) { Text("Save name") }
            if (status != null) {
                Text(status!!, color = MaterialTheme.colorScheme.onSurfaceVariant)
            }
        }
        if (favorites.isNotEmpty()) {
            item {
                Text("Favorites", color = Color.White, fontWeight = FontWeight.SemiBold)
            }
            lazyItems(favorites, key = { it.anilistId }) { fav ->
                Text(fav.title, color = Color.White)
            }
        }
        item {
            Text(
                "Stream source",
                style = MaterialTheme.typography.titleSmall,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
            )
            Text(
                "Built-in resolvers only. Anime streams play on this phone.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
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
                        color = if (selected) MaterialTheme.colorScheme.primary else Color.Transparent,
                        shape = shape,
                    )
                    .clickable { catalog.select(server.id) }
                    .padding(16.dp),
            ) {
                Text(server.name, color = Color.White, fontWeight = FontWeight.SemiBold)
                Text(
                    server.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
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
    val maxEp = (anime.episodes ?: 24).coerceAtLeast(1).coerceAtMost(500)
    val pageSize = 24
    val pageCount = ((maxEp - 1) / pageSize) + 1
    var epPage by remember { mutableIntStateOf(0) }

    LaunchedEffect(anime.id, initialEpisode) {
        if (initialEpisode != null) {
            episode = initialEpisode.coerceIn(1, maxEp)
        } else {
            historyDao.get(anime.id)?.episode?.let { episode = it.coerceIn(1, maxEp) }
        }
        epPage = ((episode - 1) / pageSize).coerceIn(0, pageCount - 1)
        runCatching { api.favorites() }
            .onSuccess { favorited = it.any { f -> f.anilistId.toInt() == anime.id } }
        runCatching { api.comments(anime.id) }
            .onSuccess { comments = it }
    }

    val pageStart = epPage * pageSize + 1
    val pageEnd = minOf(maxEp, pageStart + pageSize - 1)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage),
    ) {
        LazyColumn(contentPadding = PaddingValues(bottom = 28.dp)) {
            item {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(260.dp),
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
                                    listOf(Color.Black.copy(alpha = 0.25f), KittyPage),
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
                            .padding(16.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        AsyncImage(
                            model = anime.coverImageUrl,
                            contentDescription = null,
                            modifier = Modifier
                                .width(104.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(10.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Spacer(modifier = Modifier.width(14.dp))
                        Column {
                            Text(
                                anime.title,
                                style = MaterialTheme.typography.headlineSmall,
                                fontWeight = FontWeight.Bold,
                                color = Color.White,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val meta = listOfNotNull(
                                anime.format,
                                anime.episodes?.let { "$it eps" },
                                anime.averageScore?.let { "★ $it" },
                            ).joinToString(" · ")
                            if (meta.isNotBlank()) {
                                Text(
                                    meta,
                                    style = MaterialTheme.typography.labelMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                                )
                            }
                        }
                    }
                }
            }
            item {
                Column(modifier = Modifier.padding(16.dp)) {
                    if (!anime.description.isNullOrBlank()) {
                        Text(
                            anime.description!!,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 4,
                            overflow = TextOverflow.Ellipsis,
                        )
                        Spacer(modifier = Modifier.height(16.dp))
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
                    Spacer(modifier = Modifier.height(16.dp))
                    KittySectionHeading(title = "Audio", padded = false)
                    Spacer(modifier = Modifier.height(10.dp))
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        Chip("SUB", audio == "sub") { audio = "sub" }
                        Chip("DUB", audio == "dub") { audio = "dub" }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    KittySectionHeading(
                        title = "Episodes",
                        subtitle = "$pageStart–$pageEnd of $maxEp",
                        padded = false,
                    )
                    Spacer(modifier = Modifier.height(8.dp))
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
                        Spacer(modifier = Modifier.height(10.dp))
                    }
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(12.dp))
                            .background(KittySurface)
                            .padding(10.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        for (rowStart in pageStart..pageEnd step 6) {
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.spacedBy(8.dp),
                            ) {
                                val filled = minOf(6, pageEnd + 1 - rowStart)
                                for (n in rowStart until rowStart + filled) {
                                    val selected = n == episode
                                    Box(
                                        modifier = Modifier
                                            .weight(1f)
                                            .height(42.dp)
                                            .clip(RoundedCornerShape(10.dp))
                                            .background(if (selected) Color.White else Color(0xFF1A1A1A))
                                            .clickable { episode = n },
                                        contentAlignment = Alignment.Center,
                                    ) {
                                        Text(
                                            "$n",
                                            color = if (selected) Color.Black else Color.White,
                                            fontWeight = FontWeight.SemiBold,
                                        )
                                    }
                                }
                                repeat(6 - filled) {
                                    Spacer(modifier = Modifier.weight(1f))
                                }
                            }
                        }
                    }
                    Spacer(modifier = Modifier.height(20.dp))
                    Button(
                        onClick = {
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
                                    onPlay(episode, sources)
                                    status = null
                                }.onFailure { status = it.message ?: "Failed" }
                                resolving = false
                            }
                        },
                        enabled = !resolving,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(52.dp),
                        shape = RoundedCornerShape(26.dp),
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
                            Text("Play episode $episode", fontWeight = FontWeight.Bold)
                        }
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
                        shape = RoundedCornerShape(20.dp),
                    ) { Text("Post") }
                    if (commentStatus != null) {
                        Text(commentStatus!!, color = MaterialTheme.colorScheme.error)
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    if (comments.isEmpty()) {
                        Text("No comments yet.", color = MaterialTheme.colorScheme.onSurfaceVariant)
                    } else {
                        comments.forEach { c ->
                            Column(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 8.dp),
                            ) {
                                Text(
                                    c.displayName + (c.episode?.let { " · ep $it" } ?: ""),
                                    color = MaterialTheme.colorScheme.primary,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                                Text(c.body, color = Color.White, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun Chip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(if (selected) Color.White else KittySurface)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (selected) Color.Black else Color.White,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
