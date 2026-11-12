package site.anikitty.desktop.ui

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
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.AccountCircle
import androidx.compose.material.icons.rounded.Extension
import androidx.compose.material.icons.rounded.Home
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil3.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.desktop.data.anilist.AniListDesktopClient
import site.anikitty.desktop.data.anilist.AniListMedia
import site.anikitty.desktop.data.server.ServerConfig
import site.anikitty.desktop.ui.theme.KittyAccent
import site.anikitty.desktop.ui.theme.KittyAccentGlow
import site.anikitty.desktop.ui.theme.KittyFaint
import site.anikitty.desktop.ui.theme.KittyMuted
import site.anikitty.desktop.ui.theme.KittyOnAccent
import site.anikitty.desktop.ui.theme.KittyOutline
import site.anikitty.desktop.ui.theme.KittyPageBrush
import site.anikitty.desktop.ui.theme.KittySurface
import site.anikitty.desktop.ui.theme.KittySurfaceElevated
import site.anikitty.desktop.ui.theme.KittyText

private enum class DesktopTab(val label: String) {
    Home("Home"),
    Search("Search"),
    Store("Store"),
    Account("Account"),
}

@Composable
fun AniKittyDesktopApp() {
    val anilist = remember { AniListDesktopClient() }
    var tab by remember { mutableStateOf(DesktopTab.Home) }
    var selectedId by remember { mutableStateOf<Int?>(null) }

    Row(
        modifier = Mod
            .fillMaxSize()
            .background(KittyPageBrush),
    ) {
        if (selectedId == null) {
            DesktopRail(
                selected = tab,
                onSelect = { tab = it },
                railModifier = Mod
                    .fillMaxHeight()
                    .width(220.dp)
                    .padding(16.dp),
            )
        }
        Box(
            modifier = Mod
                .weight(1f)
                .fillMaxHeight()
                .padding(
                    top = 20.dp,
                    start = if (selectedId == null) 0.dp else 24.dp,
                    end = 24.dp,
                    bottom = 24.dp,
                ),
        ) {
            val openDetail: (Int) -> Unit = { selectedId = it }
            when {
                selectedId != null -> TitleDetailSurface(
                    anilist = anilist,
                    mediaId = selectedId!!,
                    onBack = { selectedId = null },
                    onOpenRelated = { selectedId = it },
                )
                tab == DesktopTab.Home -> HomeSurface(anilist, openDetail)
                tab == DesktopTab.Search -> SearchSurface(anilist, openDetail)
                tab == DesktopTab.Store -> StoreSurface()
                tab == DesktopTab.Account -> AccountSurface()
            }
        }
    }
}

@Composable
private fun DesktopRail(
    selected: DesktopTab,
    onSelect: (DesktopTab) -> Unit,
    railModifier: Mod = Mod,
) {
    Column(
        modifier = railModifier
            .clip(RoundedCornerShape(22.dp))
            .background(KittySurface)
            .border(1.dp, KittyOutline, RoundedCornerShape(22.dp))
            .padding(18.dp),
    ) {
        Text(
            text = "AniKitty",
            style = MaterialTheme.typography.displaySmall,
            color = KittyText,
        )
        Text(
            text = "Windows · alpha",
            style = MaterialTheme.typography.labelSmall,
            color = KittyAccentGlow,
            modifier = Mod.padding(top = 4.dp, bottom = 20.dp),
        )
        DesktopTab.entries.forEach { item ->
            val active = item == selected
            val icon = when (item) {
                DesktopTab.Home -> Icons.Rounded.Home
                DesktopTab.Search -> Icons.Rounded.Search
                DesktopTab.Store -> Icons.Rounded.Extension
                DesktopTab.Account -> Icons.Rounded.AccountCircle
            }
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Mod
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(14.dp))
                    .background(if (active) KittySurfaceElevated else Color.Transparent)
                    .border(
                        width = if (active) 1.dp else 0.dp,
                        color = if (active) KittyAccentGlow.copy(alpha = 0.45f) else Color.Transparent,
                        shape = RoundedCornerShape(14.dp),
                    )
                    .clickable { onSelect(item) }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Icon(
                    imageVector = icon,
                    contentDescription = null,
                    tint = if (active) KittyAccentGlow else KittyFaint,
                    modifier = Mod.size(20.dp),
                )
                Spacer(Mod.width(10.dp))
                Text(
                    text = item.label,
                    color = if (active) KittyText else KittyMuted,
                    fontWeight = if (active) FontWeight.SemiBold else FontWeight.Normal,
                )
            }
            Spacer(Mod.height(6.dp))
        }
        Spacer(Mod.weight(1f))
        Text(
            text = "AniList catalog",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
        )
        Text(
            text = "Glass dark · CMP",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
        )
    }
}

@Composable
private fun HomeSurface(anilist: AniListDesktopClient, onOpen: (Int) -> Unit) {
    var items by remember { mutableStateOf<List<AniListMedia>>(emptyList()) }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        loading = true
        runCatching { anilist.trending() }
            .onSuccess {
                items = it
                status = "${it.size} trending · AniList"
            }
            .onFailure { status = it.message ?: "AniList failed" }
        loading = false
    }

    Column(modifier = Mod.fillMaxSize()) {
        Text(text = "Home", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            text = status ?: "Loading AniList…",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 4.dp, bottom = 16.dp),
        )
        when {
            loading -> Box(Mod.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KittyAccentGlow)
            }
            items.isEmpty() -> Text(text = "No titles yet.", color = KittyMuted)
            else -> MediaGrid(items, onOpen)
        }
    }
}

@Composable
private fun SearchSurface(anilist: AniListDesktopClient, onOpen: (Int) -> Unit) {
    var query by remember { mutableStateOf("") }
    var items by remember { mutableStateOf<List<AniListMedia>>(emptyList()) }
    var status by remember { mutableStateOf("Search AniList") }
    var loading by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    Column(modifier = Mod.fillMaxSize()) {
        Text(text = "Search", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Spacer(Mod.height(12.dp))
        OutlinedTextField(
            value = query,
            onValueChange = {
                query = it.take(80)
                scope.launch {
                    val q = query.trim()
                    if (q.length < 2) {
                        items = emptyList()
                        status = "Type at least 2 characters"
                        return@launch
                    }
                    loading = true
                    runCatching { anilist.search(q) }
                        .onSuccess {
                            items = it
                            status = "${it.size} matches · AniList"
                        }
                        .onFailure { status = it.message ?: "Search failed" }
                    loading = false
                }
            },
            modifier = Mod.fillMaxWidth(),
            singleLine = true,
            placeholder = { Text(text = "Title, studio, season…") },
            shape = RoundedCornerShape(16.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = KittyText,
                unfocusedTextColor = KittyText,
                focusedBorderColor = KittyAccentGlow,
                unfocusedBorderColor = KittyOutline,
                cursorColor = KittyAccentGlow,
                focusedContainerColor = KittySurface,
                unfocusedContainerColor = KittySurface,
            ),
        )
        Text(
            text = if (loading) "Searching…" else status,
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 8.dp, bottom = 12.dp),
        )
        if (items.isNotEmpty()) MediaGrid(items, onOpen)
    }
}

@Composable
private fun TitleDetailSurface(
    anilist: AniListDesktopClient,
    mediaId: Int,
    onBack: () -> Unit,
    onOpenRelated: (Int) -> Unit,
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
            .verticalScroll(rememberScrollState()),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Mod
                    .clip(RoundedCornerShape(12.dp))
                    .background(KittySurface)
                    .border(1.dp, KittyOutline, RoundedCornerShape(12.dp))
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
                Text(text = "Back", color = KittyText, fontWeight = FontWeight.SemiBold)
            }
            Spacer(Mod.width(14.dp))
            Text(
                text = "Overview · AniList",
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
            )
        }
        Spacer(Mod.height(16.dp))
        when {
            loading -> Box(
                modifier = Mod.fillMaxWidth().height(240.dp),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KittyAccentGlow)
            }
            media == null -> Text(text = status ?: "Not found", color = KittyMuted)
            else -> {
                // Hero
                Box(
                    modifier = Mod
                        .fillMaxWidth()
                        .height(220.dp)
                        .clip(RoundedCornerShape(22.dp))
                        .border(1.dp, KittyOutline, RoundedCornerShape(22.dp)),
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
                                Brush.verticalGradient(
                                    listOf(
                                        Color.Black.copy(alpha = 0.25f),
                                        Color.Black.copy(alpha = 0.78f),
                                    ),
                                ),
                            ),
                    )
                    Row(
                        modifier = Mod
                            .align(Alignment.BottomStart)
                            .padding(18.dp),
                        verticalAlignment = Alignment.Bottom,
                    ) {
                        AsyncImage(
                            model = media.coverUrl,
                            contentDescription = media.title,
                            contentScale = ContentScale.Crop,
                            modifier = Mod
                                .width(110.dp)
                                .aspectRatio(2f / 3f)
                                .clip(RoundedCornerShape(12.dp))
                                .border(1.dp, KittyOutline, RoundedCornerShape(12.dp)),
                        )
                        Spacer(Mod.width(16.dp))
                        Column {
                            Text(
                                text = media.title,
                                style = MaterialTheme.typography.headlineSmall,
                                color = Color.White,
                                fontWeight = FontWeight.Black,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                            val meta = listOfNotNull(
                                media.seasonLabel(),
                                media.format,
                                media.episodes?.let { "$it eps" },
                                media.averageScore?.let { "$it%" },
                            ).joinToString(" · ")
                            if (meta.isNotBlank()) {
                                Text(
                                    text = meta,
                                    color = Color.White.copy(alpha = 0.72f),
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Mod.padding(top = 6.dp),
                                )
                            }
                        }
                    }
                }

                Spacer(Mod.height(16.dp))
                GlassPanel {
                    Text(
                        text = "Overview",
                        color = KittyText,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = "AniList is the catalog source · extensions only stream",
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Mod.padding(top = 2.dp, bottom = 10.dp),
                    )
                    if (media.genres.isNotEmpty()) {
                        Row(
                            modifier = Mod.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            media.genres.take(8).forEach { g ->
                                MetaPill(g)
                            }
                        }
                        Spacer(Mod.height(10.dp))
                    }
                    val facts = listOfNotNull(
                        media.studios.takeIf { it.isNotEmpty() }?.joinToString(" · "),
                        media.status?.replace('_', ' '),
                    ).joinToString("  ·  ")
                    if (facts.isNotBlank()) {
                        Text(text = facts, color = KittyMuted, style = MaterialTheme.typography.bodySmall)
                        Spacer(Mod.height(8.dp))
                    }
                    if (!media.description.isNullOrBlank()) {
                        Text(
                            text = media.description,
                            color = KittyMuted,
                            style = MaterialTheme.typography.bodyMedium,
                            maxLines = 8,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                }

                val seasons = media.seasonEntries()
                if (seasons.size > 1) {
                    Spacer(Mod.height(16.dp))
                    Text(
                        text = "Seasons",
                        color = KittyText,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = "AniList prequel / sequel chain",
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Mod.padding(top = 2.dp, bottom = 10.dp),
                    )
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
                Spacer(Mod.height(16.dp))
                Text(
                    text = "Episodes",
                    color = KittyText,
                    fontWeight = FontWeight.Bold,
                    style = MaterialTheme.typography.titleSmall,
                )
                Text(
                    text = "${episodes.size} from AniList",
                    color = KittyFaint,
                    style = MaterialTheme.typography.labelSmall,
                    modifier = Mod.padding(top = 2.dp, bottom = 10.dp),
                )
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    items(episodes.take(40), key = { it.number }) { ep ->
                        Column(
                            modifier = Mod
                                .width(160.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .background(KittySurface)
                                .border(1.dp, KittyOutline, RoundedCornerShape(14.dp))
                                .padding(8.dp),
                        ) {
                            AsyncImage(
                                model = ep.thumbnailUrl,
                                contentDescription = ep.title,
                                contentScale = ContentScale.Crop,
                                modifier = Mod
                                    .fillMaxWidth()
                                    .height(90.dp)
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(KittySurfaceElevated),
                            )
                            Text(
                                text = "Ep ${ep.number}",
                                color = KittyAccentGlow,
                                fontWeight = FontWeight.Bold,
                                style = MaterialTheme.typography.labelSmall,
                                modifier = Mod.padding(top = 8.dp),
                            )
                            Text(
                                text = ep.title,
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
                    Spacer(Mod.height(18.dp))
                    Text(
                        text = "Related",
                        color = KittyText,
                        fontWeight = FontWeight.Bold,
                        style = MaterialTheme.typography.titleSmall,
                    )
                    Text(
                        text = "AniList spin-offs and more",
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelSmall,
                        modifier = Mod.padding(top = 2.dp, bottom = 10.dp),
                    )
                    LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(related, key = { it.id }) { rel ->
                            Column(
                                modifier = Mod
                                    .width(112.dp)
                                    .clip(RoundedCornerShape(14.dp))
                                    .background(KittySurface)
                                    .border(1.dp, KittyOutline, RoundedCornerShape(14.dp))
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
                                    text = rel.relationType,
                                    color = KittyAccentGlow,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.SemiBold,
                                    modifier = Mod.padding(top = 6.dp),
                                )
                                Text(
                                    text = rel.title,
                                    color = KittyText,
                                    maxLines = 2,
                                    overflow = TextOverflow.Ellipsis,
                                    style = MaterialTheme.typography.labelMedium,
                                    fontWeight = FontWeight.SemiBold,
                                )
                            }
                        }
                    }
                }
                Spacer(Mod.height(24.dp))
            }
        }
    }
}

@Composable
private fun StoreSurface() {
    Column(modifier = Mod.fillMaxSize()) {
        Text(text = "Store", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            text = "Stream providers only · catalog stays on AniList",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 4.dp, bottom = 16.dp),
        )
        listOf(
            "Anikoto" to "Bundled on-device scraper",
            "Gotaku" to "Bundled on-device scraper",
            "Ani.pm" to "Bundled Settlar HLS scraper (no WebView)",
        ).forEach { (name, blurb) ->
            GlassPanel(modifier = Mod.padding(bottom = 10.dp)) {
                Text(text = name, color = KittyText, fontWeight = FontWeight.SemiBold)
                Text(text = blurb, color = KittyMuted, style = MaterialTheme.typography.bodyMedium)
                Text(
                    text = "fampep · stream link · bundled",
                    color = KittyFaint,
                    style = MaterialTheme.typography.labelSmall,
                )
            }
        }
    }
}

@Composable
private fun AccountSurface() {
    Column(modifier = Mod.fillMaxSize()) {
        Text(text = "Account", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            text = "Password accounts on the dedicated Go VPS",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 4.dp, bottom = 16.dp),
        )
        GlassPanel {
            Text(text = "Dedicated auth server", color = KittyText, fontWeight = FontWeight.SemiBold)
            Text(
                text = ServerConfig.DEFAULT,
                color = KittyAccentGlow,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 6.dp),
            )
            Text(
                text = "Same fixed URL as Android. Sign-in UI next.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 10.dp),
            )
        }
    }
}

@Composable
private fun MediaGrid(items: List<AniListMedia>, onOpen: (Int) -> Unit) {
    LazyVerticalGrid(
        columns = GridCells.Adaptive(140.dp),
        contentPadding = PaddingValues(bottom = 24.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
        modifier = Mod.fillMaxSize(),
    ) {
        items(items, key = { it.id }) { media ->
            Column(
                modifier = Mod
                    .clip(RoundedCornerShape(16.dp))
                    .background(KittySurface)
                    .border(1.dp, KittyOutline, RoundedCornerShape(16.dp))
                    .clickable { onOpen(media.id) }
                    .padding(8.dp),
            ) {
                AsyncImage(
                    model = media.coverUrl,
                    contentDescription = media.title,
                    contentScale = ContentScale.Crop,
                    modifier = Mod
                        .fillMaxWidth()
                        .height(190.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(KittySurfaceElevated),
                )
                Text(
                    text = media.title,
                    color = KittyText,
                    fontWeight = FontWeight.SemiBold,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.bodyMedium,
                    modifier = Mod.padding(top = 8.dp),
                )
                val meta = buildString {
                    media.seasonLabel()?.let { append(it) }
                        ?: media.seasonYear?.let { append(it) }
                    media.averageScore?.let {
                        if (isNotEmpty()) append(" · ")
                        append("$it%")
                    }
                }
                if (meta.isNotBlank()) {
                    Text(text = meta, color = KittyFaint, style = MaterialTheme.typography.labelSmall)
                }
            }
        }
    }
}

@Composable
private fun GlassPanel(
    modifier: Mod = Mod,
    content: @Composable () -> Unit,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(18.dp))
            .background(KittySurface)
            .border(1.dp, KittyOutline, RoundedCornerShape(18.dp))
            .padding(16.dp),
        content = { content() },
    )
}

@Composable
private fun MetaPill(label: String) {
    Text(
        text = label,
        color = KittyText,
        style = MaterialTheme.typography.labelSmall,
        fontWeight = FontWeight.SemiBold,
        modifier = Mod
            .clip(RoundedCornerShape(999.dp))
            .background(KittySurfaceElevated)
            .border(1.dp, KittyOutline, RoundedCornerShape(999.dp))
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun SeasonChip(label: String, selected: Boolean, onClick: () -> Unit) {
    Text(
        text = label,
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
