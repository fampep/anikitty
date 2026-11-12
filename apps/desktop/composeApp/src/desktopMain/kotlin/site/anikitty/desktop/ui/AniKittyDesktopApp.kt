package site.anikitty.desktop.ui

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.hoverable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsHoveredAsState
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
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
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Extension
import androidx.compose.material.icons.rounded.Home
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier as Mod
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.desktop.data.anilist.AniListDesktopClient
import site.anikitty.desktop.data.anilist.AniListMedia
import site.anikitty.desktop.data.server.ServerConfig
import site.anikitty.desktop.data.stream.AniPmDesktop
import site.anikitty.desktop.data.stream.PlayableSource
import site.anikitty.desktop.ui.player.DesktopPlayerScreen
import site.anikitty.desktop.ui.theme.KittyAccent
import site.anikitty.desktop.ui.theme.KittyAccentGlow
import site.anikitty.desktop.ui.theme.KittyAtmosphere
import site.anikitty.desktop.ui.theme.KittyFaint
import site.anikitty.desktop.ui.theme.KittyGlassShape
import site.anikitty.desktop.ui.theme.KittyGlassShapePill
import site.anikitty.desktop.ui.theme.KittyGlassShapeTight
import site.anikitty.desktop.ui.theme.KittyMuted
import site.anikitty.desktop.ui.theme.KittyOnAccent
import site.anikitty.desktop.ui.theme.KittyOutline
import site.anikitty.desktop.ui.theme.KittySurface
import site.anikitty.desktop.ui.theme.KittySurfaceElevated
import site.anikitty.desktop.ui.theme.KittyText
import site.anikitty.desktop.ui.theme.KittyWarm
import site.anikitty.desktop.ui.theme.kittyGlass
import site.anikitty.desktop.ui.theme.kittyGlassField
import site.anikitty.desktop.ui.theme.kittyGlassSoft

private enum class AppDest(val label: String, val icon: ImageVector) {
    Home("Home", Icons.Rounded.Home),
    Search("Search", Icons.Rounded.Search),
    Store("Store", Icons.Rounded.Extension),
    Account("Account", Icons.Rounded.AccountCircle),
}

/**
 * Full AniKitty desktop app — cinematic glass catalog, not a sparse shell.
 */
@Composable
fun AniKittyDesktopApp() {
    val anilist = remember { AniListDesktopClient() }
    val anipm = remember { AniPmDesktop() }
    val scope = rememberCoroutineScope()

    var dest by remember { mutableStateOf(AppDest.Home) }
    var selectedId by remember { mutableStateOf<Int?>(null) }
    var playerTitle by remember { mutableStateOf<String?>(null) }
    var playerEpisode by remember { mutableStateOf(1) }
    var playerSources by remember { mutableStateOf<List<PlayableSource>>(emptyList()) }
    var playStatus by remember { mutableStateOf<String?>(null) }
    var playBusy by remember { mutableStateOf(false) }

    // Shared catalog cache so Home → Detail → Home feels like one app.
    var trending by remember { mutableStateOf<List<AniListMedia>>(emptyList()) }
    var catalogStatus by remember { mutableStateOf<String?>(null) }
    var catalogLoading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        catalogLoading = true
        runCatching { anilist.trending(perPage = 30) }
            .onSuccess {
                trending = it
                catalogStatus = null
            }
            .onFailure { catalogStatus = it.message ?: "Couldn’t load AniList" }
        catalogLoading = false
    }

    fun playEpisode(mediaId: Int, title: String, episode: Int, titleHint: String?) {
        scope.launch {
            playBusy = true
            playStatus = "Resolving Ani.pm…"
            runCatching {
                anipm.resolve(mediaId, episode, audio = "sub", titleHint = titleHint)
            }.onSuccess { sources ->
                playerTitle = title
                playerEpisode = episode
                playerSources = sources
                playStatus = null
            }.onFailure {
                playStatus = it.message ?: "Resolve failed"
            }
            playBusy = false
        }
    }

    Box(modifier = Mod.fillMaxSize()) {
        KittyAtmosphere()

        Column(modifier = Mod.fillMaxSize()) {
            if (selectedId == null) {
                AppTopBar(
                    dest = dest,
                    onDest = { dest = it },
                )
            }

            AnimatedContent(
                targetState = selectedId to dest,
                transitionSpec = {
                    (fadeIn() + slideInHorizontally { it / 24 }) togetherWith
                        (fadeOut() + slideOutHorizontally { -it / 24 })
                },
                modifier = Mod.weight(1f).fillMaxWidth(),
                label = "app-route",
            ) { (detailId, currentDest) ->
                when {
                    detailId != null -> TitleOverview(
                        anilist = anilist,
                        mediaId = detailId,
                        playStatus = playStatus,
                        playBusy = playBusy,
                        onBack = { selectedId = null },
                        onOpenRelated = { selectedId = it },
                        onPlayEpisode = { id, title, ep, hint -> playEpisode(id, title, ep, hint) },
                    )
                    currentDest == AppDest.Home -> HomeScreen(
                        items = trending,
                        loading = catalogLoading,
                        error = catalogStatus,
                        onOpen = { selectedId = it },
                        onPlayFeatured = { media ->
                            playEpisode(media.id, media.title, 1, media.title)
                        },
                        onBrowseSearch = { dest = AppDest.Search },
                    )
                    currentDest == AppDest.Search -> SearchScreen(
                        anilist = anilist,
                        onOpen = { selectedId = it },
                    )
                    currentDest == AppDest.Store -> StoreScreen()
                    currentDest == AppDest.Account -> AccountScreen()
                }
            }
        }

        if (playerSources.isNotEmpty() && playerTitle != null) {
            DesktopPlayerScreen(
                title = playerTitle!!,
                episode = playerEpisode,
                sources = playerSources,
                onClose = {
                    playerSources = emptyList()
                    playerTitle = null
                },
                onNextEpisode = {
                    val next = playerEpisode + 1
                    val id = selectedId
                    val title = playerTitle
                    if (id != null && title != null) {
                        playEpisode(id, title, next, title)
                    }
                },
            )
        }
    }
}

@Composable
private fun AppTopBar(
    dest: AppDest,
    onDest: (AppDest) -> Unit,
) {
    Row(
        modifier = Mod
            .fillMaxWidth()
            .padding(horizontal = 20.dp, vertical = 14.dp)
            .kittyGlass(elevated = true)
            .padding(horizontal = 18.dp, vertical = 12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Mod.padding(end = 20.dp)) {
            Text(
                text = "AniKitty",
                style = MaterialTheme.typography.headlineMedium,
                color = KittyText,
            )
            Text(
                text = "Watch · AniList catalog",
                style = MaterialTheme.typography.labelSmall,
                color = KittyAccentGlow,
            )
        }

        Row(
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            modifier = Mod.weight(1f),
        ) {
            AppDest.entries.forEach { item ->
                val active = item == dest
                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Mod
                        .clip(KittyGlassShapePill)
                        .background(if (active) KittySurfaceElevated else Color.Transparent)
                        .border(
                            width = if (active) 1.dp else 0.dp,
                            color = if (active) KittyAccentGlow.copy(alpha = 0.5f) else Color.Transparent,
                            shape = KittyGlassShapePill,
                        )
                        .clickable { onDest(item) }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                ) {
                    Icon(
                        item.icon,
                        contentDescription = item.label,
                        tint = if (active) KittyAccentGlow else KittyFaint,
                        modifier = Mod.size(18.dp),
                    )
                    Spacer(Mod.width(8.dp))
                    Text(
                        text = item.label,
                        color = if (active) KittyText else KittyMuted,
                        fontWeight = if (active) FontWeight.SemiBold else FontWeight.Medium,
                        style = MaterialTheme.typography.labelMedium,
                    )
                }
            }
        }

        Text(
            text = "FFmpeg · Ani.pm",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
        )
    }
}

@Composable
private fun HomeScreen(
    items: List<AniListMedia>,
    loading: Boolean,
    error: String?,
    onOpen: (Int) -> Unit,
    onPlayFeatured: (AniListMedia) -> Unit,
    onBrowseSearch: () -> Unit,
) {
    when {
        loading && items.isEmpty() -> Box(Mod.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator(color = KittyAccentGlow)
        }
        error != null && items.isEmpty() -> Box(Mod.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally) {
                Text("Couldn’t load catalog", color = KittyText, fontWeight = FontWeight.Bold)
                Text(error, color = KittyMuted, modifier = Mod.padding(top = 8.dp))
            }
        }
        else -> {
            val featured = items.firstOrNull()
            val rest = if (items.size > 1) items.drop(1) else items
            LazyColumn(
                modifier = Mod.fillMaxSize(),
                contentPadding = PaddingValues(bottom = 32.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                if (featured != null) {
                    item(key = "hero-${featured.id}") {
                        FeaturedHero(
                            media = featured,
                            onOpen = { onOpen(featured.id) },
                            onPlay = { onPlayFeatured(featured) },
                        )
                    }
                }
                item(key = "trending-header") {
                    Row(
                        modifier = Mod
                            .fillMaxWidth()
                            .padding(horizontal = 22.dp, vertical = 10.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        Column(modifier = Mod.weight(1f)) {
                            Text(
                                text = "Trending now",
                                style = MaterialTheme.typography.headlineSmall,
                                color = KittyText,
                            )
                            Text(
                                text = "AniList catalog · stream via extensions",
                                style = MaterialTheme.typography.labelSmall,
                                color = KittyFaint,
                                modifier = Mod.padding(top = 2.dp),
                            )
                        }
                        Text(
                            text = "Browse search",
                            color = KittyAccentGlow,
                            fontWeight = FontWeight.SemiBold,
                            style = MaterialTheme.typography.labelMedium,
                            modifier = Mod
                                .clip(KittyGlassShapePill)
                                .kittyGlassSoft(KittyGlassShapePill)
                                .clickable(onClick = onBrowseSearch)
                                .padding(horizontal = 14.dp, vertical = 8.dp),
                        )
                    }
                }
                item(key = "trending-rail") {
                    PosterRail(items = rest.ifEmpty { items }, onOpen = onOpen)
                }
                if (items.size > 8) {
                    item(key = "popular-header") {
                        Text(
                            text = "More from AniList",
                            style = MaterialTheme.typography.headlineSmall,
                            color = KittyText,
                            modifier = Mod.padding(horizontal = 22.dp, vertical = 8.dp),
                        )
                    }
                    item(key = "popular-rail") {
                        PosterRail(
                            items = items.drop(1).reversed().take(18),
                            onOpen = onOpen,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FeaturedHero(
    media: AniListMedia,
    onOpen: () -> Unit,
    onPlay: () -> Unit,
) {
    // Edge-bleed cinematic hero — dissolves into the page like a streaming home.
    Box(
        modifier = Mod
            .fillMaxWidth()
            .height(460.dp)
            .clickable(onClick = onOpen),
    ) {
        AsyncImage(
            model = media.bannerUrl ?: media.coverUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Mod.fillMaxSize(),
        )
        Box(
            modifier = Mod
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        0f to Color.Black.copy(alpha = 0.88f),
                        0.38f to Color.Black.copy(alpha = 0.45f),
                        0.72f to Color.Black.copy(alpha = 0.12f),
                        1f to Color.Transparent,
                    ),
                ),
        )
        Box(
            modifier = Mod
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Black.copy(alpha = 0.35f),
                        0.35f to Color.Transparent,
                        0.75f to Color.Black.copy(alpha = 0.55f),
                        1f to Color.Black.copy(alpha = 0.92f),
                    ),
                ),
        )
        Column(
            modifier = Mod
                .align(Alignment.BottomStart)
                .fillMaxWidth(0.58f)
                .padding(start = 28.dp, end = 20.dp, bottom = 36.dp),
        ) {
            Text(
                text = "FEATURED",
                color = KittyAccentGlow,
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.6.sp,
            )
            Text(
                text = media.title,
                style = MaterialTheme.typography.displaySmall,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                modifier = Mod.padding(top = 8.dp),
            )
            val meta = listOfNotNull(
                media.averageScore?.let { "★ $it%" },
                media.seasonLabel(),
                media.format,
                media.episodes?.let { "$it eps" },
            )
            if (meta.isNotEmpty()) {
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    modifier = Mod.padding(top = 12.dp),
                ) {
                    meta.forEach { MetaPill(it) }
                }
            }
            media.description?.takeIf { it.isNotBlank() }?.let { blurb ->
                Text(
                    text = blurb,
                    color = Color.White.copy(alpha = 0.72f),
                    style = MaterialTheme.typography.bodyMedium,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Mod.padding(top = 12.dp),
                )
            }
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
                modifier = Mod.padding(top = 20.dp),
            ) {
                PrimaryAction(
                    label = "Play",
                    icon = Icons.Rounded.PlayArrow,
                    onClick = onPlay,
                )
                SecondaryAction(label = "Overview", onClick = onOpen)
            }
        }
    }
}

@Composable
private fun PosterRail(items: List<AniListMedia>, onOpen: (Int) -> Unit) {
    LazyRow(
        contentPadding = PaddingValues(horizontal = 20.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Mod.fillMaxWidth(),
    ) {
        items(items, key = { it.id }) { media ->
            PosterCard(media = media, onOpen = { onOpen(media.id) })
        }
    }
}

@Composable
private fun PosterCard(media: AniListMedia, onOpen: () -> Unit) {
    val interaction = remember { MutableInteractionSource() }
    val hovered by interaction.collectIsHoveredAsState()
    Column(
        modifier = Mod
            .width(132.dp)
            .hoverable(interaction)
            .clip(RoundedCornerShape(16.dp))
            .then(if (hovered) Mod.kittyGlass(elevated = true) else Mod)
            .clickable(onClick = onOpen)
            .padding(6.dp),
    ) {
        Box {
            AsyncImage(
                model = media.coverUrl,
                contentDescription = media.title,
                contentScale = ContentScale.Crop,
                modifier = Mod
                    .fillMaxWidth()
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(14.dp))
                    .background(KittySurfaceElevated),
            )
            media.averageScore?.let { score ->
                Text(
                    text = "★ $score%",
                    color = KittyText,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Mod
                        .align(Alignment.TopEnd)
                        .padding(7.dp)
                        .clip(KittyGlassShapePill)
                        .background(Color.Black.copy(alpha = 0.55f))
                        .border(1.dp, KittyOutline, KittyGlassShapePill)
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                )
            }
        }
        Text(
            text = media.title,
            color = KittyText,
            fontWeight = FontWeight.SemiBold,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelMedium,
            modifier = Mod.padding(top = 8.dp),
        )
        val meta = listOfNotNull(
            media.format,
            media.episodes?.let { "$it eps" },
        ).joinToString(" · ")
        if (meta.isNotBlank()) {
            Text(text = meta, color = KittyFaint, style = MaterialTheme.typography.labelSmall)
        }
    }
}

@Composable
private fun SearchScreen(
    anilist: AniListDesktopClient,
    onOpen: (Int) -> Unit,
) {
    var query by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<AniListMedia>>(emptyList()) }
    var status by remember { mutableStateOf("Search the AniList catalog") }
    var loading by remember { mutableStateOf(false) }
    var searchJob by remember { mutableStateOf<Job?>(null) }
    val scope = rememberCoroutineScope()

    Column(
        modifier = Mod
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 8.dp),
    ) {
        Text(
            text = "Search",
            style = MaterialTheme.typography.headlineSmall,
            color = KittyText,
        )
        Text(
            text = "Titles, studios, seasons — AniList only",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 2.dp, bottom = 14.dp),
        )
        OutlinedTextField(
            value = query,
            onValueChange = { raw ->
                query = raw.take(80)
                searchJob?.cancel()
                searchJob = scope.launch {
                    val q = query.trim()
                    if (q.length < 2) {
                        items = emptyList()
                        status = "Type at least 2 characters"
                        return@launch
                    }
                    delay(280)
                    loading = true
                    runCatching { anilist.search(q) }
                        .onSuccess {
                            items = it
                            status = "${it.size} matches"
                        }
                        .onFailure { status = it.message ?: "Search failed" }
                    loading = false
                }
            },
            modifier = Mod.fillMaxWidth().kittyGlassField(),
            singleLine = true,
            placeholder = { Text("Find a series…", color = KittyFaint) },
            leadingIcon = {
                Icon(Icons.Rounded.Search, contentDescription = null, tint = KittyAccentGlow)
            },
            shape = KittyGlassShapeTight,
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = KittyText,
                unfocusedTextColor = KittyText,
                focusedBorderColor = KittyAccentGlow.copy(alpha = 0.55f),
                unfocusedBorderColor = Color.Transparent,
                cursorColor = KittyAccentGlow,
                focusedContainerColor = Color.Transparent,
                unfocusedContainerColor = Color.Transparent,
            ),
        )
        Text(
            text = if (loading) "Searching…" else status,
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 10.dp, bottom = 12.dp),
        )
        if (items.isNotEmpty()) {
            LazyVerticalGrid(
                columns = GridCells.Adaptive(148.dp),
                horizontalArrangement = Arrangement.spacedBy(14.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                contentPadding = PaddingValues(bottom = 24.dp),
                modifier = Mod.fillMaxSize(),
            ) {
                items(items, key = { it.id }) { media ->
                    PosterCard(media = media, onOpen = { onOpen(media.id) })
                }
            }
        }
    }
}

@Composable
private fun TitleOverview(
    anilist: AniListDesktopClient,
    mediaId: Int,
    playStatus: String?,
    playBusy: Boolean,
    onBack: () -> Unit,
    onOpenRelated: (Int) -> Unit,
    onPlayEpisode: (anilistId: Int, title: String, episode: Int, titleHint: String?) -> Unit,
) {
    var detail by remember(mediaId) { mutableStateOf<AniListMedia?>(null) }
    var status by remember(mediaId) { mutableStateOf<String?>(null) }
    var loading by remember(mediaId) { mutableStateOf(true) }

    LaunchedEffect(mediaId) {
        loading = true
        status = null
        runCatching { anilist.media(mediaId) }
            .onSuccess { detail = it }
            .onFailure { status = it.message ?: "AniList detail failed" }
        loading = false
    }

    val media = detail
    Column(
        modifier = Mod
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 12.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Mod
                    .kittyGlassSoft(KittyGlassShapeTight)
                    .clickable(onClick = onBack)
                    .padding(horizontal = 12.dp, vertical = 8.dp),
            ) {
                Icon(
                    Icons.AutoMirrored.Rounded.ArrowBack,
                    contentDescription = "Back",
                    tint = KittyAccentGlow,
                    modifier = Mod.size(18.dp),
                )
                Spacer(Mod.width(8.dp))
                Text("Library", color = KittyText, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Mod.width(14.dp))
            Text("Overview · AniList", style = MaterialTheme.typography.labelSmall, color = KittyFaint)
        }

        Spacer(Mod.height(16.dp))
        when {
            loading -> Box(
                modifier = Mod.fillMaxWidth().height(280.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KittyAccentGlow)
            }
            media == null -> Text(status ?: "Not found", color = KittyMuted)
            else -> {
                Box(
                    modifier = Mod
                        .fillMaxWidth()
                        .height(280.dp)
                        .clip(KittyGlassShape)
                        .border(1.dp, KittyOutline, KittyGlassShape),
                ) {
                    AsyncImage(
                        model = media.bannerUrl ?: media.coverUrl,
                        contentDescription = null,
                        contentScale = ContentScale.Crop,
                        modifier = Mod.fillMaxSize(),
                    )
                    Box(
                        modifier = Mod.fillMaxSize().background(
                            Brush.verticalGradient(
                                listOf(
                                    Color.Black.copy(alpha = 0.2f),
                                    Color.Black.copy(alpha = 0.85f),
                                ),
                            ),
                        ),
                    )
                    Row(
                        modifier = Mod
                            .align(Alignment.BottomStart)
                            .padding(22.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        AsyncImage(
                            model = media.coverUrl,
                            contentDescription = media.title,
                            contentScale = ContentScale.Crop,
                            modifier = Mod
                                .width(120.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, KittyOutline, RoundedCornerShape(12.dp)),
                        )
                        Spacer(Mod.width(18.dp))
                        Column {
                            Text(
                                text = media.title,
                                style = MaterialTheme.typography.headlineMedium,
                                color = Color.White,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val meta = listOfNotNull(
                                media.seasonLabel(),
                                media.format,
                                media.episodes?.let { "$it eps" },
                                media.averageScore?.let { "★ $it%" },
                            ).joinToString(" · ")
                            if (meta.isNotBlank()) {
                                Text(
                                    text = meta,
                                    color = Color.White.copy(alpha = 0.72f),
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Mod.padding(top = 6.dp),
                                )
                            }
                            Row(
                                horizontalArrangement = Arrangement.spacedBy(10.dp),
                                modifier = Mod.padding(top = 14.dp),
                            ) {
                                PrimaryAction(
                                    label = "Play ep 1",
                                    icon = Icons.Rounded.PlayArrow,
                                    onClick = {
                                        onPlayEpisode(media.id, media.title, 1, media.title)
                                    },
                                    enabled = !playBusy,
                                )
                            }
                        }
                    }
                }

                Spacer(Mod.height(16.dp))
                Column(
                    modifier = Mod
                        .fillMaxWidth()
                        .kittyGlass()
                        .padding(18.dp),
                ) {
                    Text("Overview", color = KittyText, style = MaterialTheme.typography.titleSmall)
                    Text(
                        "AniList is the catalog · extensions only stream",
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Mod.padding(top = 2.dp, bottom = 12.dp),
                    )
                    if (media.genres.isNotEmpty()) {
                        Row(
                            modifier = Mod.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            media.genres.take(8).forEach { MetaPill(it) }
                        }
                        Spacer(Mod.height(12.dp))
                    }
                    val facts = listOfNotNull(
                        media.studios.takeIf { it.isNotEmpty() }?.joinToString(" · "),
                        media.status?.replace('_', ' '),
                    ).joinToString("  ·  ")
                    if (facts.isNotBlank()) {
                        Text(facts, color = KittyMuted, style = MaterialTheme.typography.bodySmall)
                        Spacer(Mod.height(8.dp))
                    }
                    if (!media.description.isNullOrBlank()) {
                        Text(
                            media.description,
                            color = KittyMuted,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 10,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                val seasons = media.seasonEntries()
                if (seasons.size > 1) {
                    Spacer(Mod.height(18.dp))
                    SectionLabel("Seasons", "AniList prequel / sequel chain")
                    Row(
                        modifier = Mod.horizontalScroll(rememberScrollState()),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        seasons.forEach { season ->
                            val selected = season.id == media.id
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
                            SeasonChip(
                                label = label,
                                selected = selected,
                                onClick = { if (!selected) onOpenRelated(season.id) },
                            )
                        }
                    }
                }

                val episodes = media.episodeItems()
                Spacer(Mod.height(18.dp))
                SectionLabel("Episodes", "${episodes.size} from AniList · Ani.pm stream")
                if (playStatus != null) {
                    Text(
                        playStatus,
                        color = KittyAccentGlow,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Mod.padding(bottom = 8.dp),
                    )
                }
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(episodes.take(48), key = { it.number }) { ep ->
                        Column(
                            modifier = Mod
                                .width(176.dp)
                                .kittyGlassSoft(KittyGlassShapeTight)
                                .clickable(enabled = !playBusy) {
                                    onPlayEpisode(media.id, media.title, ep.number, media.title)
                                }
                                .padding(8.dp),
                        ) {
                            Box {
                                AsyncImage(
                                    model = ep.thumbnailUrl,
                                    contentDescription = ep.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Mod
                                        .fillMaxWidth()
                                        .height(96.dp)
                                        .clip(RoundedCornerShape(10.dp))
                                        .background(KittySurfaceElevated),
                                )
                                Icon(
                                    Icons.Rounded.PlayArrow,
                                    contentDescription = null,
                                    tint = Color.White,
                                    modifier = Mod
                                        .align(Alignment.Center)
                                        .size(36.dp)
                                        .clip(CircleShape)
                                        .background(Color.Black.copy(alpha = 0.45f))
                                        .padding(6.dp),
                                )
                            }
                            Text(
                                "Ep ${ep.number}",
                                color = KittyAccentGlow,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Mod.padding(top = 8.dp),
                            )
                            Text(
                                ep.title,
                                color = KittyText,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                                style = MaterialTheme.typography.bodySmall,
                            )
                        }
                    }
                }

                val related = media.relatedOutsideSeasons()
                if (related.isNotEmpty()) {
                    Spacer(Mod.height(20.dp))
                    SectionLabel("Related", "AniList spin-offs and more")
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                        items(related, key = { it.id }) { rel ->
                            Column(
                                modifier = Mod
                                    .width(118.dp)
                                    .kittyGlassSoft(KittyGlassShapeTight)
                                    .clickable { onOpenRelated(rel.id) }
                                    .padding(8.dp),
                            ) {
                                AsyncImage(
                                    model = rel.coverUrl,
                                    contentDescription = rel.title,
                                    contentScale = ContentScale.Crop,
                                    modifier = Mod
                                        .fillMaxWidth()
                                        .aspectRatio(2f / 3f)
                                        .clip(RoundedCornerShape(10.dp)),
                                )
                                Text(
                                    rel.relationType,
                                    color = KittyAccentGlow,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Mod.padding(top = 6.dp),
                                )
                                Text(
                                    rel.title,
                                    color = KittyText,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.labelMedium,
                                )
                            }
                        }
                    }
                }
                Spacer(Mod.height(28.dp))
            }
        }
    }
}

@Composable
private fun StoreScreen() {
    Column(
        modifier = Mod
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = 20.dp, vertical = 8.dp),
    ) {
        Text("Store", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            "Stream providers only · AniList stays the catalog",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 2.dp, bottom = 16.dp),
        )
        listOf(
            Triple("Ani.pm", "Settlar HLS · glass player", "Default for desktop play"),
            Triple("Anikoto", "On-device MegaPlay path", "Bundled · Android parity"),
            Triple("Gotaku", "gotakudl unwrap", "Bundled · Android parity"),
        ).forEach { (name, blurb, note) ->
            Row(
                modifier = Mod
                    .fillMaxWidth()
                    .padding(bottom = 12.dp)
                    .kittyGlass()
                    .padding(16.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    modifier = Mod
                        .size(48.dp)
                        .clip(RoundedCornerShape(14.dp))
                        .background(KittySurfaceElevated)
                        .border(1.dp, KittyOutline, RoundedCornerShape(14.dp)),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(Icons.Rounded.Extension, null, tint = KittyAccentGlow)
                }
                Spacer(Mod.width(14.dp))
                Column(modifier = Mod.weight(1f)) {
                    Text(name, color = KittyText, fontWeight = FontWeight.Bold)
                    Text(blurb, color = KittyMuted, style = MaterialTheme.typography.bodyMedium)
                    Text(note, color = KittyFaint, style = MaterialTheme.typography.labelSmall)
                }
                Text(
                    "Bundled",
                    color = KittyOnAccent,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Mod
                        .clip(KittyGlassShapePill)
                        .background(KittyAccent)
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }
        }
    }
}

@Composable
private fun AccountScreen() {
    Column(
        modifier = Mod
            .fillMaxSize()
            .padding(horizontal = 20.dp, vertical = 8.dp),
    ) {
        Text("Account", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            "Password accounts on the dedicated Go VPS",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 2.dp, bottom = 16.dp),
        )
        Column(
            modifier = Mod
                .fillMaxWidth()
                .kittyGlass(elevated = true)
                .padding(20.dp),
        ) {
            Text("Dedicated auth server", color = KittyText, fontWeight = FontWeight.Bold)
            Text(
                ServerConfig.DEFAULT,
                color = KittyAccentGlow,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 8.dp),
            )
            Text(
                "Same fixed URL as the Android app. Sign-in UI is next.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 12.dp),
            )
        }
    }
}

@Composable
private fun SectionLabel(title: String, subtitle: String) {
    Text(title, color = KittyText, style = MaterialTheme.typography.titleSmall)
    Text(
        subtitle,
        color = KittyFaint,
        style = MaterialTheme.typography.labelSmall,
        modifier = Mod.padding(top = 2.dp, bottom = 10.dp),
    )
}

@Composable
private fun PrimaryAction(
    label: String,
    icon: ImageVector,
    onClick: () -> Unit,
    enabled: Boolean = true,
) {
    Row(
        verticalAlignment = Alignment.CenterVertically,
        modifier = Mod
            .clip(KittyGlassShapePill)
            .background(if (enabled) KittyAccent else KittySurfaceElevated)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    ) {
        Icon(icon, null, tint = if (enabled) KittyOnAccent else KittyFaint, modifier = Mod.size(18.dp))
        Spacer(Mod.width(6.dp))
        Text(
            label,
            color = if (enabled) KittyOnAccent else KittyFaint,
            fontWeight = FontWeight.Bold,
            fontSize = 13.sp,
        )
    }
}

@Composable
private fun SecondaryAction(label: String, onClick: () -> Unit) {
    Text(
        label,
        color = KittyText,
        fontWeight = FontWeight.SemiBold,
        fontSize = 13.sp,
        modifier = Mod
            .clip(KittyGlassShapePill)
            .kittyGlassSoft(KittyGlassShapePill)
            .clickable(onClick = onClick)
            .padding(horizontal = 16.dp, vertical = 10.dp),
    )
}

@Composable
private fun MetaPill(label: String) {
    Text(
        label,
        color = KittyText,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        modifier = Mod
            .clip(KittyGlassShapePill)
            .background(KittySurfaceElevated)
            .border(1.dp, KittyOutline, KittyGlassShapePill)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun SeasonChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        label,
        color = if (selected) KittyOnAccent else KittyText,
        fontWeight = FontWeight.Bold,
        fontSize = 13.sp,
        modifier = Mod
            .clip(RoundedCornerShape(12.dp))
            .background(if (selected) KittyAccent else KittySurfaceElevated)
            .border(
                1.dp,
                if (selected) KittyAccent else KittyOutline,
                RoundedCornerShape(12.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 10.dp),
    )
}
