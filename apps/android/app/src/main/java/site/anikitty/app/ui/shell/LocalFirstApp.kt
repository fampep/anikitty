package site.anikitty.app.ui.shell

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Dns
import androidx.compose.material.icons.outlined.History
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.touchFromCatalog

private enum class Tab { Home, Search, History, Servers }

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LocalFirstApp(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    username: String,
    onSignOut: () -> Unit,
) {
    var tab by remember { mutableStateOf(Tab.Home) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = {
                    Column {
                        Text("AniKitty")
                        Text(
                            "$username · streams on-device",
                            style = MaterialTheme.typography.labelSmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                },
                actions = {
                    TextButton(onClick = onSignOut) { Text("Sign out") }
                },
            )
        },
        bottomBar = {
            NavigationBar {
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
            )
            Tab.Search -> SearchTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                aniList = aniList,
                historyDao = historyDao,
            )
            Tab.History -> HistoryTab(
                modifier = Modifier.padding(padding).fillMaxSize(),
                historyDao = historyDao,
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
) {
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    val scope = rememberCoroutineScope()

    fun reload() {
        scope.launch {
            loading = true
            error = null
            runCatching { aniList.trending() }
                .onSuccess { items = it }
                .onFailure { error = it.message ?: "Failed to load trending" }
            loading = false
        }
    }

    LaunchedEffect(Unit) {
        loading = true
        error = null
        runCatching { aniList.trending() }
            .onSuccess { items = it }
            .onFailure { error = it.message ?: "Failed to load trending" }
        loading = false
    }

    CatalogPane(
        modifier = modifier,
        title = "Trending on AniList",
        subtitle = "Browse without an account. Tap a title to save local continue-watching.",
        loading = loading,
        error = error,
        items = items,
        onRetry = { reload() },
        onOpen = { anime ->
            scope.launch { historyDao.touchFromCatalog(anime) }
        },
    )
}

@Composable
private fun SearchTab(
    modifier: Modifier,
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
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
        ) {
            Text("Search")
        }
        Spacer(modifier = Modifier.height(12.dp))
        CatalogPane(
            modifier = Modifier.weight(1f),
            title = null,
            subtitle = null,
            loading = loading,
            error = error,
            items = items,
            onRetry = { runSearch(query.trim()) },
            onOpen = { anime ->
                scope.launch { historyDao.touchFromCatalog(anime) }
            },
            contentPadding = PaddingValues(0.dp),
        )
    }
}

@Composable
private fun HistoryTab(
    modifier: Modifier,
    historyDao: WatchHistoryDao,
) {
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    val scope = rememberCoroutineScope()

    Column(modifier = modifier.padding(16.dp)) {
        Text("On this device", style = MaterialTheme.typography.titleMedium)
        Text(
            "Watch history stays local. Clearing app data or uninstalling removes it.",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(8.dp))
        if (history.isNotEmpty()) {
            OutlinedButton(
                onClick = { scope.launch { historyDao.clear() } },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Clear local history")
            }
            Spacer(modifier = Modifier.height(8.dp))
        }
        if (history.isEmpty()) {
            Text(
                "No history yet. Open something from Home or Search to add it here.",
                modifier = Modifier.padding(top = 24.dp),
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        } else {
            LazyColumn(
                modifier = Modifier.weight(1f),
                verticalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                items(history, key = { it.anilistId }) { entry ->
                    Card(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.padding(12.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            AsyncImage(
                                model = entry.coverImageUrl,
                                contentDescription = entry.title,
                                modifier = Modifier
                                    .width(56.dp)
                                    .aspectRatio(2f / 3f),
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
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    OutlinedButton(
                                        onClick = {
                                            scope.launch {
                                                historyDao.upsert(
                                                    entry.copy(
                                                        episode = (entry.episode + 1).coerceAtLeast(1),
                                                        updatedAtEpochMs = System.currentTimeMillis(),
                                                    ),
                                                )
                                            }
                                        },
                                    ) {
                                        Text("+ ep")
                                    }
                                    OutlinedButton(
                                        onClick = {
                                            scope.launch { historyDao.delete(entry.anilistId) }
                                        },
                                    ) {
                                        Text("Remove")
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ServersTab(
    modifier: Modifier,
    catalog: ServerCatalog,
) {
    val selectedId by catalog.selectedId.collectAsState()
    val servers = catalog.servers

    LazyColumn(
        modifier = modifier.padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Text("Watch servers", style = MaterialTheme.typography.titleMedium)
            Text(
                "Pick a built-in server, then watch. The phone only resolves a playable URL; streaming bandwidth stays on-device. No third-party extension installs.",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        items(servers, key = { it.id }) { server ->
            val selected = server.id == selectedId
            Card(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { catalog.select(server.id) },
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(server.name, style = MaterialTheme.typography.titleSmall)
                        Text(
                            server.description,
                            style = MaterialTheme.typography.bodySmall,
                            color = MaterialTheme.colorScheme.onSurfaceVariant,
                        )
                        if (selected) {
                            Text(
                                "Selected — use Home/Search, then watch via this server",
                                style = MaterialTheme.typography.labelSmall,
                                color = MaterialTheme.colorScheme.primary,
                            )
                        }
                    }
                    if (selected) {
                        Text("ON", color = MaterialTheme.colorScheme.primary)
                    } else {
                        OutlinedButton(onClick = { catalog.select(server.id) }) {
                            Text("Select")
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun CatalogPane(
    modifier: Modifier,
    title: String?,
    subtitle: String?,
    loading: Boolean,
    error: String?,
    items: List<AnimeSummary>,
    onRetry: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
    contentPadding: PaddingValues = PaddingValues(16.dp),
) {
    Column(modifier = modifier) {
        if (title != null) {
            Text(
                title,
                modifier = Modifier.padding(horizontal = 16.dp).padding(top = 8.dp),
                style = MaterialTheme.typography.titleMedium,
            )
        }
        if (subtitle != null) {
            Text(
                subtitle,
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
            )
        }
        when {
            loading && items.isEmpty() -> {
                Column(
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    CircularProgressIndicator()
                }
            }
            error != null && items.isEmpty() -> {
                Column(
                    modifier = Modifier.weight(1f).fillMaxWidth().padding(24.dp),
                    verticalArrangement = Arrangement.Center,
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(error, color = MaterialTheme.colorScheme.error)
                    Spacer(modifier = Modifier.height(12.dp))
                    Button(onClick = onRetry) { Text("Retry") }
                }
            }
            else -> {
                if (error != null) {
                    Text(
                        error,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
                        color = MaterialTheme.colorScheme.error,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
                LazyVerticalGrid(
                    columns = GridCells.Adaptive(120.dp),
                    contentPadding = contentPadding,
                    verticalArrangement = Arrangement.spacedBy(12.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                    modifier = Modifier.weight(1f).fillMaxWidth(),
                ) {
                    items(items, key = { it.id }) { anime ->
                        AnimeCard(anime = anime, onClick = { onOpen(anime) })
                    }
                }
            }
        }
    }
}

@Composable
private fun AnimeCard(anime: AnimeSummary, onClick: () -> Unit) {
    Card(
        modifier = Modifier
            .fillMaxWidth()
            .clickable(onClick = onClick),
    ) {
        Column {
            AsyncImage(
                model = anime.coverImageUrl,
                contentDescription = anime.title,
                modifier = Modifier
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f),
                contentScale = ContentScale.Crop,
            )
            Text(
                anime.title,
                modifier = Modifier.padding(8.dp),
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}
