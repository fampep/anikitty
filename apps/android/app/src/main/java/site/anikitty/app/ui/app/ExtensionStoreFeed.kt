// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import android.content.Intent
import android.net.Uri
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.expandVertically
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.shrinkVertically
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.activity.compose.BackHandler
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
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
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
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.extensions.ExtensionManifest
import site.anikitty.app.data.extensions.ExtensionStoreClient
import site.anikitty.app.data.extensions.StoreListing
import site.anikitty.app.data.extensions.explainInstallFailure
import site.anikitty.app.data.extensions.isRetiredExtension
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.data.servers.StreamServer
import site.anikitty.app.ui.components.AnimatedSearchIcon
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.LocalKittyPalette

/**
 * Extension Store — black glass panels, white selection.
 * Active source lives in the header; GitHub install is a single expand panel.
 */
@Composable
fun ExtensionStoreFeed(
    catalog: ServerCatalog,
    onBack: () -> Unit = {},
) {
    val context = LocalContext.current
    val palette = LocalKittyPalette.current
    val scope = rememberCoroutineScope()
    val selectedId by catalog.selectedId.collectAsState()
    val installedExt by catalog.extensions.installed.collectAsState()
    val resolvers by catalog.resolvers.collectAsState()
    BackHandler(onBack = onBack)

    var query by remember { mutableStateOf("") }
    var githubUrl by remember { mutableStateOf("") }
    var listings by remember { mutableStateOf<List<StoreListing>>(emptyList()) }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var busyId by remember { mutableStateOf<String?>(null) }
    var showGithub by remember { mutableStateOf(false) }
    var updates by remember { mutableStateOf<Map<String, String>>(emptyMap()) }

    fun refreshStore() {
        scope.launch {
            busy = true
            status = null
            runCatching { catalog.fetchStore() }
                .onSuccess {
                    listings = it.extensions
                    updates = runCatching { catalog.extensionUpdates() }.getOrDefault(emptyMap())
                    val from = when {
                        it.sourceUrls.any { url -> url.contains("anikitty-extensions") } ->
                            "anikitty-extensions"
                        it.sourceUrl?.contains("fampep/anikitty") == true ->
                            "main store"
                        else -> "store"
                    }
                    val updateNote = when (updates.size) {
                        0 -> ""
                        1 -> " · 1 update"
                        else -> " · ${updates.size} updates"
                    }
                    status = "${it.extensions.size} listed · $from" +
                        (it.updatedAt?.let { d -> " · $d" } ?: "") +
                        updateNote
                }
                .onFailure { status = friendlyFailure(it.message) }
            busy = false
        }
    }

    LaunchedEffect(Unit) { refreshStore() }

    val activeServer = remember(selectedId, resolvers) {
        resolvers.firstOrNull { it.server.id == selectedId }?.server
            ?: resolvers.firstOrNull()?.server
    }

    val bundledIds = catalog.bundledIds

    // Always surface on-device resolvers even if the remote index is stale/offline.
    // First-party fampep metadata only for known bundled ids — community installs
    // keep author/github from their manifest (never mislabeled as official).
    val mergedListings = remember(listings, resolvers, installedExt, bundledIds) {
        val byId = LinkedHashMap<String, StoreListing>()
        for (listing in listings) {
            if (isRetiredExtension(listing.id, listing.name)) continue
            byId[listing.id] = listing
        }
        val manifests = installedExt.associateBy { it.id }
        for (resolver in resolvers) {
            val server = resolver.server
            if (isRetiredExtension(server.id, server.name)) continue
            val existing = byId[server.id]
            val bundled = server.id in bundledIds
            if (existing == null) {
                byId[server.id] = server.toStoreListing(
                    bundled = bundled,
                    manifest = manifests[server.id],
                )
                continue
            }
            if (!bundled) continue
            val fallback = server.toStoreListing(bundled = true)
            byId[server.id] = existing.copy(
                name = existing.name.ifBlank { fallback.name },
                description = existing.description.ifBlank { fallback.description },
                iconUrl = existing.iconUrl ?: fallback.iconUrl,
                siteUrl = existing.siteUrl ?: fallback.siteUrl,
                version = existing.version?.takeIf { it.isNotBlank() } ?: fallback.version,
                protocol = existing.protocol?.takeIf { it.isNotBlank() } ?: fallback.protocol,
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

    val rows = remember(filtered, bundledIds) {
        val onPhone = filtered.filter { it.id in bundledIds }
        val community = filtered.filter { it.id !in bundledIds }
        buildList {
            if (onPhone.isNotEmpty()) {
                add(
                    StoreRow.Head(
                        title = "On this phone",
                        subtitle = "Ships with AniKitty. The source is in anikitty-extensions.",
                    ),
                )
                onPhone.forEach { add(StoreRow.Card(it)) }
            }
            if (community.isNotEmpty()) {
                add(
                    StoreRow.Head(
                        title = "Community",
                        subtitle = "Installed from GitHub. fampep does not run these.",
                    ),
                )
                community.forEach { add(StoreRow.Card(it)) }
            }
        }
    }

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.page)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = 100.dp),
        contentPadding = PaddingValues(horizontal = 16.dp, vertical = 12.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        item {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.Top,
            ) {
                Column(modifier = Modifier.weight(1f)) {
                    SpacePageHeader(
                        title = "Extension store",
                        subtitle = buildString {
                            append(activeServer?.let { "Playing via ${it.name}" } ?: "Stream links only")
                            append(" · AniList stays the catalog")
                            append(" · v${BuildConfig.VERSION_NAME}")
                        },
                        onBack = onBack,
                    )
                }
                IconButton(
                    onClick = { refreshStore() },
                    enabled = !busy,
                    modifier = Modifier.padding(top = 36.dp),
                ) {
                    Icon(
                        Icons.Rounded.Refresh,
                        contentDescription = "Refresh store",
                        tint = if (busy) palette.faint else palette.text,
                    )
                }
            }
            if (status != null) {
                Text(
                    status!!,
                    style = MaterialTheme.typography.labelSmall,
                    color = palette.muted,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .padding(top = 8.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(palette.surface)
                        .border(1.dp, palette.hairline, RoundedCornerShape(999.dp))
                        .padding(horizontal = 10.dp, vertical = 5.dp),
                )
            }
        }

        item {
            OutlinedTextField(
                value = query,
                onValueChange = { query = it.take(80) },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                placeholder = { Text("Search extensions", color = palette.faint) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = palette.text,
                    unfocusedTextColor = palette.text,
                    cursorColor = palette.accent,
                    focusedBorderColor = palette.accent,
                    unfocusedBorderColor = palette.hairline,
                    focusedContainerColor = palette.surface,
                    unfocusedContainerColor = palette.surface,
                ),
                leadingIcon = {
                    AnimatedSearchIcon(
                        tint = if (query.isNotBlank()) palette.text else palette.muted,
                        active = query.isBlank(),
                    )
                },
                trailingIcon = {
                    if (query.isNotEmpty()) {
                        IconButton(onClick = { query = "" }) {
                            Icon(Icons.Rounded.Clear, contentDescription = "Clear", tint = palette.muted)
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

        lazyItems(rows, key = { row ->
            when (row) {
                is StoreRow.Head -> "head-${row.title}"
                is StoreRow.Card -> "store-${row.listing.id}"
            }
        }) { row ->
            if (row is StoreRow.Head) {
                KittySectionHeading(
                    title = row.title,
                    subtitle = row.subtitle,
                    padded = false,
                )
                return@lazyItems
            }
            val listing = (row as StoreRow.Card).listing
            val isBundled = listing.id in bundledIds
            val installedManifest = installedExt.firstOrNull { it.id == listing.id }
            val installed = isBundled || installedManifest != null
            val newer = updates[listing.id]
            val onDevice = resolvers.any { it.server.id == listing.id }
            val selected = selectedId == listing.id
            val icon = listing.iconUrl
                ?: resolvers.firstOrNull { it.server.id == listing.id }?.server?.iconUrl

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(KittyGlassShape)
                    .background(if (selected) palette.text.copy(alpha = 0.08f) else palette.surface)
                    .border(
                        1.dp,
                        if (selected) palette.accent else palette.hairline,
                        KittyGlassShape,
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
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(
                                listing.name,
                                color = palette.text,
                                fontWeight = FontWeight.SemiBold,
                                modifier = Modifier.weight(1f, fill = false),
                            )
                            if (selected) {
                                Spacer(modifier = Modifier.width(8.dp))
                                Text(
                                    "ACTIVE",
                                    modifier = Modifier
                                        .clip(RoundedCornerShape(999.dp))
                                        .background(palette.accent)
                                        .padding(horizontal = 8.dp, vertical = 3.dp),
                                    color = palette.onAccent,
                                    fontWeight = FontWeight.Bold,
                                    fontSize = 10.sp,
                                )
                            }
                        }
                        if (listing.description.isNotBlank()) {
                            Text(
                                listing.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = palette.muted,
                                maxLines = 2,
                            )
                        }
                        Text(
                            buildString {
                                if (listing.author.isNotBlank()) append(listing.author)
                                listing.siteUrl?.let { site ->
                                    val host = runCatching { Uri.parse(site).host }
                                        .getOrNull()
                                        ?.removePrefix("www.")
                                    if (!host.isNullOrBlank()) {
                                        if (isNotEmpty()) append(" · ")
                                        append(host)
                                    }
                                }
                                when {
                                    isBundled -> {
                                        if (isNotEmpty()) append(" · ")
                                        append("bundled")
                                        appendStoreVersion(listing.version)
                                        appendProtocol(listing.protocol)
                                    }
                                    installed -> {
                                        if (isNotEmpty()) append(" · ")
                                        append("installed")
                                        installedManifest?.version?.takeIf { it.isNotBlank() }?.let { v ->
                                            append(" · v")
                                            append(v)
                                        }
                                        if (newer != null) {
                                            append(" · v")
                                            append(newer)
                                            append(" ready")
                                        }
                                        appendProtocol(listing.protocol)
                                    }
                                    else -> {
                                        appendStoreVersion(listing.version)
                                        appendProtocol(listing.protocol)
                                    }
                                }
                            },
                            style = MaterialTheme.typography.labelSmall,
                            color = palette.faint,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(10.dp))
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    if (newer != null && !isBundled) {
                        Button(
                            onClick = {
                                scope.launch {
                                    busy = true
                                    busyId = listing.id
                                    try {
                                        status = runCatching {
                                            val m = catalog.updateExtension(listing.id)
                                            updates = updates - m.id
                                            "Updated ${m.name} to ${m.version}"
                                        }.getOrElse { explainInstallFailure(it) }
                                    } finally {
                                        busy = false
                                        busyId = null
                                    }
                                }
                            },
                            enabled = !busy,
                            modifier = Modifier.height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.accent,
                                contentColor = palette.onAccent,
                            ),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                        ) {
                            Text(
                                if (busy && busyId == listing.id) "Updating…" else "Update",
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    if (selected) {
                        OutlinedButton(
                            onClick = { status = "Already using ${listing.name}" },
                            enabled = !busy,
                            modifier = Modifier.height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            border = BorderStroke(1.dp, palette.accent),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = palette.accent),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                        ) {
                            Text("Selected", fontWeight = FontWeight.Bold)
                        }
                    } else {
                        val sample = listing.id == "site.anikitty.example.hello"
                        Button(
                            onClick = {
                                when {
                                    sample && !onDevice && !isBundled -> {
                                        status = "Hello is a sample listing, not a stream"
                                    }
                                    onDevice || isBundled -> {
                                        catalog.select(listing.id)
                                        status = "Selected ${listing.name}"
                                    }
                                    else -> scope.launch {
                                        busy = true
                                        busyId = listing.id
                                        try {
                                            status = runCatching {
                                                val m = catalog.installStoreListing(listing)
                                                catalog.select(m.id)
                                                "Installed ${m.name}"
                                            }.getOrElse { explainInstallFailure(it) }
                                        } finally {
                                            busy = false
                                            busyId = null
                                        }
                                    }
                                }
                            },
                            enabled = !busy && !(sample && !onDevice && !isBundled),
                            modifier = Modifier.height(48.dp),
                            shape = RoundedCornerShape(12.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.accent,
                                contentColor = palette.onAccent,
                            ),
                            contentPadding = PaddingValues(horizontal = 14.dp, vertical = 8.dp),
                        ) {
                            Text(
                                when {
                                    busy && busyId == listing.id -> "Installing…"
                                    onDevice || isBundled -> "Use"
                                    sample -> "Example"
                                    else -> "Install"
                                },
                                fontWeight = FontWeight.Bold,
                            )
                        }
                    }
                    if (listing.github.contains("github.com/") &&
                        listing.github.substringAfter("github.com/").length > 1
                    ) {
                        TextButton(
                            onClick = {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(listing.github)),
                                )
                            },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                        ) {
                            Text("Source", color = palette.muted, fontSize = 12.sp)
                        }
                    }
                    if (listing.siteUrl != null) {
                        TextButton(
                            onClick = {
                                context.startActivity(
                                    Intent(Intent.ACTION_VIEW, Uri.parse(listing.siteUrl)),
                                )
                            },
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                        ) {
                            Text("Site", color = palette.muted, fontSize = 12.sp)
                        }
                    }
                    if (installed && !isBundled) {
                        TextButton(
                            onClick = {
                                catalog.uninstallExtension(listing.id)
                                status = "Removed ${listing.name}"
                            },
                            enabled = !busy,
                            modifier = Modifier.defaultMinSize(minHeight = 48.dp),
                        ) {
                            Text("Remove", color = palette.faint, fontSize = 12.sp)
                        }
                    }
                }
            }
        }

        item {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(KittyGlassShape)
                    .background(if (showGithub) palette.text.copy(alpha = 0.08f) else palette.surface)
                    .border(
                        1.dp,
                        if (showGithub) palette.accent.copy(alpha = 0.55f) else palette.hairline,
                        KittyGlassShape,
                    )
                    .clickable { showGithub = !showGithub }
                    .padding(horizontal = 14.dp, vertical = 12.dp),
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "Add from GitHub",
                            color = palette.text,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            "Paste a repo with anikitty-extension.json",
                            color = palette.faint,
                            style = MaterialTheme.typography.labelSmall,
                        )
                    }
                    Icon(
                        if (showGithub) Icons.Rounded.ExpandLess else Icons.Rounded.ExpandMore,
                        contentDescription = null,
                        tint = if (showGithub) palette.text else palette.muted,
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
                            placeholder = { Text("https://github.com/owner/repo", color = palette.faint) },
                            colors = OutlinedTextFieldDefaults.colors(
                                focusedTextColor = palette.text,
                                unfocusedTextColor = palette.text,
                                cursorColor = palette.accent,
                                focusedBorderColor = palette.accent,
                                unfocusedBorderColor = palette.hairline,
                                focusedContainerColor = palette.surface,
                                unfocusedContainerColor = palette.surface,
                            ),
                            shape = RoundedCornerShape(14.dp),
                        )
                        Spacer(modifier = Modifier.height(8.dp))
                        Button(
                            onClick = {
                                val url = githubUrl.trim()
                                if (url.length < 3) return@Button
                                scope.launch {
                                    busy = true
                                    busyId = "github"
                                    try {
                                        status = runCatching {
                                            val m = catalog.installFromGithub(url)
                                            catalog.select(m.id)
                                            githubUrl = ""
                                            "Installed ${m.name} (${m.version})"
                                        }.getOrElse { explainInstallFailure(it) }
                                    } finally {
                                        busy = false
                                        busyId = null
                                    }
                                }
                            },
                            enabled = !busy && githubUrl.trim().length >= 3,
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.accent,
                                contentColor = palette.onAccent,
                            ),
                        ) {
                            Text(
                                if (busyId == "github") "Installing…" else "Install",
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
                    color = palette.muted,
                    fontWeight = FontWeight.Medium,
                )
            }
        }
    }
}

private fun StringBuilder.appendStoreVersion(version: String?) {
    val v = version?.takeIf { it.isNotBlank() } ?: return
    if (isNotEmpty()) append(" · ")
    append("v")
    append(v)
}

private fun StringBuilder.appendProtocol(protocol: String?) {
    val p = protocol?.takeIf { it.isNotBlank() } ?: return
    if (isNotEmpty()) append(" · ")
    append("protocol ")
    append(p)
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
            github = providerSource(id),
            author = "fampep",
            featured = true,
            iconUrl = iconUrl,
            siteUrl = siteUrl,
            version = bundledStoreVersion(id),
            protocol = "1.1",
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
        version = manifest?.version?.takeIf { it.isNotBlank() },
        protocol = "1.1",
    )
}

/** Shown when the store index has not published a version for a bundled source. */
private fun bundledStoreVersion(id: String): String = when (id) {
    "reanime" -> "1.0.0"
    "mkissa" -> "1.0.0"
    "kaa" -> "1.0.0"
    "animex" -> "1.0.0"
    "xanime" -> "1.0.0"
    "aninz" -> "1.1.0"
    "animepahe" -> "1.0.0"
    else -> "1.1.1"
}

private sealed interface StoreRow {
    data class Head(val title: String, val subtitle: String) : StoreRow
    data class Card(val listing: StoreListing) : StoreRow
}

private fun providerSource(id: String): String = when (id) {
    "anikoto" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/anikoto"
    "gotaku" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/gotaku"
    "reanime" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/reanime"
    "mkissa" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/mkissa"
    "kaa" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/kaa"
    "animex" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/animex"
    "xanime" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/xanime"
    "aninz" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/aninz"
    "animepahe" -> "https://github.com/fampep/anikitty-extensions/tree/main/providers/animepahe"
    else -> "https://github.com/fampep/anikitty-extensions"
}
