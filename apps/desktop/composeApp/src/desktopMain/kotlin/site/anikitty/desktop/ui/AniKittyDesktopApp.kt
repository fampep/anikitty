package site.anikitty.desktop.ui

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
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
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import coil3.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.desktop.data.anilist.AniListDesktopClient
import site.anikitty.desktop.data.anilist.AniListMedia
import site.anikitty.desktop.data.server.ServerConfig
import site.anikitty.desktop.ui.theme.KittyAccentGlow
import site.anikitty.desktop.ui.theme.KittyFaint
import site.anikitty.desktop.ui.theme.KittyMuted
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

    Row(
        modifier = Mod
            .fillMaxSize()
            .background(KittyPageBrush),
    ) {
        DesktopRail(
            selected = tab,
            onSelect = { tab = it },
            railModifier = Mod
                .fillMaxHeight()
                .width(220.dp)
                .padding(16.dp),
        )
        Box(
            modifier = Mod
                .weight(1f)
                .fillMaxHeight()
                .padding(top = 20.dp, end = 24.dp, bottom = 24.dp),
        ) {
            when (tab) {
                DesktopTab.Home -> HomeSurface(anilist)
                DesktopTab.Search -> SearchSurface(anilist)
                DesktopTab.Store -> StoreSurface()
                DesktopTab.Account -> AccountSurface()
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
            text = "Glass dark · CMP",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
        )
        Text(
            text = "v1.0.0 desktop",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
        )
    }
}

@Composable
private fun HomeSurface(anilist: AniListDesktopClient) {
    var items by remember { mutableStateOf<List<AniListMedia>>(emptyList()) }
    var status by remember { mutableStateOf<String?>(null) }
    var loading by remember { mutableStateOf(true) }

    LaunchedEffect(Unit) {
        loading = true
        status = null
        runCatching { anilist.trending() }
            .onSuccess {
                items = it
                status = "${it.size} trending"
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
            loading -> Box(
                modifier = Mod.fillMaxSize(),
                contentAlignment = Alignment.Center,
            ) {
                CircularProgressIndicator(color = KittyAccentGlow)
            }
            items.isEmpty() -> Text(text = "No titles yet.", color = KittyMuted)
            else -> MediaGrid(items)
        }
    }
}

@Composable
private fun SearchSurface(anilist: AniListDesktopClient) {
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
                            status = "${it.size} matches"
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
        if (items.isNotEmpty()) MediaGrid(items)
    }
}

@Composable
private fun StoreSurface() {
    Column(modifier = Mod.fillMaxSize()) {
        Text(text = "Store", style = MaterialTheme.typography.headlineSmall, color = KittyText)
        Text(
            text = "Bundled scrapers ship in the app · BYO GitHub extensions next",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 4.dp, bottom = 16.dp),
        )
        listOf(
            "Anikoto" to "Bundled on-device scraper",
            "Gotaku" to "Bundled on-device scraper",
            "Ani.pm" to "Bundled Settlar HLS scraper (no WebView)",
        ).forEach { (name, blurb) ->
            Column(
                modifier = Mod
                    .fillMaxWidth()
                    .padding(bottom = 10.dp)
                    .clip(RoundedCornerShape(18.dp))
                    .background(KittySurface)
                    .border(1.dp, KittyOutline, RoundedCornerShape(18.dp))
                    .padding(16.dp),
            ) {
                Text(text = name, color = KittyText, fontWeight = FontWeight.SemiBold)
                Text(text = blurb, color = KittyMuted, style = MaterialTheme.typography.bodyMedium)
                Text(
                    text = "fampep · bundled",
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
            text = "Password accounts on the dedicated Go VPS · AniList link later",
            style = MaterialTheme.typography.labelSmall,
            color = KittyFaint,
            modifier = Mod.padding(top = 4.dp, bottom = 16.dp),
        )
        Column(
            modifier = Mod
                .fillMaxWidth()
                .clip(RoundedCornerShape(18.dp))
                .background(KittySurface)
                .border(1.dp, KittyOutline, RoundedCornerShape(18.dp))
                .padding(16.dp),
        ) {
            Text(text = "Dedicated auth server", color = KittyText, fontWeight = FontWeight.SemiBold)
            Text(
                text = ServerConfig.DEFAULT,
                color = KittyAccentGlow,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 6.dp),
            )
            Text(
                text = "Same fixed URL as Android. Sign-in UI lands in a follow-up.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodyMedium,
                modifier = Mod.padding(top = 10.dp),
            )
        }
    }
}

@Composable
private fun MediaGrid(items: List<AniListMedia>) {
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
                    media.seasonYear?.let { append(it) }
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
