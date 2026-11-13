package site.anikitty.app.ui.app

import androidx.compose.animation.Crossfade
import androidx.compose.animation.core.animateDpAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.background
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListState
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.platform.LocalClipboardManager
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.AnnotatedString
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import site.anikitty.app.data.airingLabel
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeEpisodeItem
import site.anikitty.app.data.anilist.AnimePerson
import site.anikitty.app.data.anilist.AnimeRelation
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.local.touchFromCatalog
import site.anikitty.app.data.plainSynopsis
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyPage
import java.time.Instant
import java.time.LocalDate
import java.time.LocalTime
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
    val progress: Float = 0f,
)

private data class TvShelf(val title: String, val cards: List<TvCard>)

/** Sizes matched to a 960×540dp television canvas: small posters, a short hero, a thin menu. */
private val PosterWidth = 88.dp
private val PosterHeight = 132.dp
private val StillWidth = 180.dp
private val StillHeight = 100.dp
private val SafeX = 44.dp
private val HeroCopyHeight = 208.dp

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
    homeLayout: HomeLayoutStore,
) {
    var artUrl by remember { mutableStateOf<String?>(null) }
    var browsing by remember { mutableStateOf(false) }
    val cinematic = tab == "home" || tab == "search" || tab == "history" || tab == "schedule"
    val menuOpen = !browsing || !cinematic
    val topPad by animateDpAsState(if (menuOpen) 68.dp else 12.dp, tween(220), label = "tvTop")
    val showMenu = { browsing = false }
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
                            0f to Color.Black.copy(alpha = 0.90f),
                            0.28f to Color.Black.copy(alpha = 0.55f),
                            0.62f to Color.Transparent,
                        ),
                    ),
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Black.copy(alpha = 0.20f),
                            0.38f to Color.Transparent,
                            0.72f to Color.Black.copy(alpha = 0.78f),
                            1f to Color.Black,
                        ),
                    ),
            )
        }
        Column(modifier = Modifier.fillMaxSize().padding(top = topPad)) {
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
                        homeLayout = homeLayout,
                    )
                    "search" -> TvSearch(
                        aniList = aniList,
                        historyDao = historyDao,
                        requestedGenre = requestedGenre,
                        onRequestedGenreConsumed = onRequestedGenreConsumed,
                        onOpen = onOpen,
                        onArt = { artUrl = it },
                        onBrowsing = { browsing = true },
                        onShowMenu = showMenu,
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
                        onShowMenu = showMenu,
                    )
                    "schedule" -> TvSchedule(
                        aniList = aniList,
                        historyDao = historyDao,
                        onOpen = onOpen,
                        onArt = { artUrl = it },
                        onBrowsing = { browsing = true },
                        onShowMenu = showMenu,
                    )
                    "store" -> store()
                    else -> account()
                }
            }
        }
        TvMenu(
            modifier = Modifier.align(Alignment.TopCenter),
            selected = tab,
            dimmed = !menuOpen,
            onSelect = {
                browsing = false
                onTab(it)
            },
            onMenuFocus = showMenu,
        )
    }
}

@Composable
private fun TvMenu(
    selected: String,
    dimmed: Boolean,
    onSelect: (String) -> Unit,
    onMenuFocus: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val requesters = remember { List(TvTabs.size) { FocusRequester() } }
    var clock by remember { mutableStateOf(LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))) }
    LaunchedEffect(Unit) {
        while (true) {
            clock = LocalTime.now().format(DateTimeFormatter.ofPattern("HH:mm"))
            delay(30_000)
        }
    }
    LaunchedEffect(Unit) {
        val index = TvTabs.indexOfFirst { it.first == selected }.coerceAtLeast(0)
        delay(48)
        runCatching { requesters[index].requestFocus() }
    }
    val shift by animateFloatAsState(if (dimmed) 1f else 0f, tween(220), label = "menuShift")
    Row(
        modifier = modifier
            .fillMaxWidth()
            .graphicsLayer {
                translationY = -size.height * shift
                alpha = 1f - shift
            }
            .padding(start = SafeX, end = SafeX, top = 20.dp)
            .height(36.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "AniKitty",
            color = Color(0xFFEDEDED),
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
        )
        Spacer(modifier = Modifier.width(18.dp))
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
        Spacer(modifier = Modifier.weight(1f))
        Text(
            clock,
            color = Color(0xFFEDEDED).copy(alpha = 0.7f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 14.sp,
        )
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
    homeLayout: HomeLayoutStore,
) {
    val scope = rememberCoroutineScope()
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var airing by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    var favourites by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var forYou by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var forYouFrom by remember { mutableStateOf<String?>(null) }

    LaunchedEffect(attempt, aniListAuth.accessToken) {
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
                val saved = async {
                    val token = aniListAuth.accessToken
                    if (token.isNullOrBlank()) {
                        emptyList()
                    } else {
                        runCatching { aniList.favourites(token) }.getOrDefault(emptyList())
                    }
                }
                trending = trend.await()
                popular = pop.await()
                seasonal = season.await()
                airing = today.await()
                favourites = saved.await()
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

    val nowSec = System.currentTimeMillis() / 1000L
    val startingSoon = airing.filter { slot ->
        val delta = slot.airingAtEpochSec - nowSec
        delta in -20 * 60..3 * 60 * 60
    }
    val laterToday = airing.filter { it !in startingSoon }
    val planning = history.filter { it.listStatus.equals("PLANNING", ignoreCase = true) }.take(16)
    val shelvesById = buildMap {
        if (continueWatching.isNotEmpty()) {
            put("continue", shelfFromHistory("Continue watching", continueWatching, ::open))
        }
        if (startingSoon.isNotEmpty()) put("starting", shelfFromAiring(startingSoon, ::open, "Starting soon"))
        if (laterToday.isNotEmpty()) put("airing", shelfFromAiring(laterToday, ::open, "Airing today"))
        if (trending.isNotEmpty()) put("trending", shelfFromAnime("Trending", trending, ::open))
        if (forYou.isNotEmpty()) {
            put("foryou", shelfFromAnime(forYouFrom?.let { "Because you watch $it" } ?: "For you", forYou, ::open))
        }
        if (favourites.isNotEmpty()) put("favourites", shelfFromAnime("Favourites", favourites, ::open))
        if (planning.isNotEmpty()) put("plan", shelfFromHistory("Plan to watch", planning, ::open, resume = false))
        if (popular.isNotEmpty()) put("popular", shelfFromAnime("Popular", popular, ::open))
        if (seasonal.isNotEmpty()) put("season", shelfFromAnime("This season", seasonal, ::open))
    }
    val shelves = homeLayout.sections(HomeSurface.Television).mapNotNull { section ->
        if (!section.enabled) null else shelvesById[section.id]
    }

    when {
        loading && shelves.isEmpty() -> TvMessage("Loading the catalog…", busy = true)
        error != null && shelves.isEmpty() -> TvMessage(
            error ?: "Couldn’t load the catalog",
            actionLabel = "Try again",
            onAction = { attempt++ },
        )
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
    onShowMenu: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    var query by remember { mutableStateOf("") }
    var genre by remember { mutableStateOf<String?>(requestedGenre) }
    var results by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var busy by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf<String?>(null) }
    val genres = listOf(
        "Action", "Adventure", "Comedy", "Drama", "Fantasy", "Romance", "Slice of Life",
        "Sports", "Supernatural", "Mystery", "Sci-Fi", "Horror", "Mecha", "Music",
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
                textStyle = TextStyle(color = Color.White, fontSize = 18.sp, fontWeight = FontWeight.Medium),
                cursorBrush = SolidColor(Color.White),
                modifier = Modifier
                    .weight(1f)
                    .onFocusChanged {
                        fieldFocused = it.isFocused
                        if (it.isFocused) onShowMenu()
                    }
                    .clip(RoundedCornerShape(8.dp))
                    .background(Color.Black.copy(alpha = 0.55f))
                    .border(
                        if (fieldFocused) 2.dp else 1.dp,
                        if (fieldFocused) Color.White else Color.White.copy(alpha = 0.18f),
                        RoundedCornerShape(8.dp),
                    )
                    .padding(horizontal = 16.dp, vertical = 10.dp),
                decorationBox = { inner ->
                    Box {
                        if (query.isEmpty()) {
                            Text("Search titles", color = Color.White.copy(alpha = 0.55f), fontSize = 18.sp)
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
                TvPill(
                    label = name,
                    filled = genre == name && query.isBlank(),
                    onClick = {
                        query = ""
                        genre = if (genre == name) null else name
                    },
                    onFocused = onShowMenu,
                )
            }
            if (query.isNotBlank() || !genre.isNullOrBlank()) {
                item {
                    TvPill(
                        label = "Clear",
                        onClick = {
                            query = ""
                            genre = null
                        },
                        onFocused = onShowMenu,
                    )
                }
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
    onShowMenu: () -> Unit,
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
    var picked by remember(filter) { mutableStateOf(filter.ifBlank { "all" }) }
    val shelves = when (picked) {
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
    val filters = listOf(
        "all" to "All" to history.size,
        "watching" to "Watching" to watching.size,
        "plan" to "Plan" to planning.size,
        "paused" to "Paused" to paused.size,
        "done" to "Done" to done.size,
        "dropped" to "Dropped" to dropped.size,
        "favourites" to "Favourites" to favourites.size,
    )
    Column(modifier = Modifier.fillMaxSize()) {
        LazyRow(
            contentPadding = PaddingValues(horizontal = SafeX),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            items(filters, key = { it.first.first }) { (pair, count) ->
                val (id, label) = pair
                TvPill(
                    label = "$label $count",
                    filled = picked == id || (id == "all" && picked.isBlank()),
                    onClick = { picked = id },
                    onFocused = onShowMenu,
                )
            }
        }
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            if (shelves.isEmpty()) {
                TvMessage(
                    if (picked == "favourites" && !aniListAuth.isLinked) {
                        "Sign in to see favourites"
                    } else {
                        "Nothing in this list yet"
                    },
                )
            } else {
                TvSkyline(shelves = shelves, onArt = onArt, onBrowsing = onBrowsing, empty = "Nothing in this list yet")
            }
        }
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
                fontSize = 32.sp,
                lineHeight = 36.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            if (shown.meta.isNotBlank()) {
                Spacer(modifier = Modifier.height(6.dp))
                Row(
                    modifier = Modifier.horizontalScroll(rememberScrollState()),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                ) {
                    shown.meta.split("  ·  ").map { it.trim() }.filter { it.isNotEmpty() }.take(4).forEach { chip ->
                        TvFact(chip)
                    }
                }
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
            TvPill(
                label = shown.action,
                filled = true,
                onClick = action,
                leadingPlay = shown.action.startsWith("Resume") || shown.action.startsWith("Play"),
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        LazyColumn(
            modifier = Modifier.weight(1f),
            contentPadding = PaddingValues(bottom = 24.dp),
            verticalArrangement = Arrangement.spacedBy(18.dp),
        ) {
            items(shelves, key = { it.title }) { shelf ->
                if (shelf.cards.isEmpty()) return@items
                val rowState = remember(shelf.title) { LazyListState() }
                val rowScope = rememberCoroutineScope()
                Row(
                    modifier = Modifier.padding(start = SafeX, end = SafeX, bottom = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        shelf.title,
                        color = Color(0xFFEDEDED),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                    )
                    Spacer(modifier = Modifier.width(8.dp))
                    Text(
                        "${shelf.cards.size}",
                        color = Color.White.copy(alpha = 0.5f),
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
                LazyRow(
                    state = rowState,
                    contentPadding = PaddingValues(horizontal = SafeX, vertical = 6.dp),
                    horizontalArrangement = Arrangement.spacedBy(12.dp),
                ) {
                    itemsIndexed(shelf.cards, key = { _, card -> card.key }) { index, card ->
                        TvPoster(card) {
                            onBrowsing()
                            spot = card.spot
                            action = card.onClick
                            rowScope.launch { rowState.animateScrollToItem(index) }
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
    val scale by animateFloatAsState(if (focused) 1.06f else 1f, tween(160), label = "poster")
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
                if (focused) Color.White else Color.Transparent,
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
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .background(Color.Black.copy(alpha = 0.62f))
                    .padding(
                        start = 4.dp,
                        end = 4.dp,
                        top = 2.dp,
                        bottom = if (card.progress > 0.02f) 6.dp else 2.dp,
                    ),
            )
        }
        if (card.progress > 0.02f) {
            Box(
                modifier = Modifier
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(Color.White.copy(alpha = 0.22f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth(card.progress.coerceIn(0f, 1f))
                        .height(3.dp)
                        .background(Color.White),
                )
            }
        }
    }
}

@Composable
private fun TvPill(
    label: String,
    onClick: () -> Unit,
    filled: Boolean = false,
    leadingPlay: Boolean = false,
    focusRequester: FocusRequester? = null,
    onFocused: () -> Unit = {},
) {
    var focused by remember { mutableStateOf(false) }
    val showFill = filled || focused
    val shape = RoundedCornerShape(8.dp)
    Row(
        modifier = Modifier
            .height(30.dp)
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged {
                focused = it.isFocused
                if (it.isFocused) onFocused()
            }
            .clip(shape)
            .background(if (showFill) Color(0xFFEDEDED) else Color.White.copy(alpha = 0.12f))
            .border(if (focused) 2.dp else 0.dp, Color.White, shape)
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
private fun TvMessage(
    text: String,
    busy: Boolean = false,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(48.dp),
        verticalArrangement = Arrangement.Center,
    ) {
        if (busy) {
            CircularProgressIndicator(color = Color.White, strokeWidth = 2.dp)
            Spacer(modifier = Modifier.height(16.dp))
        }
        Text(text, color = Color.White, fontSize = 22.sp, fontWeight = FontWeight.Medium)
        if (actionLabel != null && onAction != null) {
            Spacer(modifier = Modifier.height(16.dp))
            TvPill(label = actionLabel, filled = true, onClick = onAction)
        }
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
    listScore: Int,
    lastWatchedEp: Int,
    detailLoading: Boolean,
    sourceName: String?,
    favourite: Boolean,
    signedIn: Boolean,
    episodes: List<AnimeEpisodeItem>,
    onBack: () -> Unit,
    onPlay: () -> Unit,
    onEpisode: (Int) -> Unit,
    onAudio: (String) -> Unit,
    onFavourite: () -> Unit,
    onListStatus: (String) -> Unit,
    onScore: (Int) -> Unit,
    onOpenGenre: (String) -> Unit,
    onChangeSource: () -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
) {
    val context = LocalContext.current
    val clipboard = LocalClipboardManager.current
    var synopsisOpen by remember(detail.id) { mutableStateOf(false) }
    var note by remember(detail.id) { mutableStateOf<String?>(null) }
    val scroll = rememberScrollState()
    val maxEp = episodes.maxOfOrNull { it.number }?.coerceAtLeast(1) ?: 1
    val pageSize = 100
    val rangeCount = ((maxEp + pageSize - 1) / pageSize).coerceAtLeast(1)
    var browseRange by remember(detail.id) { mutableIntStateOf(0) }
    LaunchedEffect(detail.id, episode, rangeCount) {
        browseRange = ((episode - 1) / pageSize).coerceIn(0, (rangeCount - 1).coerceAtLeast(0))
    }
    val rangeStart = browseRange * pageSize + 1
    val rangeEnd = minOf(maxEp, rangeStart + pageSize - 1)
    val visibleEpisodes = episodes.filter { it.number in rangeStart..rangeEnd }
    val movie = detail.format.equals("MOVIE", ignoreCase = true)
    val shownCount = detail.releasedEpisodeCount().takeIf { it > 0 }
        ?: maxEp.takeIf {
            detail.detailLoaded && (detail.streamingEpisodes.isNotEmpty() || maxEp > 1)
        }
    val watchedCount = maxOf(detail.listState?.progress ?: 0, (lastWatchedEp - 1).coerceAtLeast(0))
    val synopsis = detail.description?.let { plainSynopsis(it.replace(Regex("<[^>]+>"), " ")) }
    val art = detail.bannerImageUrl ?: detail.coverImageUrl
    val nowSec = System.currentTimeMillis() / 1000L
    val clock = DateTimeFormatter.ofPattern("EEE, MMM d · HH:mm")
    val facts = buildList {
        detail.format?.let { add(it) }
        detail.statusLabel()?.let { add(it) }
        detail.scoreLabel()?.let { add("Score $it") }
        detail.seasonLabel()?.let { add(it) }
        if (movie) add("${detail.durationMinutes ?: "--"} min") else shownCount?.let { add("$it episodes") }
        if (!movie && (detail.durationMinutes ?: 0) > 0) add("${detail.durationMinutes} min each")
        detail.studios.takeIf { it.isNotEmpty() }?.joinToString(" · ")?.let { add(it) }
        detail.popularity?.let { add("%,d on AniList".format(it)) }
        detail.nextAiring?.let { next ->
            val whenLabel = clock.format(
                java.time.Instant.ofEpochSecond(next.airingAtEpochSec).atZone(java.time.ZoneId.systemDefault()),
            )
            val relative = airingLabel(next.airingAtEpochSec, nowSec, whenLabel)
            add(if (relative == whenLabel) "Ep ${next.episode} · $whenLabel" else "Ep ${next.episode} · $relative")
        }
        tvListLabel(listStatus)?.let { add(it) }
        if (listScore > 0) add("Your score ${listScore / 10}/10")
        if (lastWatchedEp > 0) add("Last watched $lastWatchedEp")
    }
    val selectedTitle = episodes.firstOrNull { it.number == episode }?.title
        ?.takeIf { it.isNotBlank() && !it.equals("Episode $episode", ignoreCase = true) }
    val banner = status ?: note

    fun openUrl(url: String) {
        val opened = runCatching {
            context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        }.isSuccess
        if (!opened) note = "Couldn't open that link"
    }

    fun openRelation(rel: AnimeRelation) {
        onOpenRelated(
            AnimeSummary(
                id = rel.id,
                title = rel.title,
                coverImageUrl = rel.coverImageUrl,
                episodes = rel.episodes,
                format = rel.format,
                averageScore = null,
                season = rel.season,
                seasonYear = rel.seasonYear,
            ),
        )
    }

    Box(modifier = Modifier.fillMaxSize().background(KittyPage)) {
        Column(modifier = Modifier.fillMaxSize().verticalScroll(scroll)) {
            Box(modifier = Modifier.fillMaxWidth().height(220.dp)) {
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
                            0.42f to Color.Black.copy(alpha = 0.72f),
                            1f to Color.Black.copy(alpha = 0.28f),
                        ),
                    ),
                )
                Box(
                    modifier = Modifier.fillMaxSize().background(
                        Brush.verticalGradient(
                            0.55f to Color.Transparent,
                            1f to KittyPage,
                        ),
                    ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = SafeX, end = SafeX, bottom = 12.dp),
                ) {
                    TvPill(label = "Back", onClick = onBack)
                    Spacer(modifier = Modifier.height(8.dp))
                    Text(
                        detail.title,
                        color = Color(0xFFEDEDED),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 28.sp,
                        lineHeight = 32.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (facts.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            items(facts) { fact ->
                                TvFact(fact)
                            }
                        }
                    }
                }
            }
            Column(
                modifier = Modifier.padding(start = SafeX, end = SafeX, top = 8.dp, bottom = 28.dp),
            ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                val playFocus = remember(detail.id) { FocusRequester() }
                LaunchedEffect(detail.id) {
                    delay(80)
                    runCatching { playFocus.requestFocus() }
                }
                TvPill(
                    label = if (resolving) "Getting stream…" else "Play episode $episode",
                    filled = true,
                    leadingPlay = !resolving,
                    onClick = { if (!resolving) onPlay() },
                    focusRequester = playFocus,
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
                    listOf(
                        "CURRENT" to "Watching",
                        "PLANNING" to "Plan",
                        "PAUSED" to "Paused",
                        "COMPLETED" to "Completed",
                        "DROPPED" to "Dropped",
                    ).forEach { (id, label) ->
                        TvPill(
                            label = label,
                            filled = listStatus.equals(id, ignoreCase = true),
                            onClick = { onListStatus(id) },
                        )
                    }
                }
                Spacer(modifier = Modifier.height(8.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    TvFact("Score")
                    (1..10).forEach { point ->
                        TvPill(
                            label = point.toString(),
                            filled = listScore / 10 == point,
                            onClick = { onScore(point) },
                        )
                    }
                }
            }
            if (detail.genres.isNotEmpty()) {
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(detail.genres.take(8)) { genre ->
                        TvPill(label = genre, onClick = { onOpenGenre(genre) })
                    }
                }
            }
            if (detailLoading) {
                Spacer(modifier = Modifier.height(8.dp))
                Text("Loading AniList…", color = Color.White.copy(alpha = 0.6f), fontSize = 13.sp)
            }
            if (shownCount != null && shownCount > 0 && watchedCount > 0) {
                val fraction = (watchedCount.toFloat() / shownCount.toFloat()).coerceIn(0f, 1f)
                Spacer(modifier = Modifier.height(12.dp))
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Text("Your progress", color = Color(0xFFEDEDED), fontWeight = FontWeight.SemiBold, fontSize = 14.sp)
                    Text("$watchedCount of $shownCount", color = Color.White.copy(alpha = 0.7f), fontSize = 13.sp)
                }
                Spacer(modifier = Modifier.height(6.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(4.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color.White.copy(alpha = 0.18f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(fraction)
                            .height(4.dp)
                            .background(Color.White),
                    )
                }
            }
            if (!synopsis.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(12.dp))
                TvHeading("Synopsis")
                Text(
                    synopsis,
                    color = Color(0xFFEDEDED).copy(alpha = 0.78f),
                    fontSize = 14.sp,
                    lineHeight = 18.sp,
                    maxLines = if (synopsisOpen) 40 else 3,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(6.dp))
                TvPill(
                    label = if (synopsisOpen) "Show less" else "Read more",
                    onClick = { synopsisOpen = !synopsisOpen },
                )
            }
            detail.trailer?.watchUrl()?.let { watch ->
                Spacer(modifier = Modifier.height(12.dp))
                TvHeading("Trailer")
                TvPill(
                    label = "Play trailer · ${detail.trailer?.site?.replaceFirstChar { it.titlecase() } ?: "Video"}",
                    leadingPlay = true,
                    onClick = { openUrl(watch) },
                )
            }
            Spacer(modifier = Modifier.height(12.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                item { TvPill(label = "AniList", onClick = { openUrl("https://anilist.co/anime/${detail.id}") }) }
                item {
                    TvPill(label = "Copy title", onClick = {
                        clipboard.setText(AnnotatedString(detail.title))
                        note = "Title copied"
                    })
                }
                item {
                    TvPill(label = "Share", onClick = {
                        val send = Intent(Intent.ACTION_SEND).apply {
                            type = "text/plain"
                            putExtra(Intent.EXTRA_TEXT, "${detail.title}\nhttps://anilist.co/anime/${detail.id}")
                        }
                        val opened = runCatching {
                            context.startActivity(Intent.createChooser(send, detail.title))
                        }.isSuccess
                        if (!opened) note = "Couldn't share that"
                    })
                }
                detail.malId?.let { mal ->
                    item { TvPill(label = "MyAnimeList", onClick = { openUrl("https://myanimelist.net/anime/$mal") }) }
                }
                items(
                    detail.externalLinks.filter { it.site !in setOf("AniList", "MyAnimeList") }.take(4),
                    key = { it.url },
                ) { link ->
                    TvPill(label = link.site, onClick = { openUrl(link.url) })
                }
            }
            Spacer(modifier = Modifier.height(12.dp))
            TvHeading("Stream source")
            Text(
                "Play tries this first, then the other installed providers.",
                color = Color.White.copy(alpha = 0.6f),
                fontSize = 13.sp,
            )
            Spacer(modifier = Modifier.height(6.dp))
            TvPill(label = sourceName ?: "No source", onClick = onChangeSource)
            if (!banner.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(8.dp))
                Text(banner, color = Color.White.copy(alpha = 0.8f), fontSize = 13.sp)
            }
            Spacer(modifier = Modifier.height(14.dp))
            TvHeading("Episodes · $maxEp")
            if (selectedTitle != null) {
                Text(
                    "Ep $episode · $selectedTitle",
                    color = Color.White.copy(alpha = 0.75f),
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(6.dp))
            }
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                TvPill(label = "Previous", onClick = { if (episode > 1) onEpisode(episode - 1) })
                TvPill(label = "Next", onClick = { if (episode < maxEp) onEpisode(episode + 1) })
                TvPill(label = "Latest", filled = episode == maxEp, onClick = { onEpisode(maxEp) })
            }
            if (rangeCount > 1) {
                Spacer(modifier = Modifier.height(8.dp))
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(rangeCount) { index ->
                        val start = index * pageSize + 1
                        val end = minOf(maxEp, start + pageSize - 1)
                        TvPill(
                            label = "$start–$end",
                            filled = browseRange == index,
                            onClick = { browseRange = index },
                        )
                    }
                }
            }
            val seasons = detail.seasonEntries()
            if (seasons.size > 1) {
                Spacer(modifier = Modifier.height(8.dp))
                TvHeading("Seasons")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(seasons, key = { it.id }) { season ->
                        val label = buildString {
                            append(
                                season.seasonLabel()
                                    ?: if (season.relationType.equals("Current", true)) "This season" else season.relationType,
                            )
                            season.episodes?.let { append(" · $it ep") }
                        }
                        TvPill(
                            label = label,
                            filled = season.id == detail.id,
                            onClick = { if (season.id != detail.id) openRelation(season) },
                        )
                    }
                }
            }
            Spacer(modifier = Modifier.height(8.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                items(visibleEpisodes, key = { it.number }) { item ->
                    val selected = item.number == episode
                    val watched = watchedCount > 0 && item.number <= watchedCount
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
                                if (focused || selected) 2.dp else 0.dp,
                                Color.White.copy(alpha = if (focused) 0.90f else 0.45f),
                                shape,
                            )
                            .clickable { onEpisode(item.number) },
                        contentAlignment = Alignment.Center,
                    ) {
                        if (!item.thumbnailUrl.isNullOrBlank()) {
                            AsyncImage(
                                model = item.thumbnailUrl,
                                contentDescription = "Episode ${item.number}",
                                modifier = Modifier.fillMaxSize().graphicsLayer { alpha = if (watched && !selected) 0.45f else 1f },
                                contentScale = ContentScale.Crop,
                            )
                        }
                        Text(
                            if (watched && !selected) "Watched ${item.number}" else "Episode ${item.number}",
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
            val relatedExtras = detail.relatedOutsideSeasons()
            if (relatedExtras.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                TvHeading("Related")
                LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    items(relatedExtras, key = { it.id }) { rel ->
                        TvPoster(
                            TvCard(
                                key = "rel-${rel.id}",
                                title = rel.title,
                                coverUrl = rel.coverImageUrl,
                                caption = rel.relationType,
                                spot = TvSpot(
                                    title = rel.title,
                                    artUrl = rel.coverImageUrl,
                                    eyebrow = rel.relationType,
                                    meta = rel.seasonLabel().orEmpty(),
                                    blurb = null,
                                    action = "Open",
                                ),
                                onClick = { openRelation(rel) },
                            ),
                        ) {}
                    }
                }
            }
            if (detail.characters.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                TvPeopleRail("Characters", detail.characters)
            }
            if (detail.staff.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                TvPeopleRail("Staff", detail.staff)
            }
            val related = detail.recommendations
            if (related.isNotEmpty()) {
                Spacer(modifier = Modifier.height(16.dp))
                TvHeading("More like this")
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
}

@Composable
private fun TvHeading(text: String) {
    Text(
        text,
        color = Color(0xFFEDEDED),
        fontWeight = FontWeight.SemiBold,
        fontSize = 16.sp,
    )
    Spacer(modifier = Modifier.height(8.dp))
}

@Composable
private fun TvFact(label: String) {
    Text(
        label,
        color = Color(0xFFEDEDED),
        fontSize = 12.sp,
        fontWeight = FontWeight.SemiBold,
        maxLines = 1,
        overflow = TextOverflow.Ellipsis,
        modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color.White.copy(alpha = 0.12f))
            .padding(horizontal = 8.dp, vertical = 3.dp),
    )
}

@Composable
private fun TvPeopleRail(title: String, people: List<AnimePerson>) {
    TvHeading(title)
    LazyRow(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
        items(people, key = { "${it.id}-${it.role}" }) { person ->
            var focused by remember(person.id, person.role) { mutableStateOf(false) }
                Column(
                    modifier = Modifier
                        .width(96.dp)
                        .onFocusChanged { focused = it.isFocused }
                        .focusable(),
                ) {
                AsyncImage(
                    model = person.imageUrl,
                    contentDescription = person.name,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape)
                        .background(Color.White.copy(alpha = 0.08f))
                        .border(
                            if (focused) 2.dp else 0.dp,
                            Color.White.copy(alpha = 0.70f),
                            CircleShape,
                        ),
                    contentScale = ContentScale.Crop,
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    person.name,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                person.role?.let { role ->
                    Text(
                        role,
                        color = Color.White.copy(alpha = 0.65f),
                        fontSize = 11.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

private fun tvListLabel(status: String?): String? = when (status?.uppercase()) {
    "CURRENT" -> "Watching"
    "PLANNING" -> "Plan to watch"
    "PAUSED" -> "Paused"
    "COMPLETED" -> "Completed"
    "DROPPED" -> "Dropped"
    "REPEATING" -> "Rewatching"
    else -> null
}

@Composable
private fun TvSchedule(
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    onOpen: (AnimeSummary, Int?) -> Unit,
    onArt: (String?) -> Unit,
    onBrowsing: () -> Unit,
    onShowMenu: () -> Unit,
) {
    val zone = ZoneId.systemDefault()
    val today = remember { LocalDate.now(zone) }
    val days = remember { (0 until 5).map { today.plusDays(it.toLong()) } }
    var selected by remember { mutableIntStateOf(0) }
    var slots by remember { mutableStateOf<List<List<AiringSlot>>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var attempt by remember { mutableIntStateOf(0) }
    val scope = rememberCoroutineScope()
    val dayFormat = remember { DateTimeFormatter.ofPattern("EEE d") }
    val fullFormat = remember { DateTimeFormatter.ofPattern("EEEE") }
    LaunchedEffect(attempt) {
        loading = true
        error = null
        runCatching {
            coroutineScope {
                days.map { day ->
                    async {
                        val from = day.atStartOfDay(zone).toEpochSecond()
                        val to = day.plusDays(1).atStartOfDay(zone).toEpochSecond()
                        aniList.airingSchedule(from, to)
                    }
                }.awaitAll()
            }
        }.onSuccess { slots = it }
            .onFailure { error = friendlyFailure(it.message) }
        loading = false
    }
    fun open(anime: AnimeSummary, episode: Int?) {
        scope.launch { historyDao.touchFromCatalog(anime) }
        onOpen(anime, episode)
    }
    Column(modifier = Modifier.fillMaxSize()) {
        Row(
            modifier = Modifier
                .padding(horizontal = SafeX)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            days.forEachIndexed { index, day ->
                val label = when (index) {
                    0 -> "Today"
                    1 -> "Tomorrow"
                    else -> day.format(dayFormat)
                }
                TvPill(
                    label = label,
                    filled = selected == index,
                    onClick = { selected = index },
                    onFocused = onShowMenu,
                )
            }
        }
        Spacer(modifier = Modifier.height(8.dp))
        Box(modifier = Modifier.weight(1f).fillMaxWidth()) {
            val daySlots = slots.getOrNull(selected).orEmpty()
            val title = when (selected) {
                0 -> "Airing today"
                1 -> "Airing tomorrow"
                else -> days[selected].format(fullFormat)
            }
            when {
                loading && slots.isEmpty() -> TvMessage("Loading the schedule…", busy = true)
                error != null && daySlots.isEmpty() -> TvMessage(
                    error ?: "Couldn’t load the schedule",
                    actionLabel = "Try again",
                    onAction = { attempt++ },
                )
                daySlots.isEmpty() -> TvMessage("Nothing airing")
                else -> TvSkyline(
                    shelves = listOf(shelfFromAiring(daySlots, ::open, title, limit = 40)),
                    onArt = onArt,
                    onBrowsing = onBrowsing,
                    empty = "Nothing airing",
                )
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
        val stored = entry.episode.coerceAtLeast(1)
        val hasDuration = entry.durationMs > 30_000L
        val ratio = if (hasDuration) entry.positionMs.toFloat() / entry.durationMs.toFloat() else 0f
        val inProgress = resume && hasDuration && entry.positionMs >= 15_000L && ratio < 0.9f
        val target = if (inProgress) stored else if (resume) stored + 1 else stored
        val anime = entry.asAnime()
        val caption = when {
            !resume -> null
            inProgress -> "Ep $target · ${(ratio * 100).toInt()}%"
            else -> "Episode $target"
        }
        val action = when {
            inProgress -> "Resume Ep $target"
            resume -> "Play Ep $target"
            else -> "Open"
        }
        anime.toCard(title, action, caption, if (inProgress) ratio.coerceIn(0f, 1f) else 0f) {
            open(anime, if (resume) target else null)
        }
    },
)

private fun shelfFromAiring(
    slots: List<AiringSlot>,
    open: (AnimeSummary, Int?) -> Unit,
    title: String = "Airing today",
    limit: Int = 18,
): TvShelf {
    val now = System.currentTimeMillis() / 1000L
    val clock = DateTimeFormatter.ofPattern("HH:mm")
    return TvShelf(
        title = title,
        cards = slots.take(limit).map { slot ->
            val whenLabel = airingLabel(
                slot.airingAtEpochSec,
                now,
                clock.format(Instant.ofEpochSecond(slot.airingAtEpochSec).atZone(ZoneId.systemDefault())),
            )
            val caption = "Ep ${slot.episode} · $whenLabel"
            slot.anime.toCard(title, "Open", caption) { open(slot.anime, null) }
        },
    )
}

private fun AnimeSummary.toCard(
    eyebrow: String,
    action: String,
    caption: String? = null,
    progress: Float = 0f,
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
        progress = progress,
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
