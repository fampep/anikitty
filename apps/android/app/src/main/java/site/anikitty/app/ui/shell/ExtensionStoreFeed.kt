package site.anikitty.app.ui.shell

import android.content.Intent
import android.net.Uri
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
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
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
import site.anikitty.app.data.extensions.ExtensionStoreClient
import site.anikitty.app.data.extensions.StoreListing
import site.anikitty.app.data.servers.AnikotoServer
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText
import site.anikitty.app.ui.theme.kittyGlass
import site.anikitty.app.ui.theme.kittyGlassSoft

/**
 * Dedicated Extension Store page — browse/search curated listings, install from
 * GitHub, and open the main-store submission flow (fampep).
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

    fun refreshStore() {
        scope.launch {
            busy = true
            status = null
            runCatching { catalog.fetchStore() }
                .onSuccess {
                    listings = it.extensions
                    val from = when {
                        it.sourceUrl?.contains("anikitty-extensions") == true ->
                            "main store"
                        it.sourceUrl?.contains("fampep/anikitty") == true ->
                            "monorepo fallback"
                        else -> "store"
                    }
                    status = "Store · ${it.extensions.size} listed · $from" +
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

    val filtered = remember(listings, query, selectedId) {
        val q = query.trim()
        val base = if (q.isEmpty()) {
            listings
        } else {
            listings.filter { listing ->
                listing.name.contains(q, ignoreCase = true) ||
                    listing.description.contains(q, ignoreCase = true) ||
                    listing.author.contains(q, ignoreCase = true) ||
                    listing.id.contains(q, ignoreCase = true)
            }
        }
        base.sortedWith(
            compareByDescending<StoreListing> { it.id == selectedId }
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
            Text(
                "Extension Store",
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = KittyText,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                "Browse community resolvers · search · install · submit to the main store",
                style = MaterialTheme.typography.bodyMedium,
                color = KittyMuted,
            )
        }

        if (activeServer != null) {
            item {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .kittyGlass(KittyGlassShape)
                        .padding(horizontal = 14.dp, vertical = 12.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ExtensionIcon(
                        iconUrl = activeServer.iconUrl,
                        contentDescription = activeServer.name,
                        size = 40.dp,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Active source",
                            color = KittyFaint,
                            style = MaterialTheme.typography.labelSmall,
                        )
                        Text(
                            activeServer.name,
                            color = KittyText,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                    Text(
                        "Selected",
                        color = KittyAccentGlow,
                        style = MaterialTheme.typography.labelSmall,
                        fontWeight = FontWeight.Bold,
                    )
                }
            }
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                modifier = Modifier
                    .fillMaxWidth()
                    .kittyGlassSoft(RoundedCornerShape(16.dp)),
                singleLine = true,
                placeholder = { Text("Search extensions") },
                leadingIcon = { Icon(Icons.Rounded.Search, contentDescription = null, tint = KittyMuted) },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Rounded.Clear, contentDescription = "Clear search", tint = KittyMuted)
                        }
                    }
                },
                shape = RoundedCornerShape(16.dp),
            )
        }

        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                Button(
                    onClick = { refreshStore() },
                    enabled = !busy,
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KittyAccent,
                        contentColor = KittyOnAccent,
                    ),
                ) {
                    Text(if (busy) "Loading…" else "Refresh", fontWeight = FontWeight.Bold)
                }
                OutlinedButton(
                    onClick = {
                        // Prefer dedicated extensions repo; fall back to anikitty issue form.
                        val primary = Uri.parse(ExtensionStoreClient.SUBMIT_URL)
                        val fallback = Uri.parse(ExtensionStoreClient.SUBMIT_FALLBACK_URL)
                        runCatching {
                            context.startActivity(Intent(Intent.ACTION_VIEW, primary))
                        }.onFailure {
                            context.startActivity(Intent(Intent.ACTION_VIEW, fallback))
                        }
                    },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(14.dp),
                ) {
                    Text("Submit", fontWeight = FontWeight.Bold, color = KittyText)
                }
            }
            Text(
                "Submit opens the fampep/anikitty-extensions issue form. You keep ownership of your extension.",
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
                modifier = Modifier.padding(top = 6.dp),
            )
            if (status != null) {
                Text(
                    status!!,
                    style = MaterialTheme.typography.bodySmall,
                    color = KittyMuted,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }

        item {
            KittySectionHeading(
                title = "Install from GitHub",
                subtitle = "Paste any repo with anikitty-extension.json",
                padded = false,
            )
            Spacer(modifier = Modifier.height(8.dp))
            OutlinedTextField(
                value = githubUrl,
                onValueChange = { githubUrl = it.take(300) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                label = { Text("GitHub URL") },
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
                            "Installed ${m.name} (${m.version}) · now active"
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
                    if (busy) "Installing…" else "Install from GitHub",
                    fontWeight = FontWeight.Bold,
                )
            }
            Text(
                "Manifest must include iconUrl (scraped-site favicon). See extensions/GUIDE.md.",
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
                modifier = Modifier.padding(top = 6.dp),
            )
        }

        item {
            KittySectionHeading(
                title = if (query.isBlank()) "Main store" else "Results (${filtered.size})",
                subtitle = "Curated links · authors operate their own backends",
                padded = false,
            )
        }

        if (filtered.isEmpty() && !busy) {
            item {
                Column(
                    modifier = Modifier
                        .fillMaxWidth()
                        .kittyGlass(KittyGlassShape)
                        .padding(16.dp),
                ) {
                    Text(
                        if (listings.isEmpty()) {
                            "Store empty or offline"
                        } else {
                            "No extensions match “$query”"
                        },
                        color = KittyText,
                        fontWeight = FontWeight.SemiBold,
                    )
                    Spacer(modifier = Modifier.height(4.dp))
                    Text(
                        if (listings.isEmpty()) {
                            "Pull Refresh, or paste a GitHub URL below. Main store: fampep/anikitty-extensions."
                        } else {
                            "Clear search or try another keyword."
                        },
                        color = KittyMuted,
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }
        }

        lazyItems(filtered, key = { "store-${it.id}" }) { listing ->
            val isAnikoto = listing.id == AnikotoServer.ID
            val installed = isAnikoto || installedExt.any { it.id == listing.id }
            val onDevice = resolvers.any { it.server.id == listing.id }
            val selected = selectedId == listing.id
            val icon = listing.iconUrl
                ?: resolvers.firstOrNull { it.server.id == listing.id }?.server?.iconUrl
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
                    .padding(16.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ExtensionIcon(
                        iconUrl = icon,
                        contentDescription = listing.name,
                        size = 44.dp,
                    )
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                listing.name,
                                color = KittyText,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f),
                            )
                            if (listing.featured) {
                                Text(
                                    "Featured",
                                    color = KittyAccentGlow,
                                    style = MaterialTheme.typography.labelSmall,
                                    fontWeight = FontWeight.Bold,
                                )
                            }
                        }
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
                                listing.siteUrl?.let {
                                    if (isNotEmpty()) append(" · ")
                                    append(it.removePrefix("https://").removePrefix("http://"))
                                }
                                if (icon.isNullOrBlank()) {
                                    if (isNotEmpty()) append(" · ")
                                    append("missing site icon")
                                }
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = KittyFaint,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Button(
                        onClick = {
                            when {
                                onDevice || isAnikoto -> {
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
                    ) {
                        Text(
                            when {
                                selected -> "Selected"
                                onDevice || isAnikoto -> "Use"
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
                    TextButton(
                        onClick = {
                            context.startActivity(
                                Intent(Intent.ACTION_VIEW, Uri.parse(listing.github)),
                            )
                        },
                    ) {
                        Text("GitHub", color = KittyMuted, fontSize = 12.sp)
                    }
                    if (installed && !isAnikoto) {
                        TextButton(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    status = runCatching {
                                        val m = catalog.installStoreListing(
                                            listing.github,
                                            listing.manifestPath,
                                        )
                                        catalog.select(m.id)
                                        "Updated ${m.name} (${m.version})"
                                    }.getOrElse { e -> e.message }
                                    busy = false
                                }
                            },
                            enabled = !busy,
                        ) {
                            Text("Update", color = KittyMuted, fontSize = 12.sp)
                        }
                        TextButton(
                            onClick = {
                                catalog.uninstallExtension(listing.id)
                                status = "Removed ${listing.name}"
                            },
                            enabled = !busy,
                        ) {
                            Text("Uninstall", color = KittyFaint, fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        item {
            KittySectionHeading(
                title = "Installed on this phone",
                subtitle = "Tap to select the active stream source",
                padded = false,
            )
        }
        lazyItems(resolvers.map { it.server }, key = { "inst-${it.id}" }) { server ->
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
                    .padding(14.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    ExtensionIcon(
                        iconUrl = server.iconUrl,
                        contentDescription = server.name,
                        size = 36.dp,
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
                if (isExtension) {
                    TextButton(
                        onClick = {
                            catalog.uninstallExtension(server.id)
                            status = "Removed ${server.name}"
                        },
                        contentPadding = PaddingValues(0.dp),
                    ) {
                        Text("Uninstall", color = KittyFaint, fontSize = 12.sp)
                    }
                }
            }
        }
    }
}
