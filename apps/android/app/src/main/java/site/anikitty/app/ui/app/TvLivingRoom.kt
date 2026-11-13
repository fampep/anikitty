package site.anikitty.app.ui.app

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.data.airingLabel
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeEpisodeItem
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.plainSynopsis
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyPage
import java.time.Instant
import java.time.ZoneId
import java.time.format.DateTimeFormatter

private data class TvSpot(
    val title: String,
    val artUrl: String?,
    val eyebrow: String,
    val meta: String,
    val blurb: String?,
    val action: String,
)

private data class TvCard(
    val key: String,
    val title: String,
    val coverUrl: String?,
    val caption: String?,
    val spot: TvSpot,
    val onClick: () -> Unit,
)

private data class TvShelf(val title: String, val cards: List<TvCard>)

/** Sizes matched to a 960×540dp television canvas: small posters, a short hero, a thin menu. */
private val PosterWidth = 88.dp
private val PosterHeight = 132.dp
private val StillWidth = 180.dp
private val StillHeight = 100.dp
private val SafeX = 44.dp
private val HeroCopyHeight = 168.dp

private val TvTabs = listOf(
    "search" to "Search",
    "home" to "Home",
    "schedule" to "Schedule",
    "history" to "Library",
    "store" to "Store",
    "settings" to "Account",
)

/**
 * Living-room shell: a top menu over a full-bleed backdrop, with the focused
 * title written large and poster rows underneath. Original layout.
 */
@Composable
internal fun TvLivingRoom(
    tab: String,
    onTab: (String) -> Unit,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?) -> Unit,
    requestedGenre: String?,
    onRequestedGenreConsumed: () -> Unit,
    libraryFilter: String,
    account: @Composable () -> Unit,
    store: @Composable () -> Unit,
    schedule: @Composable () -> Unit,
) {
    var artUrl by remember { mutableStateOf<String?>(null) }
    var browsing by remember { mutableStateOf(false) }
    val cinematic = tab == "home" || tab == "search" || tab == "history"
    Box(modifier = Modifier.fillMaxSize().background(KittyPage)) {
        if (cinematic) {
            Crossfade(targetState = artUrl, animationSpec = tween(420), label = "tvArt") { url ->
                if (!url.isNullOrBlank()) {
                    AsyncImage(
                        model = url,
                        contentDescription = null,
                        modifier = Modifier.fillMaxSize(),
                        contentScale = ContentScale.Crop,
                    )
                }
            }
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.horizontalGradient(
                            0f to Color.Black.copy(alpha = 0.88f),
                            0.34f to Color.Black.copy(alpha = 0.42f),
                            0.62f to Color.Transparent,
                        ),
                    ),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Black.copy(alpha = 0.28f),
                            0.42f to Color.Transparent,
                            0.78f to Color.Black.copy(alpha = 0.72f),
                            1f to Color.Black,
                        ),
                    ),
            )
        }
        Column(modifier = Modifier.fillMaxSize()) {
            TvMenu(
                selected = tab,
                dimmed = browsing,
                onSelect = {
                    browsing = false
                    onTab(it)
                },
                onMenuFocus = { browsing = false },
            )
            Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
                when (tab) {
                    "home" -> TvHome(
                        aniList = aniList,
                        aniListAuth = aniListAuth,
                        history = history,
                        historyDao = historyDao,
                        onOpen = onOpen,
                        onArt = { artUrl = it },
                        onBrowsing = { browsing = true },
                    )
                    "search" -> TvSearch(
                        aniList = aniList,
                        historyDao = historyDao,
                        requestedGenre = requestedGenre,
                        onRequestedGenreConsumed = onRequestedGenreConsumed,
                        onOpen = onOpen,
                        onArt = { artUrl = it },
                        onBrowsing = { browsing = true },
                    )
                    "history" -> TvLibrary(
                        aniList = aniList,
                        aniListAuth = aniListAuth,
                        history = history,
                        historyDao = historyDao,
                        filter = libraryFilter,
                        onOpen = onOpen,
                        onArt = { artUrl = it },
                        onBrowsing = { browsing = true },
                    )
                    "schedule" -> schedule()
                    "store" -> store()
                    else -> account()
                }
            }
        }
    }
}

@Composable
private fun TvMenu(
    selected: String,
    dimmed: Boolean,
    onSelect: (String) -> Unit,
    onMenuFocus: () -> Unit,
) {
    val requesters = remember { List(TvTabs.size) { FocusRequester() } }
    LaunchedEffect(Unit) {
        val index = TvTabs.indexOfFirst { it.first == selected }.coerceAtLeast(0)
        delay(48)
        runCatching { requesters[index].requestFocus() }
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .graphicsLayer { alpha = if (dimmed) 0.70f else 1f }
            .padding(start = SafeX, end = SafeX, top = 28.dp)
            .height(32.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "AniKitty",
            color = Color(0xFFEDEDED),
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
        )
        Spacer(modifier = Modifier.width(22.dp))
        TvTabs.forEachIndexed { index, (id, label) ->
            var focused by remember { mutableStateOf(false) }
            val active = id == selected
            val shape = RoundedCornerShape(999.dp)
            Text(
                label,
                color = if (focused) Color.Black else Color(0xFFEDEDED),
                fontWeight = FontWeight.SemiBold,
                fontSize = 15.sp,
                modifier = Modifier
                    .padding(end = 4.dp)
                    .height(30.dp)
                    .focusRequester(requesters[index])
                    .onFocusChanged {
                        focused = it.isFocused
                        if (it.isFocused) {
                            onMenuFocus()
                            if (id != selected) onSelect(id)
                        }
                    }
                    .clip(shape)
                    .background(if (focused) Color(0xFFEDEDED) else if (active) Color.White.copy(alpha = 0.14f) else Color.Transparent)
                    .border(
                        1.dp,
                        if (focused) Color.Transparent else if (active) Color.White.copy(alpha = 0.10f) else Color.Transparent,
                        shape,
                    )
                    .clickable { onSelect(id) }
                    .padding(horizontal = 14.dp, vertical = 6.dp),
            )
        }
    }
}

@Composable
private fun TvHome(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onArt: (String?) -> Unit,
    onBrowsing: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var airing by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    var forYou by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var forYouFrom by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(Unit) {
        loading = true
        error = null
        runCatching {
            coroutineScope {
                val trend = async { aniList.trending() }
                val pop = async { aniList.popular() }
                val season = async { aniList.seasonal() }
                val start = java.util.Calendar.getInstance().apply {
                    set(java.util.Calendar.HOUR_OF_DAY, 0)
                    set(java.util.Calendar.MINUTE, 0)
                    set(java.util.Calendar.SECOND, 0)
                    set(java.util.Calendar.MILLISECOND, 0)
                }
                val from = start.timeInMillis / 1000L
                val today = async { aniList.airingSchedule(from, from + 24 * 60 * 60) }
                trending = trend.await()
                popular = pop.await()
                seasonal = season.await()
                airing = today.await()
            }
        }.onFailure { error = friendlyFailure(it.message) }
        loading = false
    }

    val continueWatching = remember(history) {
        history.filter {
            val status = it.listStatus?.uppercase()
            status == null || status == "CURRENT" || status == "REPEATING"
        }.take(16)
    }
    val spotlightId = continueWatching.firstOrNull()?.anilistId
    LaunchedEffect(spotlightId) {
        val id = spotlightId ?: return@LaunchedEffect
        val full = runCatching { aniList.media(id, aniListAuth.accessToken) }.getOrNull()
        forYouFrom = continueWatching.firstOrNull { it.anilistId == id }?.title
        forYou = full?.recommendations.orEmpty().filter { it.id != id }.take(16)
    }

    fun open(anime: AnimeSummary, episode: Int?) {
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, episode)
    }

    val shelves = buildList {
        if (continueWatching.isNotEmpty()) {
            add(shelfFromHistory("Continue watching", continueWatching, ::open))
        }
        if (airing.isNotEmpty()) {
            add(shelfFromAiring(airing, ::open))
        }
        if (trending.isNotEmpty()) add(shelfFromAnime("Trending", trending, ::open))
        if (forYou.isNotEmpty()) {
            add(shelfFromAnime(forYouFrom?.let { "Because you watch $it" } ?: "For you", forYou, ::open))
        }
        val planning = history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.take(16)
        if (planning.isNotEmpty()) add(shelfFromHistory("Plan to watch", planning, ::open, resume = false))
        if (popular.isNotEmpty()) add(shelfFromAnime("Popular", popular, ::open))
        if (seasonal.isNotEmpty()) add(shelfFromAnime("This season", seasonal, ::open))
    }

    when {
        loading && shelves.isEmpty() -> TvMessage("Loading the catalog…", busy = true)
        error != null && shelves.isEmpty() -> TvMessage(error ?: "Couldn’t load the catalog")
        else -> TvSkyline(shelves = shelves, onArt = onArt, onBrowsing = onBrowsing, empty = "Nothing to show yet")
    }
}

@Composable
private fun TvSearch(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    requestedGenre: String?,
    onRequestedGenreConsumed: () -> Unit,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onArt: (String?) -> Unit,
    onBrowsing: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var genre by remember { mutableStateOf<String?>(requestedGenre) }
    var results by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val genres = listOf(
        "Action", "Romance", "Fantasy", "Comedy", "Drama", "Adventure", "Slice of Life", "Sports",
    )

    LaunchedEffect(requestedGenre) {
        if (!requestedGenre.isNullOrBlank()) {
            genre = requestedGenre
            query = ""
            onRequestedGenreConsumed()
        }
    }

    LaunchedEffect(query, genre) {
        val text = query.trim()
        val picked = genre
        if (text.length < 2 && picked.isNullOrBlank()) {
            results = emptyList()
            error = null
            return@LaunchedEffect
        }
        delay(280)
        busy = true
        error = null
        runCatching {
            if (text.length >= 2) aniList.search(text) else aniList.browse(genre = picked, perPage = 24)
        }.onSuccess { results = it }
            .onFailure {
                results = emptyList()
                error = friendlyFailure(it.message)
            }
        busy = false
    }

    fun open(anime: AnimeSummary, episode: Int?) {
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, episode)
    }

    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier.padding(horizontal = 48.dp, vertical = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            var fieldFocused by remember { mutableStateOf(false) }
            BasicTextField(
                value = query,
                onValueChange = {
                    query = it
                    if (it.isNotBlank()) genre = null
                },
                singleLine = true,
                textStyle = TextStyle(color = Color.White, fontSize = 16.sp, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(Color.White),
                modifier = Modifier
                    .weight(1f)
                    .onFocusChanged { fieldFocused = it.isFocused }
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.45f))
                    .border(
                        if (fieldFocused) 2.dp else 1.dp,
                        if (fieldFocused) Color.White.copy(alpha = 0.70f) else Color.White.copy(alpha = 0.16f),
                        RoundedCornerShape(8.dp),
                    )
                    .padding(horizontal = 14.dp, vertical = 8.dp),
                decorationBox = { inner ->
                    Box {
                        if (query.isEmpty()) {
                            Text("Search titles", color = Color.White.copy(alpha = 0.55f), fontSize = 16.sp)
                        }
                        inner()
                    }
                },
            )
            if (busy) {
                CircularProgressIndicator(
                    modifier = Modifier.padding(start = 16.dp).width(22.dp).height(22.dp),
                    color = Color.White,
                    strokeWidth = 2.dp,
                )
            }
        }
        LazyRow(
            contentPadding = PaddingValues(horizontal = SafeX),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(genres) { name ->
                var focused by remember(name) { mutableStateOf(false) }
                val picked = genre == name && query.isBlank()
                Text(
                    name,
                    color = if (focused) KittyOnAccent else Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .onFocusChanged { focused = it.isFocused }
                        .clip(RoundedCornerShape(999.dp))
                        .background(if (focused) Color.White else Color.White.copy(alpha = if (picked) 0.2f else 0.08f))
                        .clickable {
                            query = ""
                            genre = if (genre == name) null else name
                        }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            when {
                error != null && results.isEmpty() -> TvMessage(error ?: "Search failed")
                query.trim().length < 2 && genre.isNullOrBlank() -> TvMessage("Search a title, or pick a genre")
                !busy && results.isEmpty() -> TvMessage("No titles match")
                else -> TvSkyline(
                    shelves = listOf(shelfFromAnime(genre ?: "Results", results, ::open)),
                    onArt = onArt,
                    onBrowsing = onBrowsing,
                    empty = "No titles match",
                )
            }
        }
    }
}

@Composable
private fun TvLibrary(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    history: List<WatchHistoryEntity>,
    historyDao: WatchHistoryDao,
    filter: String,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onArt: (String?) -> Unit,
    onBrowsing: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var favourites by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    LaunchedEffect(aniListAuth.accessToken) {
        val token = aniListAuth.accessToken
        favourites = if (token.isNullOrBlank()) {
            emptyList()
        } else {
            runCatching { aniList.favourites(token) }.getOrDefault(emptyList())
        }
    }
    fun open(anime: AnimeSummary, episode: Int?) {
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, episode)
    }
    fun rows(entries: List<WatchHistoryEntity>, title: String, resume: Boolean = true) =
        if (entries.isEmpty()) null else shelfFromHistory(title, entries.take(24), ::open, resume)

    val watching = history.filter {
        val status = it.listStatus?.uppercase()
        status == null || status == "CURRENT" || status == "REPEATING"
    }
    val planning = history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }
    val paused = history.filter { it.listStatus.equals("PAUSED", ignoreCase = true) }
    val done = history.filter { it.listStatus.equals("COMPLETED", ignoreCase = true) }
    val dropped = history.filter { it.listStatus.equals("DROPPED", ignoreCase = true) }
    val shelves = when (filter) {
        "watching" -> listOfNotNull(rows(watching, "Watching"))
        "plan" -> listOfNotNull(rows(planning, "Plan to watch", resume = false))
        "paused" -> listOfNotNull(rows(paused, "Paused"))
        "done" -> listOfNotNull(rows(done, "Completed", resume = false))
        "dropped" -> listOfNotNull(rows(dropped, "Dropped", resume = false))
        "favourites" -> listOfNotNull(shelfFromAnime("Favourites", favourites, ::open).takeIf { favourites.isNotEmpty() })
        else -> listOfNotNull(
            rows(watching, "Watching"),
            shelfFromAnime("Favourites", favourites, ::open).takeIf { favourites.isNotEmpty() },
            rows(planning, "Plan to watch", resume = false),
            rows(paused, "Paused"),
            rows(done, "Completed", resume = false),
            rows(dropped, "Dropped", resume = false),
        )
    }
    if (shelves.isEmpty()) {
        TvMessage(
            if (filter == "favourites" && !aniListAuth.isLinked) {
                "Sign in to see favourites"
            } else {
                "Nothing in this list yet"
            },
        )
    } else {
        TvSkyline(shelves = shelves, onArt = onArt, onBrowsing = onBrowsing, empty = "Nothing in this list yet")
    }
}

@Composable
private fun TvSkyline(
    shelves: List<TvShelf>,
    onArt: (String?) -> Unit,
    onBrowsing: () -> Unit,
    empty: String,
) {
    val first = shelves.firstOrNull()?.cards?.firstOrNull()
    var spot by remember { mutableStateOf(first?.spot) }
    var action by remember { mutableStateOf(first?.onClick ?: {}) }
    LaunchedEffect(first?.key) {
        if (spot == null && first != null) {
            spot = first.spot
            action = first.onClick
        }
    }
    LaunchedEffect(spot?.artUrl) { onArt(spot?.artUrl) }
    val shown = spot
    if (shown == null) {
        TvMessage(empty)
        return
    }
    Column(modifier = Modifier.fillMaxSize()) {
        Column(
            modifier = Modifier
                .height(HeroCopyHeight)
                .fillMaxWidth()
                .padding(start = SafeX, end = 220.dp),
            verticalArrangement = Arrangement.Bottom,
        ) {
            Text(
                shown.eyebrow.uppercase(),
                color = Color(0xFFEDEDED).copy(alpha = 0.75f),
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
                letterSpacing = 1.1.sp,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(
                shown.title,
                color = Color(0xFFEDEDED),
                fontWeight = FontWeight.SemiBold,
                fontSize = 28.sp,
                lineHeight = 32.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            if (shown.meta.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(shown.meta, color = Color(0xFFEDEDED).copy(alpha = 0.75f), fontSize = 14.sp, maxLines = 1)
            }
            if (!shown.blurb.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    shown.blurb,
                    color = Color(0xFFEDEDED).copy(alpha = 0.75f),
                    fontSize = 14.sp,
                    lineHeight = 18.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            TvPill(label = shown.action, filled = true, onClick = action, leadingPlay = true)
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            items(shelves, key = { it.title }) { shelf ->
                if (shelf.cards.isEmpty()) return@items
                Text(
                    shelf.title,
                    color = Color(0xFFEDEDED),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    modifier = Modifier.padding(start = SafeX, bottom = 8.dp),
                )
                LazyRow(
                    contentPadding = PaddingValues(horizontal = SafeX),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    items(shelf.cards, key = { it.key }) { card ->
                        TvPoster(card) {
                            onBrowsing()
                            spot = card.spot
                            action = card.onClick
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun TvPoster(card: TvCard, onFocused: () -> Unit) {
    var focused by remember { mutableStateOf(false) }
    val scale by animateFloatAsState(if (focused) 1.05f else 1f, tween(160), label = "poster")
    val shape = RoundedCornerShape(8.dp)
    Box(
        modifier = Modifier
            .width(PosterWidth)
            .height(PosterHeight)
            .scale(scale)
            .onFocusChanged {
                focused = it.isFocused
                if (it.isFocused) onFocused()
            }
            .clip(shape)
            .background(Color.White.copy(alpha = 0.06f))
            .border(
                if (focused) 2.dp else 0.dp,
                if (focused) Color.White.copy(alpha = 0.70f) else Color.Transparent,
                shape,
            )
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = card.onClick,
            ),
    ) {
        AsyncImage(
            model = card.coverUrl,
            contentDescription = card.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        if (!card.caption.isNullOrBlank()) {
            Text(
                card.caption,
                color = Color.White,
                fontSize = 10.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.55f))
                    .padding(horizontal = 4.dp, vertical = 2.dp),
            )
        }
    }
}

@Composable
private fun TvPill(
    label: String,
    onClick: () -> Unit,
    filled: Boolean = false,
    leadingPlay: Boolean = false,
) {
    var focused by remember { mutableStateOf(false) }
    val showFill = filled || focused
    val shape = RoundedCornerShape(8.dp)
    Row(
        modifier = Modifier
            .height(30.dp)
            .onFocusChanged { focused = it.isFocused }
            .clip(shape)
            .background(if (showFill) Color(0xFFEDEDED) else Color.White.copy(alpha = 0.12f))
            .border(if (focused) 2.dp else 0.dp, Color.White.copy(alpha = 0.70f), shape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            )
            .padding(horizontal = 14.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        if (leadingPlay) {
            androidx.compose.material3.Icon(
                Icons.Filled.PlayArrow,
                contentDescription = null,
                tint = if (showFill) Color.Black else Color.White,
                modifier = Modifier.height(16.dp),
            )
            Spacer(modifier = Modifier.width(2.dp))
        }
        Text(
            label,
            color = if (showFill) Color.Black else Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
        )
    }
}

@Composable
private fun TvMessage(text: String, busy: Boolean = false) {
    Column(
        modifier = Modifier.fillMaxSize().padding(48.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        if (busy) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
            Spacer(modifier = Modifier.height(16.dp))
        }
        Text(text, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Medium)
    }
}

@Composable
internal fun TvDetailStage(
    detail: AnimeSummary,
    episode: Int,
    audio: String,
    resolving: Boolean,
    status: String?,
    listStatus: String?,
    favourite: Boolean,
    signedIn: Boolean,
    episodes: List<AnimeEpisodeItem>,
    onBack: () -> Unit,
    onPlay: () -> Unit,
    onEpisode: (Int) -> Unit,
    onAudio: (String) -> Unit,
    onFavourite: () -> Unit,
    onListStatus: (String) -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
) {
    val art = detail.bannerImageUrl ?: detail.coverImageUrl
    val blurb = detail.description?.let { plainSynopsis(it.replace(Regex("<[^>]+>"), " ")) }?.take(280)
    Box(modifier = Modifier.fillMaxSize().background(KittyPage)) {
        if (!art.isNullOrBlank()) {
            AsyncImage(
                model = art,
                contentDescription = null,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
        }
        Box(
            modifier = Modifier.fillMaxSize().background(
                Brush.horizontalGradient(
                    0f to Color.Black.copy(alpha = 0.92f),
                    0.55f to Color.Black.copy(alpha = 0.66f),
                    1f to Color.Black.copy(alpha = 0.35f),
                ),
            ),
        )
        Column(modifier = Modifier.fillMaxSize().padding(start = SafeX, end = SafeX, top = 18.dp, bottom = 12.dp)) {
            TvPill(label = "Back", onClick = onBack)
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                detail.title,
                color = Color(0xFFEDEDED),
                fontWeight = FontWeight.SemiBold,
                fontSize = 28.sp,
                lineHeight = 32.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(4.dp))
            Text(detailMeta(detail, episode), color = Color(0xFFEDEDED).copy(alpha = 0.75f), fontSize = 14.sp, maxLines = 1)
            if (!blurb.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    blurb,
                    color = Color(0xFFEDEDED).copy(alpha = 0.75f),
                    fontSize = 14.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
            }
            Spacer(modifier = Modifier.height(10.dp))
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                TvPill(
                    label = if (resolving) "Getting stream…" else "Play episode $episode",
                    filled = true,
                    leadingPlay = !resolving,
                    onClick = { if (!resolving) onPlay() },
                )
                TvPill(label = "Sub", filled = audio != "dub", onClick = { onAudio("sub") })
                TvPill(label = "Dub", filled = audio == "dub", onClick = { onAudio("dub") })
                if (signedIn) {
                    TvPill(label = if (favourite) "Favourited" else "Favourite", onClick = onFavourite)
                }
            }
            if (signedIn) {
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf("CURRENT" to "Watching", "PLANNING" to "Plan", "COMPLETED" to "Completed").forEach { (id, label) ->
                        TvPill(label = label, filled = listStatus.equals(id, ignoreCase = true), onClick = { onListStatus(id) })
                    }
                }
            }
            if (!status.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Text(status, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
            }
            Spacer(modifier = Modifier.height(14.dp))
            Text("Episodes", color = Color(0xFFEDEDED), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(episodes, key = { it.number }) { item ->
                    val selected = item.number == episode
                    var focused by remember(item.number) { mutableStateOf(false) }
                    val shape = RoundedCornerShape(8.dp)
                    Box(
                        modifier = Modifier
                            .width(StillWidth)
                            .height(StillHeight)
                            .onFocusChanged {
                                focused = it.isFocused
                                if (it.isFocused) onEpisode(item.number)
                            }
                            .clip(shape)
                            .background(Color.White.copy(alpha = if (selected) 0.18f else 0.08f))
                            .border(
                                if (focused) 2.dp else 0.dp,
                                Color.White.copy(alpha = 0.70f),
                                shape,
                            )
                            .clickable { onEpisode(item.number) },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (!item.thumbnailUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = item.thumbnailUrl,
                                contentDescription = "Episode ${item.number}",
                                modifier = Modifier.fillMaxSize(),
                                contentScale = ContentScale.Crop,
                            )
                        }
                        Text(
                            "Episode ${item.number}",
                            color = Color.White,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            modifier = Modifier
                                .align(Alignment.BottomStart)
                                .fillMaxWidth()
                                .background(Color.Black.copy(alpha = 0.55f))
                                .padding(horizontal = 8.dp, vertical = 4.dp),
                        )
                    }
                }
            }
            val related = detail.recommendations.take(14)
            if (related.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                Text("More like this", color = Color(0xFFEDEDED), fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(related, key = { it.id }) { anime ->
                        val card = anime.toCard("More like this", "Open") { onOpenRelated(anime) }
                        TvPoster(card) {}
                    }
                }
            }
        }
    }
}

private fun shelfFromAnime(
    title: String,
    items: List<AnimeSummary>,
    open: (AnimeSummary, Int?) -> Unit,
): TvShelf = TvShelf(
    title = title,
    cards = items.map { anime ->
        anime.toCard(title, "Open") { open(anime, null) }
    },
)

private fun shelfFromHistory(
    title: String,
    entries: List<WatchHistoryEntity>,
    open: (AnimeSummary, Int?) -> Unit,
    resume: Boolean = true,
): TvShelf = TvShelf(
    title = title,
    cards = entries.map { entry ->
        val target = if (resume) playbackEpisode(entry) else entry.episode.coerceAtLeast(1)
        val anime = entry.asAnime()
        val caption = if (resume) "Episode $target" else null
        anime.toCard(title, if (resume) "Resume" else "Open", caption) { open(anime, if (resume) target else null) }
    },
)

private fun shelfFromAiring(
    slots: List<AiringSlot>,
    open: (AnimeSummary, Int?) -> Unit,
): TvShelf {
    val now = System.currentTimeMillis() / 1000L
    val clock = DateTimeFormatter.ofPattern("HH:mm")
    return TvShelf(
        title = "Airing today",
        cards = slots.take(18).map { slot ->
            val whenLabel = airingLabel(
                slot.airingAtEpochSec,
                now,
                clock.format(Instant.ofEpochSecond(slot.airingAtEpochSec).atZone(ZoneId.systemDefault())),
            )
            val caption = "Ep ${slot.episode} · $whenLabel"
            slot.anime.toCard("Airing today", "Open", caption) { open(slot.anime, null) }
        },
    )
}

private fun AnimeSummary.toCard(
    eyebrow: String,
    action: String,
    caption: String? = null,
    onClick: () -> Unit,
): TvCard {
    val blurb = description
        ?.let { plainSynopsis(it.replace(Regex("<[^>]+>"), " ")) }
        ?.take(180)
        ?.ifBlank { null }
        ?: genres.take(3).joinToString(" · ").ifBlank { null }
    return TvCard(
        key = "$eyebrow-$id-${caption.orEmpty()}",
        title = title,
        coverUrl = coverImageUrl,
        caption = caption ?: format,
        spot = TvSpot(
            title = title,
            artUrl = bannerImageUrl ?: coverImageUrl,
            eyebrow = eyebrow,
            meta = detailMeta(this, null),
            blurb = blurb,
            action = action,
        ),
        onClick = onClick,
    )
}

private fun WatchHistoryEntity.asAnime() = AnimeSummary(
    id = anilistId,
    title = title,
    coverImageUrl = coverImageUrl,
    episodes = null,
    format = null,
    averageScore = null,
    malId = malId,
)

private fun detailMeta(anime: AnimeSummary, episode: Int?): String = buildString {
    anime.format?.let { append(it) }
    anime.scoreLabel()?.let {
        if (isNotEmpty()) append("  ·  ")
        append(it)
    }
    anime.seasonLabel()?.let {
        if (isNotEmpty()) append("  ·  ")
        append(it)
    }
    anime.statusLabel()?.let {
        if (isNotEmpty()) append("  ·  ")
        append(it)
    }
    if (episode != null) {
        if (isNotEmpty()) append("  ·  ")
        append("Episode $episode")
    }
}

private fun playbackEpisode(entry: WatchHistoryEntity): Int {
    val stored = entry.episode.coerceAtLeast(1)
    val hasDuration = entry.durationMs > 30_000L
    val ratio = if (hasDuration) entry.positionMs.toFloat() / entry.durationMs.toFloat() else 0f
    val inProgress = hasDuration && entry.positionMs >= 15_000L && ratio < 0.9f
    return if (inProgress) stored else stored + 1
}
