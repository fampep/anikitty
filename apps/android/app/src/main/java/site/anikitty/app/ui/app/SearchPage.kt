// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

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
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.wrapContentHeight
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.GridItemSpan
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items as gridItems
import androidx.compose.foundation.lazy.grid.rememberLazyGridState
import androidx.compose.foundation.lazy.items as lazyItems
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ViewList
import androidx.compose.material.icons.filled.Close
import site.anikitty.app.ui.icons.FluentuiSystemIconsFilter
import site.anikitty.app.ui.icons.FluentuiSystemIconsStarFilled
import androidx.compose.material.icons.filled.GridView
import androidx.compose.material.icons.filled.Search
import androidx.compose.material.icons.filled.Star
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.RangeSlider
import androidx.compose.material3.Text
import androidx.compose.material3.rememberModalBottomSheetState
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.ui.theme.KittyText
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.ShimmerBox
import kotlin.math.roundToInt

private val SearchGenres = listOf(
    "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Horror",
    "Mahou Shoujo", "Mecha", "Music", "Mystery", "Psychological", "Romance",
    "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller",
)

private val SearchTags = listOf(
    "Isekai", "School", "Reincarnation", "Magic", "Military", "Historical",
    "Martial Arts", "Super Power", "Time Travel", "Survival", "Cyberpunk",
    "Coming of Age", "Ensemble Cast", "Tragedy", "Vampire", "Demons",
    "Space", "Video Game", "Post-Apocalyptic",
)

private data class SearchPick(
    val format: String? = null,
    val status: String? = null,
    val country: String? = null,
    val season: String? = null,
    val yearFrom: Int? = null,
    val yearTo: Int? = null,
    val episodesFrom: Int? = null,
    val episodesTo: Int? = null,
    val durationFrom: Int? = null,
    val durationTo: Int? = null,
    val genres: Set<String> = emptySet(),
    val tags: Set<String> = emptySet(),
    val sort: String = "POPULARITY_DESC",
) {
    fun on(): Boolean =
        format != null || status != null || country != null || season != null ||
            yearFrom != null || yearTo != null || episodesFrom != null || episodesTo != null ||
            durationFrom != null || durationTo != null || genres.isNotEmpty() || tags.isNotEmpty() ||
            sort != "POPULARITY_DESC"
}

private data class ActiveSearchChip(val label: String, val clear: () -> Unit)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun SearchFeed(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary) -> Unit,
    requestedGenre: String? = null,
    onRequestedGenreConsumed: () -> Unit = {},
    listMarks: Map<Int, String> = emptyMap(),
) {
    var query by rememberSaveable { mutableStateOf("") }
    var pick by remember { mutableStateOf(SearchPick()) }
    var asGrid by rememberSaveable { mutableStateOf(true) }
    var filtersOpen by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    var items by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var discover by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var page by remember { mutableIntStateOf(1) }
    var end by remember { mutableStateOf(false) }
    var recentRaw by rememberSaveable { mutableStateOf("") }
    val recent = remember(recentRaw) {
        recentRaw.split('\u001f').map { it.trim() }.filter { it.isNotEmpty() }
    }
    val scope = rememberCoroutineScope()
    var searchJob by remember { mutableStateOf<Job?>(null) }
    val gridState = rememberLazyGridState()

    fun rememberQuery(q: String) {
        val trimmed = q.trim()
        if (trimmed.length < 2) return
        val next = (listOf(trimmed) + recent.filterNot { it.equals(trimmed, ignoreCase = true) }).take(8)
        recentRaw = next.joinToString("\u001f")
    }

    fun runSearch(raw: String, more: Boolean = false, filters: SearchPick = pick) {
        val q = raw.trim()
        if (!more && q.length < 2 && !filters.on()) {
            searchJob?.cancel()
            items = emptyList()
            error = null
            loading = false
            page = 1
            end = false
            return
        }
        if (more && (loading || end || items.isEmpty())) return
        val nextPage = if (more) page + 1 else 1
        searchJob?.cancel()
        searchJob = scope.launch {
            if (!more) delay(280)
            loading = true
            if (!more) error = null
            runCatching {
                aniList.browse(
                    query = q,
                    format = filters.format,
                    status = filters.status,
                    season = filters.season,
                    genres = filters.genres.toList(),
                    tags = filters.tags.toList(),
                    country = filters.country,
                    yearFrom = filters.yearFrom,
                    yearTo = filters.yearTo,
                    episodesFrom = filters.episodesFrom,
                    episodesTo = filters.episodesTo,
                    durationFrom = filters.durationFrom,
                    durationTo = filters.durationTo,
                    sort = if (q.length >= 2 && filters.sort == "POPULARITY_DESC") "SEARCH_MATCH" else filters.sort,
                    page = nextPage,
                )
            }.onSuccess { found ->
                items = if (more) (items + found).distinctBy { it.id } else found
                page = nextPage
                end = found.size < 24
                if (q.length >= 2 && found.isNotEmpty()) rememberQuery(q)
            }.onFailure { error = friendlyFailure(it.message) }
            loading = false
        }
    }

    fun update(next: SearchPick) {
        pick = next
        runSearch(query, filters = next)
    }

    LaunchedEffect(Unit) {
        runCatching { aniList.trending(perPage = 12) }.onSuccess { discover = it }
    }
    LaunchedEffect(requestedGenre) {
        val next = requestedGenre ?: return@LaunchedEffect
        val withGenre = pick.copy(genres = pick.genres + next)
        pick = withGenre
        runSearch(query, filters = withGenre)
        onRequestedGenreConsumed()
    }
    val loadMore = remember { derivedStateOf {
        val last = gridState.layoutInfo.visibleItemsInfo.lastOrNull() ?: return@derivedStateOf false
        last.index >= gridState.layoutInfo.totalItemsCount - 6
    } }
    LaunchedEffect(loadMore.value, items.size) {
        if (loadMore.value) runSearch(query, more = true)
    }

    val chips = activeChips(pick) { update(it) }
    val showingResults = items.isNotEmpty() || (query.trim().length >= 2 || pick.on())
    val suggestions = if (query.trim().length >= 2) items.take(6) else emptyList()
    val gridItems = if (items.isNotEmpty()) items else if (!showingResults) discover else emptyList()

    val palette = LocalKittyPalette.current
    Box(modifier = Modifier.fillMaxSize().background(palette.page)) {
        LazyVerticalGrid(
            state = gridState,
            columns = if (asGrid) GridCells.Adaptive(100.dp) else GridCells.Fixed(1),
            contentPadding = PaddingValues(
                start = 16.dp,
                end = 16.dp,
                top = (if (chips.isNotEmpty()) 188.dp else 148.dp) +
                    if (suggestions.isNotEmpty()) 44.dp else 0.dp,
                bottom = 110.dp,
            ),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
            verticalArrangement = Arrangement.spacedBy(if (asGrid) 16.dp else 10.dp),
            modifier = Modifier.fillMaxSize(),
        ) {
            if (loading && items.isEmpty() && showingResults) {
                items(6) {
                    ShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (asGrid) 150.dp else 84.dp)
                            .clip(RoundedCornerShape(12.dp)),
                    )
                }
            } else if (error != null && items.isEmpty()) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(Modifier.fillMaxWidth().padding(top = 48.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(error ?: "Search failed", color = palette.text, fontWeight = FontWeight.SemiBold)
                        Spacer(Modifier.height(10.dp))
                        Button(
                            onClick = { runSearch(query) },
                            colors = ButtonDefaults.buttonColors(containerColor = palette.text, contentColor = palette.onAccent),
                        ) { Text("Retry", fontWeight = FontWeight.Bold) }
                    }
                }
            } else if (showingResults && items.isEmpty() && !loading) {
                item(span = { GridItemSpan(maxLineSpan) }) {
                    Column(
                        modifier = Modifier.fillMaxWidth().padding(top = 72.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                    ) {
                        Icon(Icons.Filled.Search, contentDescription = null, tint = palette.text.copy(alpha = 0.35f), modifier = Modifier.size(32.dp))
                        Spacer(Modifier.height(12.dp))
                        Text("No results found", color = palette.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                        Spacer(Modifier.height(6.dp))
                        Text(
                            "Try a broader title or clear a filter.",
                            color = palette.text.copy(alpha = 0.45f),
                            fontSize = 13.sp,
                            textAlign = TextAlign.Center,
                        )
                    }
                }
            } else {
                if (!showingResults && recent.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp),
                        ) {
                            recent.forEach { saved ->
                                SearchFilterChip(saved, selected = false) {
                                    query = saved
                                    runSearch(saved)
                                }
                            }
                            SearchFilterChip("Clear", selected = true) { recentRaw = "" }
                        }
                    }
                }
                if (showingResults && items.isEmpty() && !loading) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Column(
                            modifier = Modifier
                                .fillMaxWidth()
                                .padding(horizontal = 8.dp, vertical = 28.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(
                                "Nothing matches that yet",
                                color = palette.text,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 16.sp,
                            )
                            Text(
                                "Try a shorter title, or clear the filters and browse what's trending.",
                                color = palette.muted,
                                fontSize = 13.sp,
                                textAlign = TextAlign.Center,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                    }
                }
                gridItems(gridItems, key = { it.id }) { anime ->
                    val open = {
                        scope.launch { historyDao.touchFromCatalog(anime) }
                        onOpen(anime)
                    }
                    if (asGrid) SearchPoster(anime, listMarks[anime.id], open)
                    else SearchListRow(anime, listMarks[anime.id], open)
                }
                if (loading && items.isNotEmpty()) {
                    item(span = { GridItemSpan(maxLineSpan) }) {
                        Box(Modifier.fillMaxWidth().padding(16.dp), contentAlignment = Alignment.Center) {
                            CircularProgressIndicator(color = palette.text, modifier = Modifier.size(22.dp), strokeWidth = 2.dp)
                        }
                    }
                }
            }
        }

        Column(
            modifier = Modifier
                .fillMaxWidth()
                .wrapContentHeight()
                .background(palette.page.copy(alpha = 0.94f))
                .statusBarsPadding()
                .padding(bottom = 8.dp),
        ) {
            Row(
                modifier = Modifier.fillMaxWidth().padding(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("Search", color = palette.text, fontWeight = FontWeight.Bold, fontSize = 22.sp, modifier = Modifier.weight(1f))
                HeaderDisc(onClick = { asGrid = !asGrid }) {
                    Icon(
                        if (asGrid) Icons.AutoMirrored.Filled.ViewList else Icons.Filled.GridView,
                        contentDescription = if (asGrid) "List" else "Grid",
                        tint = palette.text.copy(alpha = 0.75f),
                        modifier = Modifier.size(16.dp),
                    )
                }
                Spacer(Modifier.width(8.dp))
                HeaderDisc(onClick = { filtersOpen = true }, selected = filtersOpen || pick.on()) {
                    Icon(
                        FluentuiSystemIconsFilter,
                        contentDescription = "Filters",
                        tint = if (filtersOpen || pick.on()) palette.text else palette.text.copy(alpha = 0.75f),
                        modifier = Modifier.size(16.dp),
                    )
                }
            }
            BasicTextField(
                value = query,
                onValueChange = {
                    query = it
                    runSearch(it)
                },
                textStyle = TextStyle(color = palette.text, fontSize = 14.sp),
                cursorBrush = SolidColor(palette.text),
                keyboardOptions = KeyboardOptions(imeAction = ImeAction.Search),
                keyboardActions = KeyboardActions(onSearch = { runSearch(query) }),
                singleLine = true,
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp)
                    .height(38.dp)
                    .semantics { contentDescription = "Search titles" },
                decorationBox = { inner ->
                    Row(
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(19.dp))
                            .background(palette.text.copy(alpha = 0.05f))
                            .border(1.dp, palette.text.copy(alpha = 0.12f), RoundedCornerShape(19.dp))
                            .padding(horizontal = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(Icons.Filled.Search, contentDescription = null, tint = palette.text.copy(alpha = 0.5f), modifier = Modifier.size(16.dp))
                        Spacer(Modifier.width(6.dp))
                        Box(Modifier.weight(1f)) {
                            if (query.isEmpty()) {
                                Text("Titles, genres, specials...", color = palette.text.copy(alpha = 0.35f), fontSize = 13.sp)
                            }
                            inner()
                        }
                        if (query.isNotEmpty()) {
                            Icon(
                                Icons.Filled.Close,
                                contentDescription = "Clear search",
                                tint = palette.text.copy(alpha = 0.6f),
                                modifier = Modifier.size(16.dp).clickable {
                                    query = ""
                                    runSearch("")
                                },
                            )
                        }
                    }
                },
            )
            if (suggestions.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                Row(
                    modifier = Modifier
                        .horizontalScroll(rememberScrollState())
                        .padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    suggestions.forEach { anime ->
                        SearchFilterChip(anime.title, selected = false) {
                            scope.launch { historyDao.touchFromCatalog(anime) }
                            onOpen(anime)
                        }
                    }
                }
            }
            if (chips.isNotEmpty()) {
                Spacer(Modifier.height(8.dp))
                LazyRow(
                    contentPadding = PaddingValues(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    lazyItems(chips, key = { it.label }) { chip ->
                        Row(
                            modifier = Modifier
                                .clip(RoundedCornerShape(12.dp))
                                .background(palette.text.copy(alpha = 0.12f))
                                .border(1.dp, palette.text.copy(alpha = 0.28f), RoundedCornerShape(12.dp))
                                .clickable(onClick = chip.clear)
                                .padding(horizontal = 10.dp, vertical = 6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(chip.label, color = palette.text, fontWeight = FontWeight.Bold, fontSize = 12.sp)
                            Spacer(Modifier.width(6.dp))
                            Icon(Icons.Filled.Close, contentDescription = "Remove ${chip.label}", tint = palette.text, modifier = Modifier.size(12.dp))
                        }
                    }
                }
            }
        }
    }

    if (filtersOpen) {
        val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)
        ModalBottomSheet(
            onDismissRequest = { filtersOpen = false },
            sheetState = sheetState,
            containerColor = Color(0xFF09090B),
            dragHandle = null,
        ) {
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState())
                    .navigationBarsPadding()
                    .padding(horizontal = 20.dp, vertical = 16.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text("Filters", color = palette.text, fontWeight = FontWeight.Bold, fontSize = 18.sp)
                FilterChoice("FORMAT", listOf("TV", "TV_SHORT", "MOVIE", "SPECIAL", "OVA", "ONA"), pick.format, ::formatLabel) {
                    update(pick.copy(format = it))
                }
                FilterChoice(
                    "STATUS",
                    listOf("RELEASING", "NOT_YET_RELEASED", "FINISHED", "CANCELLED"),
                    pick.status,
                    ::statusLabel,
                ) { update(pick.copy(status = it)) }
                FilterChoice(
                    "COUNTRY",
                    listOf("JP", "KR", "CN", "TW"),
                    pick.country,
                    { mapOf("JP" to "Japan", "KR" to "S. Korea", "CN" to "China", "TW" to "Taiwan")[it] ?: it },
                ) { update(pick.copy(country = it)) }
                FilterChoice("SEASON", listOf("WINTER", "SPRING", "SUMMER", "FALL"), pick.season, {
                    it.lowercase().replaceFirstChar { c -> c.uppercase() }
                }) { update(pick.copy(season = it)) }
                RangeBlock(
                    title = "YEARS",
                    start = (pick.yearFrom ?: 1970).toFloat(),
                    end = (pick.yearTo ?: 2026).toFloat(),
                    range = 1970f..2026f,
                    label = { a, b -> "$a - $b" },
                ) { a, b ->
                    update(pick.copy(yearFrom = a.takeIf { it > 1970 }, yearTo = b.takeIf { it < 2026 }))
                }
                RangeBlock(
                    title = "EPISODES",
                    start = (pick.episodesFrom ?: 1).toFloat(),
                    end = (pick.episodesTo ?: 100).toFloat(),
                    range = 1f..100f,
                    label = { a, b -> "$a - ${if (b >= 100) "100+" else b}" },
                ) { a, b ->
                    update(pick.copy(episodesFrom = a.takeIf { it > 1 }, episodesTo = b.takeIf { it < 100 }))
                }
                RangeBlock(
                    title = "DURATION (MINS)",
                    start = (pick.durationFrom ?: 1).toFloat(),
                    end = (pick.durationTo ?: 180).toFloat(),
                    range = 1f..180f,
                    label = { a, b -> "$a - ${if (b >= 180) "180+" else b}" },
                ) { a, b ->
                    update(pick.copy(durationFrom = a.takeIf { it > 1 }, durationTo = b.takeIf { it < 180 }))
                }
                Text("GENRES", color = palette.text.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
                FlowChips(SearchGenres, pick.genres) { name ->
                    val next = if (name in pick.genres) pick.genres - name else pick.genres + name
                    update(pick.copy(genres = next))
                }
                Text("TAGS", color = palette.text.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
                FlowChips(SearchTags, pick.tags) { name ->
                    val next = if (name in pick.tags) pick.tags - name else pick.tags + name
                    update(pick.copy(tags = next))
                }
                Text("SORT BY", color = palette.text.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
                FlowChips(
                    listOf("POPULARITY_DESC", "SCORE_DESC", "TRENDING_DESC", "START_DATE_DESC", "EPISODES_DESC"),
                    setOf(pick.sort),
                    label = ::sortLabel,
                ) { id -> update(pick.copy(sort = id)) }
                Button(
                    onClick = { update(SearchPick()) },
                    modifier = Modifier.fillMaxWidth().height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = palette.text.copy(alpha = 0.12f), contentColor = palette.text),
                ) { Text("Clear all filters", fontWeight = FontWeight.Bold) }
            }
        }
    }
}

private fun activeChips(pick: SearchPick, update: (SearchPick) -> Unit): List<ActiveSearchChip> {
    val list = mutableListOf<ActiveSearchChip>()
    pick.format?.let { list += ActiveSearchChip("Format: ${formatLabel(it)}") { update(pick.copy(format = null)) } }
    pick.status?.let { list += ActiveSearchChip("Status: ${statusLabel(it)}") { update(pick.copy(status = null)) } }
    pick.country?.let { list += ActiveSearchChip("Country: $it") { update(pick.copy(country = null)) } }
    pick.season?.let {
        list += ActiveSearchChip("Season: ${it.lowercase().replaceFirstChar { c -> c.uppercase() }}") {
            update(pick.copy(season = null))
        }
    }
    if (pick.yearFrom != null || pick.yearTo != null) {
        list += ActiveSearchChip("Years: ${pick.yearFrom ?: 1970} - ${pick.yearTo ?: 2026}") {
            update(pick.copy(yearFrom = null, yearTo = null))
        }
    }
    if (pick.episodesFrom != null || pick.episodesTo != null) {
        list += ActiveSearchChip("Episodes: ${pick.episodesFrom ?: 1} - ${pick.episodesTo ?: "100+"}") {
            update(pick.copy(episodesFrom = null, episodesTo = null))
        }
    }
    if (pick.durationFrom != null || pick.durationTo != null) {
        list += ActiveSearchChip("Duration: ${pick.durationFrom ?: 1} - ${pick.durationTo ?: "180+"}") {
            update(pick.copy(durationFrom = null, durationTo = null))
        }
    }
    pick.genres.forEach { name -> list += ActiveSearchChip(name) { update(pick.copy(genres = pick.genres - name)) } }
    pick.tags.forEach { name -> list += ActiveSearchChip(name) { update(pick.copy(tags = pick.tags - name)) } }
    if (pick.sort != "POPULARITY_DESC") {
        list += ActiveSearchChip("Sort: ${sortLabel(pick.sort)}") { update(pick.copy(sort = "POPULARITY_DESC")) }
    }
    return list
}

@Composable
private fun FilterChoice(
    title: String,
    values: List<String>,
    selected: String?,
    label: (String) -> String,
    onPick: (String?) -> Unit,
) {
    val palette = LocalKittyPalette.current
    Column {
        Text(title, color = palette.text.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
        Spacer(Modifier.height(6.dp))
        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
            item {
                SearchFilterChip("Any", selected = selected == null) { onPick(null) }
            }
            lazyItems(values) { value ->
                SearchFilterChip(label(value), selected = selected == value) {
                    onPick(if (selected == value) null else value)
                }
            }
        }
    }
}

@Composable
private fun FlowChips(
    values: List<String>,
    selected: Set<String>,
    label: (String) -> String = { it },
    onToggle: (String) -> Unit,
) {
    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
        lazyItems(values) { value ->
            SearchFilterChip(label(value), selected = value in selected) { onToggle(value) }
        }
    }
}

@Composable
private fun RangeBlock(
    title: String,
    start: Float,
    end: Float,
    range: ClosedFloatingPointRange<Float>,
    label: (Int, Int) -> String,
    onFinish: (Int, Int) -> Unit,
) {
    val palette = LocalKittyPalette.current
    var local by remember(start, end) { mutableStateOf(start..end) }
    Column {
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Text(title, color = palette.text.copy(alpha = 0.4f), fontWeight = FontWeight.Bold, fontSize = 11.sp, letterSpacing = 1.sp)
            Text(
                label(local.start.roundToInt(), local.endInclusive.roundToInt()),
                color = palette.text,
                fontWeight = FontWeight.Bold,
                fontSize = 12.sp,
            )
        }
        RangeSlider(
            value = local,
            onValueChange = { local = it },
            valueRange = range,
            onValueChangeFinished = { onFinish(local.start.roundToInt(), local.endInclusive.roundToInt()) },
        )
    }
}

@Composable
private fun SearchFilterChip(text: String, selected: Boolean, onClick: () -> Unit) {
    val palette = LocalKittyPalette.current
    Text(
        text,
        color = if (selected) palette.text else palette.text.copy(alpha = 0.7f),
        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
        fontSize = 11.sp,
        modifier = Modifier
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) palette.text.copy(alpha = 0.16f) else palette.text.copy(alpha = 0.04f))
            .border(0.5.dp, palette.text.copy(alpha = if (selected) 0.4f else 0.08f), RoundedCornerShape(10.dp))
            .clickable(onClick = onClick)
            .padding(horizontal = 10.dp, vertical = 5.dp),
    )
}

@Composable
private fun HeaderDisc(onClick: () -> Unit, selected: Boolean = false, content: @Composable () -> Unit) {
    val palette = LocalKittyPalette.current
    Box(
        modifier = Modifier
            .size(34.dp)
            .clip(CircleShape)
            .background(if (selected) palette.text.copy(alpha = 0.16f) else palette.text.copy(alpha = 0.05f))
            .border(1.dp, palette.text.copy(alpha = if (selected) 0.35f else 0.08f), CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) { content() }
}

@Composable
private fun SearchPoster(anime: AnimeSummary, badge: String?, onClick: () -> Unit) {
    val palette = LocalKittyPalette.current
    Column(Modifier.clickable(onClick = onClick)) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(3.dp))
                .background(palette.surface),
        )
        Spacer(Modifier.height(6.dp))
        Text(
            anime.title,
            color = palette.text,
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            lineHeight = 15.sp,
        )
        Row(
            modifier = Modifier.padding(top = 2.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            val aired = anime.airedLabel()
            if (!aired.isNullOrBlank()) {
                Text(
                    aired,
                    color = palette.text.copy(alpha = 0.4f),
                    fontSize = 11.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f, fill = false),
                )
            }
            anime.format?.takeIf { it.isNotBlank() }?.let { format ->
                if (!aired.isNullOrBlank()) Spacer(Modifier.width(6.dp))
                Text(formatLabel(format), color = palette.text.copy(alpha = 0.55f), fontSize = 11.sp, maxLines = 1)
            }
            if (anime.status.equals("RELEASING", true)) {
                Spacer(Modifier.width(5.dp))
                Box(
                    Modifier
                        .size(6.dp)
                        .clip(CircleShape)
                        .background(palette.text),
                )
            }
        }
        badge?.let { Text(it, color = palette.text.copy(alpha = 0.7f), fontSize = 10.sp, fontWeight = FontWeight.Medium) }
    }
}

@Composable
private fun SearchListRow(anime: AnimeSummary, badge: String?, onClick: () -> Unit) {
    val palette = LocalKittyPalette.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(palette.surface)
            .border(0.5.dp, palette.text.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .clickable(onClick = onClick)
            .padding(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.width(72.dp).aspectRatio(0.7f).clip(RoundedCornerShape(8.dp)).background(palette.surface)) {
            AsyncImage(
                model = anime.coverImageUrl,
                contentDescription = anime.title,
                contentScale = ContentScale.Crop,
                modifier = Modifier.fillMaxSize(),
            )
            anime.averageScore?.let { score ->
                ScoreBadge("$score%", score, Modifier.align(Alignment.BottomStart).padding(4.dp))
            }
        }
        Spacer(Modifier.width(12.dp))
        Column(Modifier.weight(1f)) {
            Text(anime.title, color = palette.text, fontWeight = FontWeight.Bold, fontSize = 13.sp, maxLines = 1, overflow = TextOverflow.Ellipsis)
            val meta = listOfNotNull(formatLabel(anime.format ?: ""), anime.seasonYear?.toString(), anime.episodes?.let { "$it eps" })
                .filter { it.isNotBlank() }
                .joinToString(" · ")
            if (meta.isNotEmpty()) {
                Text(meta, color = palette.text.copy(alpha = 0.6f), fontSize = 11.sp, maxLines = 1)
            }
            if (anime.genres.isNotEmpty()) {
                Spacer(Modifier.height(4.dp))
                Text(anime.genres.take(3).joinToString("  ·  "), color = palette.text.copy(alpha = 0.45f), fontSize = 10.sp, maxLines = 1)
            }
            badge?.let {
                Text(it, color = palette.text, fontSize = 10.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun ScoreBadge(text: String, score: Int, modifier: Modifier = Modifier) {
    val palette = LocalKittyPalette.current
    Row(
        modifier = modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color.Black.copy(alpha = 0.7f))
            .padding(horizontal = 5.dp, vertical = 2.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(FluentuiSystemIconsStarFilled, contentDescription = null, tint = palette.text, modifier = Modifier.size(9.dp))
        Spacer(Modifier.width(2.dp))
        Text(text, color = palette.text, fontSize = 9.sp, fontWeight = FontWeight.Bold)
    }
}

private fun formatLabel(fmt: String) = when (fmt) {
    "TV_SHORT" -> "TV Short"
    "MOVIE" -> "Movie"
    "SPECIAL" -> "Special"
    else -> fmt
}

private fun statusLabel(stat: String) = when (stat) {
    "NOT_YET_RELEASED" -> "Not released"
    "RELEASING" -> "Releasing"
    "FINISHED" -> "Finished"
    "CANCELLED" -> "Canceled"
    else -> stat
}

private fun sortLabel(id: String) = when (id) {
    "SCORE_DESC" -> "Score"
    "TRENDING_DESC" -> "Trending"
    "START_DATE_DESC" -> "Date"
    "EPISODES_DESC" -> "Episodes"
    else -> "Popular"
}
