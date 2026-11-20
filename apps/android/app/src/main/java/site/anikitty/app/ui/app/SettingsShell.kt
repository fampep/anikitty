// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.activity.compose.BackHandler
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.ExperimentalLayoutApi
import androidx.compose.foundation.layout.FlowRow
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.KeyboardArrowRight
import androidx.compose.material.icons.filled.Extension
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.ExtensionIcon
import site.anikitty.app.ui.icons.FluentuiSystemIconsHomeOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsPersonOutline
import site.anikitty.app.ui.icons.FluentuiSystemIconsSettingsOutline
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.LookState

@Composable
internal fun LookSettings(
    onExport: () -> Unit,
    onPickImport: () -> Unit,
    importNote: String?,
) {
    val context = LocalContext.current
    val palette = LocalKittyPalette.current
    val playerPrefs = remember { context.getSharedPreferences("anikitty_player", 0) }
    var startTheater by remember { mutableStateOf(playerPrefs.getBoolean("start_theater", false)) }
    Column(
        modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Look", color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Text("Accent", color = palette.muted, fontSize = 12.sp)
        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
            LookState.presets.forEach { color ->
                val selected = LookState.accent == color
                Box(
                    modifier = Modifier
                        .size(28.dp)
                        .clip(CircleShape)
                        .background(color)
                        .border(
                            if (selected) 2.dp else 1.dp,
                            if (selected) palette.text else palette.hairline,
                            CircleShape,
                        )
                        .clickable { LookState.setAccent(context, color) },
                )
            }
        }
        Text(
            "The accent shows on the dark theme. Light mode stays ink so buttons stay readable.",
            color = palette.muted,
            fontSize = 12.sp,
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Open the player full screen",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = startTheater,
                onCheckedChange = {
                    startTheater = it
                    playerPrefs.edit().putBoolean("start_theater", it).apply()
                },
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Remind me about shows I left",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Switch(
                checked = LookState.abandonedReminders,
                onCheckedChange = { LookState.setAbandonedReminders(context, it) },
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text(
                "Weekly goal · ${LookState.weekGoalMinutes} min",
                color = palette.text,
                fontSize = 14.sp,
                modifier = Modifier.weight(1f),
            )
            Text(
                "−",
                color = palette.text,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable {
                        LookState.setWeekGoal(context, LookState.weekGoalMinutes - 15)
                    }
                    .wrapContentHeight(),
            )
            Text(
                "+",
                color = palette.text,
                fontWeight = FontWeight.Bold,
                textAlign = TextAlign.Center,
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(10.dp))
                    .clickable {
                        LookState.setWeekGoal(context, LookState.weekGoalMinutes + 15)
                    }
                    .wrapContentHeight(),
            )
        }
        Button(
            onClick = onExport,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = palette.accent,
                contentColor = palette.onAccent,
            ),
        ) {
            Text("Export watch progress", fontWeight = FontWeight.Bold)
        }
        OutlinedButton(
            onClick = onPickImport,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(14.dp),
            border = BorderStroke(1.dp, palette.hairline),
            colors = ButtonDefaults.outlinedButtonColors(contentColor = palette.text),
        ) {
            Text("Import watch progress", fontWeight = FontWeight.Bold)
        }
        Text(
            "A newer save on this phone stays. This does not change AniList.",
            color = palette.muted,
            fontSize = 12.sp,
        )
        importNote?.let { note ->
            Text(note, color = palette.text, fontSize = 13.sp)
        }
        val keyPrefs = remember { context.getSharedPreferences("anikitty_keys", 0) }
        var tmdbKey by remember { mutableStateOf(keyPrefs.getString("tmdb", "") ?: "") }
        var fanartKey by remember { mutableStateOf(keyPrefs.getString("fanart", "") ?: "") }
        Text("Backdrop keys", color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Text(
            "Optional. A key built into the app is used when a field is empty. An entry here replaces it.",
            color = palette.muted,
            fontSize = 12.sp,
        )
        OutlinedTextField(
            value = tmdbKey,
            onValueChange = {
                tmdbKey = it
                keyPrefs.edit().putString("tmdb", it.trim()).apply()
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("TMDB API key") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = palette.text,
                unfocusedTextColor = palette.text,
                focusedBorderColor = palette.accent,
                unfocusedBorderColor = palette.hairline,
                focusedLabelColor = palette.muted,
                unfocusedLabelColor = palette.muted,
            ),
        )
        OutlinedTextField(
            value = fanartKey,
            onValueChange = {
                fanartKey = it
                keyPrefs.edit().putString("fanart", it.trim()).apply()
            },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("fanart.tv API key") },
            colors = OutlinedTextFieldDefaults.colors(
                focusedTextColor = palette.text,
                unfocusedTextColor = palette.text,
                focusedBorderColor = palette.accent,
                unfocusedBorderColor = palette.hairline,
                focusedLabelColor = palette.muted,
                unfocusedLabelColor = palette.muted,
            ),
        )
        TmdbCredit()
    }
}

@OptIn(ExperimentalLayoutApi::class)
@Composable
internal fun AniListProfileCard(
    auth: AniListAuthStore,
    fallbackName: String,
    syncLabel: String?,
    onOpenList: (String) -> Unit = {},
    onSignOut: () -> Unit = {},
) {
    val palette = LocalKittyPalette.current
    val name = auth.username?.takeIf { it.isNotBlank() } ?: fallbackName
    val days = auth.minutesWatched / 1440
    val score = if (auth.meanScore <= 0f) "—" else auth.meanScore.toInt().toString()
    val syncing = syncLabel == "Syncing…"
    val onBanner = !auth.bannerUrl.isNullOrBlank()
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            SpaceLabel("PROFILE", padded = false)
            Text(
                text = "Logout",
                style = MaterialTheme.typography.labelSmall.copy(fontSize = 12.sp),
                color = palette.muted,
                modifier = Modifier
                    .defaultMinSize(minHeight = 48.dp)
                    .spacePress(onSignOut),
            )
        }
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .clip(RoundedCornerShape(12.dp))
                .background(if (onBanner) Color(0xFF0C0C10) else palette.surface)
                .border(0.5.dp, if (onBanner) Color.White.copy(alpha = 0.08f) else palette.hairline, RoundedCornerShape(12.dp)),
        ) {
            if (!auth.bannerUrl.isNullOrBlank()) {
                AsyncImage(
                    model = auth.bannerUrl,
                    contentDescription = null,
                    modifier = Modifier
                        .matchParentSize()
                        .graphicsLayer { alpha = 0.22f },
                    contentScale = ContentScale.Crop,
                )
                Box(
                    modifier = Modifier
                        .matchParentSize()
                        .background(
                            Brush.horizontalGradient(
                                listOf(Color.Black.copy(alpha = 0.92f), Color.Black.copy(alpha = 0.45f)),
                            ),
                        ),
                )
            }
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(14.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp),
            ) {
                if (!auth.avatarUrl.isNullOrBlank()) {
                    AsyncImage(
                        model = auth.avatarUrl,
                        contentDescription = null,
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(palette.surface),
                        contentScale = ContentScale.Crop,
                    )
                } else {
                    Box(
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(Color.White),
                        contentAlignment = Alignment.Center,
                    ) {
                        Text(
                            name.take(1).uppercase(),
                            color = Color.Black,
                            fontWeight = FontWeight.Bold,
                            fontSize = 18.sp,
                        )
                    }
                }
                Column(modifier = Modifier.weight(1f)) {
                    Text(
                        text = name,
                        color = if (onBanner) Color.White else palette.text,
                        style = MaterialTheme.typography.titleMedium.copy(fontWeight = FontWeight.SemiBold),
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                    Text(
                        text = if (syncing) "Syncing..." else "Connected",
                        color = if (onBanner) Color.White.copy(alpha = if (syncing) 1f else 0.72f) else palette.muted,
                        style = MaterialTheme.typography.labelSmall,
                    )
                }
            }
        }
        if (!auth.about.isNullOrBlank()) {
            Text(
                auth.about.orEmpty(),
                color = palette.muted,
                style = MaterialTheme.typography.bodySmall,
                maxLines = 4,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }
        SpaceLabel("STATS")
        SpaceCard {
            Row(modifier = Modifier.fillMaxWidth()) {
                ProfileStat(auth.animeCount.toString(), "Anime")
                ProfileStat(auth.episodesWatched.toString(), "Episodes")
                ProfileStat(days.toString(), "Days")
                ProfileStat(score, "Score")
            }
        }
        SpaceLabel("LISTS")
        FlowRow(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            SpaceChip("Watching (${auth.watchingCount})", selected = false) { onOpenList("watching") }
            SpaceChip("Completed (${auth.completedCount})", selected = false) { onOpenList("done") }
            SpaceChip("Planning (${auth.planningCount})", selected = false) { onOpenList("plan") }
            SpaceChip("Paused (${auth.pausedCount})", selected = false) { onOpenList("paused") }
            SpaceChip("Dropped (${auth.droppedCount})", selected = false) { onOpenList("dropped") }
        }
        if (!syncLabel.isNullOrBlank() && !syncing) {
            Text(
                syncLabel,
                color = palette.muted,
                style = MaterialTheme.typography.labelSmall,
                modifier = Modifier.padding(horizontal = 20.dp),
            )
        }
    }
}

@Composable
internal fun androidx.compose.foundation.layout.RowScope.ProfileStat(
    value: String,
    label: String,
    onClick: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier
            .weight(1f)
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        val palette = LocalKittyPalette.current
        Text(
            value,
            color = palette.text,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.titleSmall,
            maxLines = 1,
        )
        Text(
            label,
            color = palette.muted,
            style = MaterialTheme.typography.labelSmall,
            maxLines = 1,
        )
    }
}

@Composable
internal fun SettingsFeed(
    demo: Boolean = false,
    catalog: ServerCatalog,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    accountLabel: String,
    syncLabel: String?,
    onSyncLabel: (String?) -> Unit,
    linkStatus: String?,
    onLinkStatus: (String?) -> Unit,
    linkTick: Int,
    onLinkTick: () -> Unit,
    onAccountReady: () -> Unit = {},
    onSignOut: () -> Unit,
    onOpenStore: () -> Unit,
    onClose: () -> Unit = {},
    onOpenBuilds: () -> Unit,
    onOpenLibrary: (String) -> Unit = {},
    homeLayout: HomeLayoutStore,
    openAccountTick: Int = 0,
    onExportProgress: () -> Unit = {},
    onImportProgress: suspend (String) -> String = { "Import isn't available" },
) {
    val palette = LocalKittyPalette.current
    val selectedId by catalog.selectedId.collectAsState()
    val resolvers by catalog.resolvers.collectAsState()
    val installedExt by catalog.extensions.installed.collectAsState()
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    var extensionStatus by remember { mutableStateOf<String?>(null) }
    val importProgress by rememberUpdatedState(onImportProgress)
    var importNote by remember { mutableStateOf<String?>(null) }
    val importPicker = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri == null) return@rememberLauncherForActivityResult
        scope.launch {
            val text = withContext(Dispatchers.IO) {
                runCatching {
                    context.contentResolver.openInputStream(uri)?.use { input ->
                        input.bufferedReader().use { reader ->
                            val out = StringBuilder()
                            val buf = CharArray(8192)
                            while (out.length <= 2_000_000) {
                                val count = reader.read(buf)
                                if (count < 0) break
                                val room = 2_000_001 - out.length
                                out.append(buf, 0, minOf(count, room))
                                if (count > room) break
                            }
                            out.toString()
                        }
                    }
                }.getOrNull()
            }
            importNote = withContext(Dispatchers.IO) {
                if (text == null) {
                    "Couldn't read that file"
                } else {
                    importProgress(text)
                }
            }
        }
    }

    // linkTick bumps after save/clear so Compose re-reads prefs-backed isLinked.
    val isLinked = linkTick.let { aniListAuth.isLinked }
    var page by rememberSaveable { mutableStateOf("hub") }
    LaunchedEffect(openAccountTick) {
        if (openAccountTick > 0) page = "account"
    }
    BackHandler {
        if (page != "hub") page = "hub" else onClose()
    }
    val selectedName = resolvers.firstOrNull { it.server.id == selectedId }?.server?.name ?: "None selected"
    val homeShown = homeLayout.sections().count { it.enabled }
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(LocalKittyPalette.current.page)
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = 100.dp),
    ) {
        AnimatedContent(
            targetState = page,
            transitionSpec = {
                val back = targetState == "hub"
                val dir = if (back) -1 else 1
                (slideInHorizontally(tween(280)) { it / 5 * dir } + fadeIn(tween(220))) togetherWith
                    (slideOutHorizontally(tween(200)) { -it / 6 * dir } + fadeOut(tween(150)))
            },
            label = "settingsPage",
        ) { current ->
        LazyColumn(
            modifier = Modifier.fillMaxSize(),
            contentPadding = PaddingValues(top = 8.dp, bottom = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            when (current) {
                "hub" -> {
                    item {
                        SpacePageHeader(
                            title = "Settings",
                            subtitle = if (demo) {
                                "Sample library. Not your AniList account."
                            } else {
                                "Account, home layout, sources, and app look."
                            },
                            onBack = onClose,
                        )
                    }
                    item {
                        Column(verticalArrangement = Arrangement.spacedBy(20.dp)) {
                            SettingsGroup(title = "You") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsPersonOutline,
                                    title = "Account",
                                    detail = when {
                                        demo -> "Demo library"
                                        isLinked -> aniListAuth.username?.takeIf { it.isNotBlank() }?.let { "@$it" }
                                            ?: accountLabel.ifBlank { "Signed in" }
                                        else -> "Not signed in"
                                    },
                                    avatarUrl = linkTick.let { aniListAuth.avatarUrl },
                                    useAvatar = true,
                                    plain = true,
                                    onClick = { page = "account" },
                                )
                            }
                            SettingsGroup(title = "Library") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsHomeOutline,
                                    title = "Home layout",
                                    detail = "$homeShown rows showing",
                                    plain = true,
                                    onClick = { page = "home" },
                                )
                            }
                            SettingsGroup(title = "Playback") {
                                SettingsHubRow(
                                    icon = Icons.Outlined.Extension,
                                    title = "Sources & store",
                                    detail = selectedName,
                                    plain = true,
                                    onClick = { page = "sources" },
                                )
                            }
                            SettingsGroup(title = "App") {
                                SettingsHubRow(
                                    icon = FluentuiSystemIconsSettingsOutline,
                                    title = "Appearance",
                                    detail = "Version ${BuildConfig.VERSION_NAME}",
                                    plain = true,
                                    onClick = { page = "app" },
                                )
                            }
                        }
                    }
                }
                "account" -> {
                    item {
                        SpacePageHeader(
                            title = "Account",
                            subtitle = when {
                                demo -> "Sample library. Not your AniList account."
                                isLinked -> "Your AniList profile."
                                else -> "Sign in to load your lists."
                            },
                            onBack = { page = "hub" },
                        )
                    }
                    if (demo) {
                        item {
                            SpaceCard(onClick = onSignOut) {
                                Text(
                                    "Leave demo",
                                    color = palette.text,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Text(
                                    "Returns to sign-in. Your AniList account, if you have one, stays untouched.",
                                    color = palette.text.copy(alpha = 0.5f),
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                        }
                    } else if (isLinked) {
                        item {
                            AniListProfileCard(
                                auth = aniListAuth,
                                fallbackName = accountLabel.ifBlank { "AniList" },
                                syncLabel = syncLabel,
                                onOpenList = onOpenLibrary,
                                onSignOut = onSignOut,
                            )
                        }
                        item {
                            Button(
                                onClick = {
                                    scope.launch {
                                        onSyncLabel("Syncing…")
                                        onSyncLabel(
                                            runCatching {
                                                val result = aniListSync.pull()
                                                "Synced ${result.imported} titles"
                                            }.getOrElse { e -> friendlyFailure(e.message) },
                                        )
                                    }
                                },
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(horizontal = 20.dp),
                                shape = RoundedCornerShape(14.dp),
                                colors = ButtonDefaults.buttonColors(
                                    containerColor = palette.accent,
                                    contentColor = palette.onAccent,
                                ),
                            ) { Text("Sync now", fontWeight = FontWeight.Bold) }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = palette.text.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                    } else {
                        item {
                            SpaceCard(onClick = { AniListOAuth.openAuthorize(context) }) {
                                Text(
                                    "Connect AniList",
                                    color = palette.text,
                                    style = MaterialTheme.typography.bodyMedium.copy(fontWeight = FontWeight.SemiBold),
                                )
                                Text(
                                    "Your list and the next episode come back with you.",
                                    color = palette.text.copy(alpha = 0.5f),
                                    style = MaterialTheme.typography.bodySmall,
                                    modifier = Modifier.padding(top = 4.dp),
                                )
                            }
                            if (!linkStatus.isNullOrBlank()) {
                                Text(
                                    linkStatus,
                                    style = MaterialTheme.typography.labelSmall,
                                    color = palette.text.copy(alpha = 0.5f),
                                    modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                                )
                            }
                        }
                    }
                }
                "home" -> {
                    item {
                        SpacePageHeader(
                            title = "Home",
                            subtitle = "Turn rows on or off, and move them.",
                            onBack = { page = "hub" },
                        )
                    }
                    item { HomeLayoutSettings(homeLayout) }
                }
                "sources" -> {
                    item {
                        SpacePageHeader(
                            title = "Sources",
                            subtitle = "Anikoto (kotoplay.to if Anikoto is down), Gotaku, reanime, mkissa, kaa, animex, and xanime ship in the app.",
                            onBack = { page = "hub" },
                        )
                    }
                    item {
                        Button(
                            onClick = onOpenStore,
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 20.dp),
                            shape = RoundedCornerShape(14.dp),
                            colors = ButtonDefaults.buttonColors(
                                containerColor = palette.accent,
                                contentColor = palette.onAccent,
                            ),
                        ) {
                            Text("Open Extension Store", fontWeight = FontWeight.Bold)
                        }
                        if (extensionStatus != null) {
                            Text(
                                extensionStatus!!,
                                color = palette.text.copy(alpha = 0.5f),
                                style = MaterialTheme.typography.bodySmall,
                                modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp),
                            )
                        }
                    }
                    lazyItems(resolvers.map { it.server }, key = { it.id }) { server ->
                        val selected = server.id == selectedId
                        val isExtension = installedExt.any { it.id == server.id }
                        Column(
                            modifier = Modifier
                                .padding(horizontal = 20.dp)
                                .fillMaxWidth()
                                .clip(RoundedCornerShape(12.dp))
                                .spacePress { catalog.select(server.id) }
                                .background(palette.surface)
                                .border(
                                    0.5.dp,
                                    if (selected) palette.text.copy(alpha = 0.45f) else palette.text.copy(alpha = 0.08f),
                                    RoundedCornerShape(12.dp),
                                )
                                .padding(14.dp),
                        ) {
                            Row(verticalAlignment = Alignment.CenterVertically) {
                                ExtensionIcon(
                                    iconUrl = server.iconUrl,
                                    contentDescription = server.name,
                                    size = 40.dp,
                                )
                                Spacer(modifier = Modifier.width(12.dp))
                                Column(modifier = Modifier.weight(1f)) {
                                    Row(verticalAlignment = Alignment.CenterVertically) {
                                        Text(
                                            server.name,
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
                                                    .background(palette.text)
                                                    .padding(horizontal = 8.dp, vertical = 3.dp),
                                                color = palette.page,
                                                fontWeight = FontWeight.Bold,
                                                fontSize = 10.sp,
                                            )
                                        }
                                    }
                                    Text(
                                        if (isExtension) "Extension" else "Bundled",
                                        color = palette.faint,
                                        style = MaterialTheme.typography.labelSmall,
                                    )
                                }
                            }
                            Text(
                                server.description,
                                style = MaterialTheme.typography.bodySmall,
                                color = palette.muted,
                                modifier = Modifier.padding(top = 8.dp),
                            )
                            if (isExtension) {
                                Spacer(modifier = Modifier.height(8.dp))
                                TextButton(
                                    onClick = {
                                        catalog.uninstallExtension(server.id)
                                        extensionStatus = "Removed ${server.name}"
                                    },
                                    contentPadding = PaddingValues(0.dp),
                                ) {
                                    Text("Uninstall", color = palette.muted, fontSize = 12.sp)
                                }
                            }
                        }
                    }
                }
                else -> {
                    item {
                        SpacePageHeader(
                            title = "App",
                            subtitle = "Version ${BuildConfig.VERSION_NAME}",
                            onBack = { page = "hub" },
                        )
                    }
                    item { AppBuildsRow(onClick = onOpenBuilds) }
                    item {
                        LookSettings(
                            onExport = onExportProgress,
                            onPickImport = {
                                importPicker.launch(
                                    arrayOf("application/json", "text/plain", "application/octet-stream"),
                                )
                            },
                            importNote = importNote,
                        )
                    }
                    item {
                        Column(
                            modifier = Modifier.padding(horizontal = 20.dp),
                            verticalArrangement = Arrangement.spacedBy(10.dp),
                        ) {
                            Text(
                                "Copyright 2026 fampep. Apache License 2.0.",
                                color = palette.text.copy(alpha = 0.45f),
                                fontSize = 13.sp,
                            )
                            TmdbCredit()
                        }
                    }
                }
            }
        }
        }
    }
}

@Composable
internal fun TmdbCredit() {
    val palette = LocalKittyPalette.current
    Row(verticalAlignment = Alignment.CenterVertically) {
        Image(
            painter = androidx.compose.ui.res.painterResource(site.anikitty.app.R.drawable.tmdb_logo),
            contentDescription = "The Movie Database",
            modifier = Modifier
                .height(16.dp)
                .width(22.dp),
        )
        Spacer(Modifier.width(8.dp))
        Text(
            "This product uses the TMDB API but is not endorsed or certified by TMDB.",
            color = palette.muted,
            fontSize = 12.sp,
            modifier = Modifier.weight(1f),
        )
    }
}

@Composable
internal fun SettingsGroup(
    title: String,
    content: @Composable () -> Unit,
) {
    val palette = LocalKittyPalette.current
    Column(modifier = Modifier.padding(horizontal = 20.dp)) {
        Text(
            title,
            color = palette.muted,
            fontSize = 11.sp,
            fontWeight = FontWeight.SemiBold,
            letterSpacing = 0.6.sp,
            modifier = Modifier.padding(start = 4.dp, bottom = 6.dp),
        )
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(site.anikitty.app.ui.theme.KittyRadius.lg))
                .background(palette.surface)
                .border(0.5.dp, palette.hairline, RoundedCornerShape(site.anikitty.app.ui.theme.KittyRadius.lg)),
            content = { content() },
        )
    }
}

@Composable
internal fun SettingsHubRow(
    icon: ImageVector,
    title: String,
    detail: String,
    onClick: () -> Unit,
    avatarUrl: String? = null,
    useAvatar: Boolean = false,
    plain: Boolean = false,
) {
    val palette = LocalKittyPalette.current
    val row: @Composable () -> Unit = {
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.padding(horizontal = 2.dp),
        ) {
            if (useAvatar) {
                ProfileMark(imageUrl = avatarUrl, size = 40.dp)
            } else {
                Box(
                    modifier = Modifier
                        .size(40.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(palette.page),
                    contentAlignment = Alignment.Center,
                ) {
                    Icon(icon, contentDescription = null, tint = palette.text, modifier = Modifier.size(20.dp))
                }
            }
            Spacer(modifier = Modifier.width(14.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    color = palette.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 15.sp,
                )
                Text(
                    detail,
                    color = palette.muted,
                    fontSize = 12.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Icon(
                Icons.AutoMirrored.Rounded.KeyboardArrowRight,
                contentDescription = null,
                tint = palette.faint,
                modifier = Modifier.size(22.dp),
            )
        }
    }
    if (plain) {
        Box(modifier = Modifier.fillMaxWidth().spacePress(onClick).padding(horizontal = 14.dp, vertical = 15.dp)) {
            row()
        }
    } else {
        SpaceCard(onClick = onClick) { row() }
    }
}
