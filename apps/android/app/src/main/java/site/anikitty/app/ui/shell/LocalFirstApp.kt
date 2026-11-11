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
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
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
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.KittyPage

private enum class Tab { Home, Search, History, Servers }

private sealed class Screen {
    data object Tabs : Screen()
    data class Detail(val anime: AnimeSummary) : Screen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
    ) : Screen()
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocalFirstApp(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    accountLabel: String,
    onSignOut: () -> Unit,
) {
    var tab by remember { mutableStateOf(Tab.Home) }
    var screen by remember { mutableStateOf<Screen>(Screen.Tabs) }

    when (val current = screen) {
        is Screen.Player -> {
            PlayerScreen(
                title = current.anime.title,
                episode = current.episode,
                sources = current.sources,
                onClose = { screen = Screen.Detail(current.anime) },
            )
            return
        }
        is Screen.Detail -> {
            TitleDetailScreen(
                anime = current.anime,
                streamServers = streamServers,
                historyDao = historyDao,
                onBack = { screen = Screen.Tabs },
                onPlay = { episode, sources ->
                    screen = Screen.Player(current.anime, episode, sources)
                },
            )
            return
        }
        Screen.Tabs -> Unit
    }

    Scaffold(
        containerColor = KittyPage,
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(KittyInk.copy(alpha = 0.92f))
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        "AniKitty",
                        style = MaterialTheme.typography.titleLarge,
                        fontWeight = FontWeight.Black,
                        color = Color.White,
                    )
                    Text(
                        accountLabel,
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
                TextButton(onClick = onSignOut) {
                    Text("Sign out", color = MaterialTheme.colorScheme.primary)
                }
            }
        },
        bottomBar = {
            NavigationBar(containerColor = KittyInk) {
                NavigationBarItem(
                    selected = tab == Tab.Home,
                    onClick = { tab = Tab.Home },
                    icon = { Icon(Icons.Outlined.Home, contentDescription = null) },
                    label = { Text("Home") },
                )
                NavigationBarItem(
                    selected = tab == Tab.Search,
                    onClick = { tab = Tab.Search },
                    icon = { Icon(Icons.Outlined.Search, contentDescription = null) },
                    label = { Text("Search") },
                )
                NavigationBarItem(
                    selected = tab == Tab.History,
                    onClick = { tab = Tab.History },
                    icon = { Icon(Icons.Outlined.History, contentDescription = null) },
                    label = { Text("History") },
                )
                NavigationBarItem(
                    selected = tab == Tab.Servers,
                    onClick = { tab = Tab.Servers },
                    icon = { Icon(Icons.Outlined.Dns, contentDescription = null) },
                    label = { Text("Servers") },
                )
            }
        },
    ) { padding ->
        when (tab) {
            Tab.Home -> HomeTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                aniList = aniList,
                historyDao = historyDao,
                onOpen = { screen = Screen.Detail(it) },
            )
            Tab.Search -> SearchTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                aniList = aniList,
                historyDao = historyDao,
                onOpen = { screen = Screen.Detail(it) },
            )
            Tab.History -> HistoryTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                historyDao = historyDao,
                aniList = aniList,
                onOpen = { screen = Screen.Detail(it) },
            )
            Tab.Servers -> ServersTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                catalog = streamServers,
            )
        }
    }
}

@Composable
private fun HomeTab(
    modifier: Modifier,
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
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
                trending = aniList.trending()
                popular = aniList.popular()
                seasonal = aniList.seasonal()
            }.onFailure { error = it.message ?: "Failed to load catalog" }
            loading = false
        }
    }

    LaunchedEffect(Unit) { reload() }

    when {
        loading && trending.isEmpty() -> {
            Box(modifier = modifier, contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        error != null && trending.isEmpty() -> {
            Column(
                modifier = modifier.padding(24.dp),
                verticalArrangement = Arrangement.Center,
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(12.dp))
                Button(onClick = { reload() }) { Text("Retry") }
            }
        }
        else -> {
            LazyColumn(
                modifier = modifier,
                contentPadding = PaddingValues(bottom = 24.dp),
            ) {
                item {
                    val hero = trending.firstOrNull()
                    if (hero != null) {
                        HeroMarquee(
                            anime = hero,
                            onOpen = {
                                scope.launch { historyDao.touchFromCatalog(hero) }
                                onOpen(hero)
                            },
                        )
                    }
                }
                item {
                    PosterRow(
                        title = "Trending",
                        items = trending,
                        onOpen = {
                            scope.launch { historyDao.touchFromCatalog(it) }
                            onOpen(it)
                        },
                    )
                }
                item {
                    PosterRow(
                        title = "Popular",
                        items = popular,
                        onOpen = {
                            scope.launch { historyDao.touchFromCatalog(it) }
                            onOpen(it)
                        },
                    )
                }
                item {
                    PosterRow(
                        title = "Airing now",
                        items = seasonal,
                        onOpen = {
                            scope.launch { historyDao.touchFromCatalog(it) }
                            onOpen(it)
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun HeroMarquee(anime: AnimeSummary, onOpen: () -> Unit) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(240.dp)
            .clickable(onClick = onOpen),
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
                        listOf(Color.Transparent, KittyInk.copy(alpha = 0.92f)),
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(20.dp),
        ) {
            Text(
                anime.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(10.dp))
            Button(
                onClick = onOpen,
                colors = ButtonDefaults.buttonColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    contentColor = MaterialTheme.colorScheme.onPrimary,
                ),
                shape = RoundedCornerShape(24.dp),
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null)
                Spacer(modifier = Modifier.width(4.dp))
                Text("Watch", fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun PosterRow(
    title: String,
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    if (items.isEmpty()) return
    Column(modifier = Modifier.padding(top = 18.dp)) {
        Text(
            title,
            modifier = Modifier.padding(horizontal = 16.dp),
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.SemiBold,
            color = Color.White,
        )
        Spacer(modifier = Modifier.height(10.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(items, key = { it.id }) { anime ->
                PosterCard(anime = anime, onClick = { onOpen(anime) })
            }
        }
    }
}

@Composable
private fun PosterCard(anime: AnimeSummary, onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .width(120.dp)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(8.dp))
                .background(MaterialTheme.colorScheme.surface),
            contentScale = ContentScale.Crop,
        )
        Text(
            anime.title,
            modifier = Modifier.padding(top = 6.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurface,
        )
    }
}

@Composable
private fun SearchTab(
    modifier: Modifier,
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun runSearch(q: String) {
        if (q.isBlank()) return
        scope.launch {
            loading = true
            error = null
            items = emptyList()
            runCatching { aniList.search(q) }
                .onSuccess { items = it }
                .onFailure { error = it.message ?: "Search failed" }
            loading = false
        }
    }

    Column(modifier = modifier.padding(16.dp)) {
        OutlinedTextField(
            value = query,
            onValueChange = { query = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Search anime") },
        )
        Spacer(modifier = Modifier.height(8.dp))
        Button(
            onClick = { runSearch(query.trim()) },
            enabled = !loading && query.isNotBlank(),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Search") }
        Spacer(modifier = Modifier.height(12.dp))
        when {
            loading -> Box(Modifier.weight(1f).fillMaxWidth(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
            error != null && items.isEmpty() -> Text(error!!, color = MaterialTheme.colorScheme.error)
            else -> {
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(120.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                ) {
                    items(items, key = { it.id }) { anime ->
                        PosterCard(
                            anime = anime,
                            onClick = {
                                scope.launch { historyDao.touchFromCatalog(anime) }
                                onOpen(anime)
                            },
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun HistoryTab(
    modifier: Modifier,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    onOpen: (AnimeSummary) -> Unit,
) {
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    Column(modifier = modifier.padding(16.dp)) {
        Text("Continue watching", style = MaterialTheme.typography.titleMedium, color = Color.White)
        Text(
            "Saved on this device. Open a title to resume or pick an episode.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        if (history.isNotEmpty()) {
            OutlinedButton(
                onClick = { scope.launch { historyDao.clear() } },
                modifier = Modifier.fillMaxWidth(),
            ) { Text("Clear local history") }
            Spacer(modifier = Modifier.height(8.dp))
        }
        if (history.isEmpty()) {
            Text(
                "No history yet. Open something from Home or Search.",
                modifier = Modifier.padding(top = 24.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                items(history, key = { it.anilistId }) { entry ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .background(MaterialTheme.colorScheme.surface)
                            .clickable {
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
                            }
                            .padding(12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        AsyncImage(
                            model = entry.coverImageUrl,
                            contentDescription = entry.title,
                            modifier = Modifier
                                .width(56.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(6.dp)),
                            contentScale = ContentScale.Crop,
                        )
                        Spacer(modifier = Modifier.width(12.dp))
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                entry.title,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.titleSmall,
                            )
                            Text(
                                "Episode ${entry.episode}",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant,
                            )
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServersTab(modifier: Modifier, catalog: ServerCatalog) {
    val selectedId by catalog.selectedId.collectAsState()
    val servers = catalog.servers

    LazyColumn(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Watch servers", style = MaterialTheme.typography.titleMedium, color = Color.White)
            Text(
                "Built-in resolvers only. The phone fetches a playable URL; bandwidth never hits the auth host.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        items(servers, key = { it.id }) { server ->
            val selected = server.id == selectedId
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(12.dp))
                    .background(MaterialTheme.colorScheme.surface)
                    .then(
                        if (selected) {
                            Modifier.border(1.dp, MaterialTheme.colorScheme.primary, RoundedCornerShape(12.dp))
                        } else {
                            Modifier
                        },
                    )
                    .clickable { catalog.select(server.id) }
                    .padding(16.dp),
            ) {
                Text(server.name, style = MaterialTheme.typography.titleSmall, color = Color.White)
                Text(
                    server.description,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                )
                if (selected) {
                    Text(
                        "Selected",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.primary,
                    )
                }
            }
        }
    }
}

@Composable
private fun TitleDetailScreen(
    anime: AnimeSummary,
    streamServers: ServerCatalog,
    historyDao: WatchHistoryDao,
    onBack: () -> Unit,
    onPlay: (episode: Int, sources: List<PlayableSource>) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var episode by remember { mutableIntStateOf(1) }
    var audio by remember { mutableStateOf("sub") }
    var resolving by remember { mutableStateOf(false) }
    var status by remember { mutableStateOf<String?>(null) }
    val maxEp = (anime.episodes ?: 24).coerceAtLeast(1).coerceAtMost(200)

    LaunchedEffect(anime.id) {
        historyDao.get(anime.id)?.episode?.let { episode = it.coerceIn(1, maxEp) }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(220.dp),
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
                            listOf(Color.Black.copy(alpha = 0.35f), KittyPage),
                        ),
                    ),
            )
            IconButton(
                onClick = onBack,
                modifier = Modifier
                    .align(Alignment.TopStart)
                    .padding(8.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Filled.ArrowBack,
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
                        .width(96.dp)
                        .aspectRatio(2f / 3f)
                        .clip(RoundedCornerShape(8.dp)),
                    contentScale = ContentScale.Crop,
                )
                Spacer(modifier = Modifier.width(14.dp))
                Column {
                    Text(
                        anime.title,
                        style = MaterialTheme.typography.titleLarge,
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

        Column(
            modifier = Modifier
                .weight(1f)
                .padding(16.dp),
        ) {
            if (!anime.description.isNullOrBlank()) {
                Text(
                    anime.description!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = MaterialTheme.colorScheme.onSurfaceVariant,
                    maxLines = 5,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(14.dp))
            }

            Text("Audio", style = MaterialTheme.typography.labelLarge, color = Color.White)
            Spacer(modifier = Modifier.height(6.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                AudioChip("SUB", selected = audio == "sub") { audio = "sub" }
                AudioChip("DUB", selected = audio == "dub") { audio = "dub" }
            }

            Spacer(modifier = Modifier.height(14.dp))
            Text("Episode", style = MaterialTheme.typography.labelLarge, color = Color.White)
            Spacer(modifier = Modifier.height(6.dp))
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                for (n in 1..maxEp) {
                    val selected = n == episode
                    Box(
                        modifier = Modifier
                            .size(40.dp)
                            .clip(CircleShape)
                            .background(
                                if (selected) MaterialTheme.colorScheme.primary
                                else MaterialTheme.colorScheme.surface,
                            )
                            .clickable { episode = n },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            "$n",
                            color = if (selected) MaterialTheme.colorScheme.onPrimary else Color.White,
                            style = MaterialTheme.typography.labelMedium,
                        )
                    }
                }
            }

            Spacer(modifier = Modifier.height(18.dp))
            Button(
                onClick = {
                    scope.launch {
                        resolving = true
                        status = "Resolving ${streamServers.selectedResolver().server.name}…"
                        runCatching {
                            historyDao.touchFromCatalog(anime)
                            val sources = streamServers.selectedResolver().resolve(
                                anilistId = anime.id,
                                episode = episode,
                                audio = audio,
                                titleHint = anime.title,
                            )
                            val existing = historyDao.get(anime.id)
                            if (existing != null) {
                                historyDao.upsert(
                                    existing.copy(
                                        episode = episode,
                                        updatedAtEpochMs = System.currentTimeMillis(),
                                    ),
                                )
                            }
                            onPlay(episode, sources)
                            status = null
                        }.onFailure {
                            status = it.message ?: "Resolve failed"
                        }
                        resolving = false
                    }
                },
                enabled = !resolving,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(48.dp),
                shape = RoundedCornerShape(12.dp),
            ) {
                if (resolving) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(20.dp),
                        strokeWidth = 2.dp,
                        color = MaterialTheme.colorScheme.onPrimary,
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
        }
    }
}

@Composable
private fun AudioChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(20.dp))
            .background(
                if (selected) MaterialTheme.colorScheme.primary
                else MaterialTheme.colorScheme.surface,
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 8.dp),
    ) {
        Text(
            label,
            color = if (selected) MaterialTheme.colorScheme.onPrimary else Color.White,
            fontWeight = FontWeight.SemiBold,
        )
    }
}
