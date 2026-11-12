package site.anikitty.app.ui.shell

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.ExpandLess
import androidx.compose.material.icons.rounded.ExpandMore
import androidx.compose.material.icons.rounded.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
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
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.extensions.ExtensionManifest
import site.anikitty.app.data.extensions.ExtensionStoreClient
import site.anikitty.app.data.extensions.StoreListing
import site.anikitty.app.data.servers.AniPmServer
import site.anikitty.app.data.servers.AnikotoServer
import site.anikitty.app.data.servers.GotakuServer
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.data.servers.StreamServer
import site.anikitty.app.ui.components.AnimatedSearchIcon
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyPageHeader
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText
import site.anikitty.app.ui.theme.kittyGlass
import site.anikitty.app.ui.theme.kittyGlassField
import site.anikitty.app.ui.theme.kittyGlassSoft

/**
 * Extension Store — one browse list, light glass chrome.
 * Active source lives in the header; GitHub install is a single expand panel.
 */
@Composable
fun ExtensionStoreFeed(
    catalog: ServerCatalog,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val selectedId by catalog.selectedId.collectAsState()
    val installedExt by catalog.extensions.installed.collectAsState()
    val resolvers by catalog.resolvers.collectAsState()

    var query by remember { mutableStateOf("") }
    var githubUrl by remember { mutableStateOf("") }
    var listings by remember { mutableStateOf<List<StoreListing>>(emptyList()) }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var showGithub by remember { mutableStateOf(false) }

    fun refreshStore() {
        scope.launch {
            busy = true
            status = null
            runCatching { catalog.fetchStore() }
                .onSuccess {
                    listings = it.extensions
                    val from = when {
                        it.sourceUrl?.contains("anikitty-extensions") == true ->
                            "extensions mirror"
                        it.sourceUrl?.contains("fampep/anikitty") == true ->
                            "main store"
                        else -> "store"
                    }
                    status = "${it.extensions.size} listed · $from" +
                        (it.updatedAt?.let { d -> " · $d" } ?: "")
                }
                .onFailure { status = it.message }
            busy = false
        }
    }

    LaunchedEffect(Unit) { refreshStore() }

    val activeServer = remember(selectedId, resolvers) {
        resolvers.firstOrNull { it.server.id == selectedId }?.server
            ?: resolvers.firstOrNull()?.server
    }

    val bundledIds = remember {
        setOf(AnikotoServer.ID, GotakuServer.ID, AniPmServer.ID)
    }

    // Always surface on-device resolvers even if the remote index is stale/offline.
    // First-party fampep metadata only for known bundled ids — community installs
    // keep author/github from their manifest (never mislabeled as official).
    val mergedListings = remember(listings, resolvers, installedExt, bundledIds) {
        val byId = LinkedHashMap<String, StoreListing>()
        for (listing in listings) byId[listing.id] = listing
        val manifests = installedExt.associateBy { it.id }
        for (resolver in resolvers) {
            val server = resolver.server
            if (byId.containsKey(server.id)) continue
            byId[server.id] = server.toStoreListing(
                bundled = server.id in bundledIds,
                manifest = manifests[server.id],
            )
        }
        byId.values.toList()
    }

    val filtered = remember(mergedListings, query, selectedId, bundledIds) {
        val q = query.trim()
        val base = if (q.isEmpty()) {
            mergedListings
        } else {
            mergedListings.filter { listing ->
                listing.name.contains(q, ignoreCase = true) ||
                    listing.description.contains(q, ignoreCase = true) ||
                    listing.author.contains(q, ignoreCase = true) ||
                    listing.id.contains(q, ignoreCase = true)
            }
        }
        base.sortedWith(
            compareByDescending<StoreListing> { it.id == selectedId }
                .thenByDescending { it.id in bundledIds }
                .thenByDescending { it.featured }
                .thenBy { it.name.lowercase() },
        )
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
                title = "Store",
                subtitle = buildString {
                    append(activeServer?.let { "Playing via ${it.name}" } ?: "Browse · install · switch")
                    append(" · v${BuildConfig.VERSION_NAME}")
                },
                trailing = {
                    IconButton(
                        onClick = { refreshStore() },
                        enabled = !busy,
                    ) {
                        Icon(
                            Icons.Rounded.Refresh,
                            contentDescription = "Refresh store",
                            tint = if (busy) KittyFaint else KittyAccentGlow,
                        )
                    }
                },
            )
            if (status != null) {
                Text(
                    status!!,
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyFaint,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlassField(RoundedCornerShape(16.dp)),
                singleLine = true,
                placeholder = { Text("Search extensions") },
                leadingIcon = {
                    AnimatedSearchIcon(
                        tint = if (query.isNotBlank()) KittyAccentGlow else KittyMuted,
                        active = query.isBlank(),
                    )
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Rounded.Clear, contentDescription = "Clear", tint = KittyMuted)
                        }
                    }
                },
                shape = RoundedCornerShape(16.dp),
            )
        }

        if (filtered.isEmpty() && !busy) {
            item {
                KittyEmptyState(
                    title = if (mergedListings.isEmpty()) "Store empty or offline" else "No matches",
                    body = if (mergedListings.isEmpty()) {
                        "Pull refresh, or expand Add from GitHub below."
                    } else {
                        "Clear search or try another keyword."
                    },
                    actionLabel = if (mergedListings.isEmpty()) "Refresh" else null,
                    onAction = if (mergedListings.isEmpty()) ({ refreshStore() }) else null,
                )
            }
        }

        lazyItems(filtered, key = { "store-${it.id}" }) { listing ->
            val isBundled = listing.id in bundledIds
            val installed = isBundled || installedExt.any { it.id == listing.id }
            val onDevice = resolvers.any { it.server.id == listing.id }
            val selected = selectedId == listing.id
            val icon = listing.iconUrl
                ?: resolvers.firstOrNull { it.server.id == listing.id }?.server?.iconUrl

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlass(KittyGlassShape, elevated = selected)
                    .then(
                        if (selected) {
                            Modifier.border(1.dp, KittyAccentGlow.copy(alpha = 0.55f), KittyGlassShape)
                        } else {
                            Modifier
                        },
                    )
                    .padding(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ExtensionIcon(
                        iconUrl = icon,
                        contentDescription = listing.name,
                        size = 44.dp,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            listing.name,
                            color = KittyText,
                            fontWeight = FontWeight.SemiBold,
                        )
                        if (listing.description.isNotBlank()) {
                            Text(
                                listing.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = KittyMuted,
                                maxLines = 2,
                            )
                        }
                        Text(
                            buildString {
                                if (listing.author.isNotBlank()) append(listing.author)
                                when {
                                    selected -> {
                                        if (isNotEmpty()) append(" · ")
                                        append("active")
                                    }
                                    isBundled -> {
                                        if (isNotEmpty()) append(" · ")
                                        append("bundled")
                                    }
                                    installed -> {
                                        if (isNotEmpty()) append(" · ")
                                        append("installed")
                                    }
                                }
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = if (selected) KittyAccentGlow else KittyFaint,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Button(
                        onClick = {
                            when {
                                onDevice || isBundled -> {
                                    catalog.select(listing.id)
                                    status = "Selected ${listing.name}"
                                }
                                else -> scope.launch {
                                    busy = true
                                    status = runCatching {
                                        val m = catalog.installStoreListing(
                                            listing.github,
                                            listing.manifestPath,
                                        )
                                        catalog.select(m.id)
                                        "Installed ${m.name}"
                                    }.getOrElse { e -> e.message }
                                    busy = false
                                }
                            }
                        },
                        enabled = !busy,
                        shape = RoundedCornerShape(12.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = if (selected) KittySurfaceElevated else KittyAccent,
                            contentColor = if (selected) KittyText else KittyOnAccent,
                        ),
                        contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                    ) {
                        Text(
                            when {
                                selected -> "Selected"
                                onDevice || isBundled -> "Use"
                                else -> "Install"
                            },
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (listing.siteUrl != null) {
                        TextButton(
                            onClick = {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(listing.siteUrl)),
                                )
                            },
                        ) {
                            Text("Site", color = KittyMuted, fontSize = 12.sp)
                        }
                    }
                    if (installed && !isBundled) {
                        TextButton(
                            onClick = {
                                catalog.uninstallExtension(listing.id)
                                status = "Removed ${listing.name}"
                            },
                            enabled = !busy,
                        ) {
                            Text("Remove", color = KittyFaint, fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlassSoft(KittyGlassShape)
                    .clickable { showGithub = !showGithub }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Add from GitHub",
                            color = KittyText,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "Paste a repo with anikitty-extension.json",
                            color = KittyFaint,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                    Icon(
                        if (showGithub) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                        contentDescription = null,
                        tint = KittyMuted,
                        modifier = Modifier.size(22.dp),
                    )
                }
                AnimatedVisibility(
                    visible = showGithub,
                    enter = fadeIn() + expandVertically(),
                    exit = fadeOut() + shrinkVertically(),
                ) {
                    Column {
                        Spacer(modifier = Modifier.height(10.dp))
                        OutlinedTextField(
                            value = githubUrl,
                            onValueChange = { githubUrl = it.take(300) },
                            modifier = Modifier.fillMaxWidth(),
                            singleLine = true,
                            placeholder = { Text("https://github.com/owner/repo") },
                            shape = RoundedCornerShape(14.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                val url = githubUrl.trim()
                                if (url.length < 3) return@Button
                                scope.launch {
                                    busy = true
                                    status = runCatching {
                                        val m = catalog.installFromGithub(url)
                                        catalog.select(m.id)
                                        githubUrl = ""
                                        "Installed ${m.name} (${m.version})"
                                    }.getOrElse { e -> e.message }
                                    busy = false
                                }
                            },
                            enabled = !busy && githubUrl.trim().length >= 3,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = KittyAccent,
                                contentColor = KittyOnAccent,
                            ),
                        ) {
                            Text(
                                if (busy) "Installing…" else "Install",
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                }
            }
        }

        item {
            TextButton(
                onClick = {
                    val primary = Uri.parse(ExtensionStoreClient.SUBMIT_URL)
                    val fallback = Uri.parse(ExtensionStoreClient.SUBMIT_FALLBACK_URL)
                    runCatching {
                        context.startActivity(Intent(Intent.ACTION_VIEW, primary))
                    }.onFailure {
                        context.startActivity(Intent(Intent.ACTION_VIEW, fallback))
                    }
                },
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(
                    "Submit an extension",
                    color = KittyMuted,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

private fun StreamServer.toStoreListing(
    bundled: Boolean,
    manifest: ExtensionManifest? = null,
): StoreListing {
    if (bundled) {
        return StoreListing(
            id = id,
            name = name,
            description = description,
            github = FIRST_PARTY_GITHUB,
            author = "fampep",
            featured = true,
            iconUrl = iconUrl,
            siteUrl = siteUrl,
        )
    }
    val author = manifest?.author?.trim()?.takeIf { it.isNotEmpty() } ?: "community"
    // Never attribute community installs to fampep — prefer manifest source, then homepage/site.
    val github = manifest?.sourceGithub?.trim()?.takeIf { it.isNotEmpty() }
        ?: manifest?.homepage?.trim()?.takeIf { it.startsWith("http") }
        ?: siteUrl?.trim()?.takeIf { it.startsWith("http") }
        ?: manifest?.siteUrl?.trim()?.takeIf { it.startsWith("http") }
        ?: "https://github.com/"
    return StoreListing(
        id = id,
        name = name,
        description = description.ifBlank { manifest?.description.orEmpty() },
        github = github,
        author = author,
        featured = false,
        iconUrl = iconUrl ?: manifest?.iconUrl,
        siteUrl = siteUrl ?: manifest?.siteUrl,
    )
}

private const val FIRST_PARTY_GITHUB = "https://github.com/fampep/anikitty"
