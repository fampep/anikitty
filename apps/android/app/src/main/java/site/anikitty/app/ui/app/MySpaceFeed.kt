// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
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
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.outlined.Search
import androidx.compose.material.icons.rounded.Clear
import androidx.compose.material.icons.rounded.Search
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.markEpisode
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyPageHeader
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.data.demo.DemoLibrary
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyText

@Composable
internal fun HistoryFeed(
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    aniList: AniListClient,
    aniListLinked: Boolean,
    accessToken: String?,
    syncLabel: String?,
    onSync: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
    libraryFilter: String,
    onLibraryFilter: (String) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var favourites by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var libraryQuery by rememberSaveable { mutableStateOf("") }
    var librarySort by rememberSaveable { mutableStateOf("recent") }
    var confirmClear by remember { mutableStateOf(false) }
    LaunchedEffect(accessToken) {
        val token = accessToken
        if (token.isNullOrBlank()) {
            favourites = emptyList()
            return@LaunchedEffect
        }
        favourites = runCatching { aniList.favourites(token) }.getOrDefault(emptyList())
    }
    fun List<WatchHistoryEntity>.forLibrary(): List<WatchHistoryEntity> {
        val q = libraryQuery.trim()
        val matched = if (q.length < 2) {
            this
        } else {
            filter { it.title.contains(q, ignoreCase = true) }
        }
        return when (librarySort) {
            "title" -> matched.sortedBy { it.title.lowercase() }
            "episode" -> matched.sortedByDescending { it.episode }
            else -> matched.sortedByDescending { it.updatedAtEpochMs }
        }
    }
    val watching = history.filter {
        val s = it.listStatus?.uppercase()
        s == null || s == "CURRENT" || s == "REPEATING"
    }.forLibrary()
    val completed = history.filter { it.listStatus.equals("COMPLETED", ignoreCase = true) }.forLibrary()
    val planning = history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.forLibrary()
    val paused = history.filter { it.listStatus.equals("PAUSED", ignoreCase = true) }.forLibrary()
    val dropped = history.filter { it.listStatus.equals("DROPPED", ignoreCase = true) }.forLibrary()
    val grouped = watching + completed + planning + paused + dropped
    val other = history.filter { entry -> grouped.none { it.anilistId == entry.anilistId } }.forLibrary()

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
                title = "Library",
                subtitle = "Favourites, watching, and the rest of your AniList.",
                trailing = if (aniListLinked) {
                    {
                        Button(
                            onClick = onSync,
                            colors = ButtonDefaults.buttonColors(
                                containerColor = KittyAccent,
                                contentColor = KittyOnAccent,
                            ),
                            shape = RoundedCornerShape(999.dp),
                            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                        ) {
                            Text("Sync", fontWeight = FontWeight.Bold)
                        }
                    }
                } else {
                    null
                },
            )
        }
        item {
            Row(
                modifier = Modifier.horizontalScroll(rememberScrollState()),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                listOf(
                    "all" to "All ${history.size}",
                    "watching" to "Watching ${watching.size}",
                    "plan" to "Plan ${planning.size}",
                    "paused" to "Paused ${paused.size}",
                    "done" to "Done ${completed.size}",
                    "dropped" to "Dropped ${dropped.size}",
                    "favourites" to "Favourites ${favourites.size}",
                ).forEach { (id, label) ->
                    Chip(label, selected = libraryFilter == id) {
                        confirmClear = false
                        onLibraryFilter(id)
                    }
                }
            }
        }
        item {
            OutlinedTextField(
                value = libraryQuery,
                onValueChange = {
                    libraryQuery = it.take(80)
                    confirmClear = false
                },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
                placeholder = { Text("Search your library", color = KittyFaint) },
                colors = OutlinedTextFieldDefaults.colors(
                    focusedTextColor = KittyText,
                    unfocusedTextColor = KittyText,
                    cursorColor = KittyText,
                    focusedBorderColor = Color.White.copy(alpha = 0.28f),
                    unfocusedBorderColor = Color.White.copy(alpha = 0.08f),
                    focusedContainerColor = Color(0xFF0C0C10),
                    unfocusedContainerColor = Color(0xFF0C0C10),
                ),
                shape = RoundedCornerShape(16.dp),
            )
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("recent" to "Recent", "title" to "A–Z", "episode" to "Episode").forEach { (id, label) ->
                    Chip(label, selected = librarySort == id) { librarySort = id }
                }
            }
        }
        val q = libraryQuery.trim()
        val shownFavourites = if (q.length < 2) {
            favourites
        } else {
            favourites.filter { anime ->
                anime.title.contains(q, ignoreCase = true) ||
                    anime.romajiTitle?.contains(q, ignoreCase = true) == true ||
                    anime.searchTitles().any { it.contains(q, ignoreCase = true) }
            }
        }
        val showFavourites = libraryFilter == "all" || libraryFilter == "favourites"
        if (showFavourites && shownFavourites.isNotEmpty()) {
            item {
                KittySectionHeading(
                    title = "Favourites",
                    subtitle = "Saved on AniList",
                    padded = false,
                )
            }
            item {
                LazyRow(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    lazyItems(shownFavourites, key = { "fav-${it.id}" }) { anime ->
                        Column(
                            modifier = Modifier
                                .width(112.dp)
                                .clip(RoundedCornerShape(14.dp))
                                .clickable { onOpen(anime) },
                        ) {
                            AsyncImage(
                                model = anime.coverImageUrl,
                                contentDescription = null,
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .aspectRatio(2f / 3f)
                                    .clip(RoundedCornerShape(12.dp))
                                    .border(1.dp, KittyOutlineSoft, RoundedCornerShape(12.dp)),
                                contentScale = ContentScale.Crop,
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                anime.title,
                                color = KittyText,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                                maxLines = 2,
                                overflow = TextOverflow.Ellipsis,
                            )
                        }
                    }
                }
            }
        }
        val historySections = when (libraryFilter) {
            "watching" -> listOf(Triple("Watching", watching, "w"))
            "plan" -> listOf(Triple("Plan to watch", planning, "p"))
            "paused" -> listOf(Triple("Paused", paused, "z"))
            "done" -> listOf(Triple("Completed", completed, "c"))
            "dropped" -> listOf(Triple("Dropped", dropped, "d"))
            "favourites" -> emptyList()
            else -> listOf(
                Triple("Watching", watching, "w"),
                Triple("Plan to watch", planning, "p"),
                Triple("Paused", paused, "z"),
                Triple("Completed", completed, "c"),
                Triple("Dropped", dropped, "d"),
                Triple("More", other, "o"),
            )
        }
        val historyVisible = historySections.any { it.second.isNotEmpty() }
        val searching = libraryQuery.trim().length >= 2
        if (!historyVisible && !(showFavourites && shownFavourites.isNotEmpty())) {
            item {
                val title = when {
                    searching -> "No titles match"
                    libraryFilter == "favourites" && aniListLinked -> "No favourites yet"
                    libraryFilter == "favourites" -> "Sign in for favourites"
                    else -> "Nothing in this list"
                }
                val body = when {
                    searching -> "Try another word, or clear the search."
                    libraryFilter == "favourites" && aniListLinked ->
                        "Heart a show on AniList and it shows up here."
                    libraryFilter == "favourites" ->
                        "Favourites come from your AniList account."
                    else -> "Favourite a show, or set it to Watching, and it lands here."
                }
                KittyEmptyState(title = title, body = body)
            }
        } else if (historyVisible) {
            item {
                val visibleCount = historySections.sumOf { it.second.size }
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        if (libraryFilter == "all" && !searching) {
                            "$visibleCount on this device"
                        } else {
                            "$visibleCount in this view"
                        },
                        color = KittyFaint,
                        style = MaterialTheme.typography.labelMedium,
                        fontWeight = FontWeight.SemiBold,
                    )
                    if (libraryFilter == "all" && !searching) {
                        OutlinedButton(
                            onClick = {
                                if (confirmClear) {
                                    confirmClear = false
                                    scope.launch { historyDao.clear() }
                                } else {
                                    confirmClear = true
                                }
                            },
                            contentPadding = PaddingValues(horizontal = 12.dp, vertical = 6.dp),
                            shape = RoundedCornerShape(999.dp),
                            border = BorderStroke(1.dp, KittyOutlineSoft),
                            colors = ButtonDefaults.outlinedButtonColors(contentColor = KittyMuted),
                        ) {
                            Text(
                                if (confirmClear) "Confirm clear" else "Clear local",
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                            )
                        }
                    }
                }
            }
            fun LazyListScope.section(title: String, rows: List<WatchHistoryEntity>, prefix: String) {
                if (rows.isEmpty()) return
                item {
                    KittySectionHeading(
                        title = title,
                        subtitle = "${rows.size} title${if (rows.size == 1) "" else "s"}",
                        padded = false,
                    )
                }
                lazyItems(rows, key = { "$prefix-${it.anilistId}" }) { entry ->
                    HistoryRow(entry, aniList, historyDao, onOpen)
                }
            }
            historySections.forEach { (title, rows, prefix) ->
                section(title, rows, prefix)
            }
        }
    }
}

@Composable
internal fun HistoryRow(
    entry: WatchHistoryEntity,
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    ContinueWatchCard(
        entry = entry,
        fillWidth = true,
        showWithoutCue = true,
        onOpen = {
            scope.launch {
                onOpen(
                    site.anikitty.app.data.demo.DemoLibrary.find(entry.anilistId)
                        ?: aniList.media(entry.anilistId)
                        ?: summaryFrom(entry),
                )
            }
        },
        onMarkWatched = { episode ->
            scope.launch { historyDao.markEpisode(summaryFrom(entry), episode) }
        },
    )
}
