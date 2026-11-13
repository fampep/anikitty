package site.anikitty.app.ui.tv

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.minutesLeft
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.player.PlayerScreen
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyPage
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText

private sealed class TvScreen {
    data object Home : TvScreen()
    data class Detail(val anime: AnimeSummary, val episode: Int) : TvScreen()
    data class Player(
        val anime: AnimeSummary,
        val episode: Int,
        val sources: List<PlayableSource>,
    ) : TvScreen()
}

/**
 * 10-foot AniKitty. Same black page, white type, and white accent as the phone.
 * A remote moves focus. Playback is the same on-device player.
 */
@Composable
fun TvApp(
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
) {
    val context = LocalContext.current
    val history by historyDao.observeAll().collectAsState(initial = emptyList())
    var screen by remember { mutableStateOf<TvScreen>(TvScreen.Home) }
    var trending by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var popular by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var seasonal by remember { mutableStateOf<List<AnimeSummary>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var reloadTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadTick) {
        loading = true
        error = null
        runCatching {
            trending = aniList.trending()
            popular = aniList.popular()
            seasonal = aniList.seasonal()
        }.onFailure { error = friendlyFailure(it.message) }
        loading = false
    }

    fun savedAudio(): String {
        return context.getSharedPreferences("anikitty_watch", android.content.Context.MODE_PRIVATE)
            .getString("audio", "sub")
            ?.takeIf { it == "dub" }
            ?: "sub"
    }

    fun openDetail(anime: AnimeSummary, episode: Int) {
        screen = TvScreen.Detail(anime, episode.coerceAtLeast(1))
    }

    when (val current = screen) {
        is TvScreen.Player -> {
            TvPlayer(
                anime = current.anime,
                episode = current.episode,
                sources = current.sources,
                historyDao = historyDao,
                aniListAuth = aniListAuth,
                aniListSync = aniListSync,
                streamServers = streamServers,
                audio = savedAudio(),
                onClose = { screen = TvScreen.Detail(current.anime, current.episode) },
                onPlay = { episode, sources ->
                    screen = TvScreen.Player(current.anime, episode, sources)
                },
            )
        }
        is TvScreen.Detail -> {
            TvDetail(
                anime = current.anime,
                startEpisode = current.episode,
                aniList = aniList,
                aniListAuth = aniListAuth,
                streamServers = streamServers,
                audio = savedAudio(),
                onBack = { screen = TvScreen.Home },
                onPlay = { episode, sources, resolved ->
                    screen = TvScreen.Player(resolved, episode, sources)
                },
            )
        }
        TvScreen.Home -> {
            TvHome(
                history = history,
                trending = trending,
                popular = popular,
                seasonal = seasonal,
                loading = loading,
                error = error,
                onRetry = { reloadTick++ },
                onOpen = { anime, episode -> openDetail(anime, episode) },
            )
        }
    }
}

@Composable
private fun TvHome(
    history: List<WatchHistoryEntity>,
    trending: List<AnimeSummary>,
    popular: List<AnimeSummary>,
    seasonal: List<AnimeSummary>,
    loading: Boolean,
    error: String?,
    onRetry: () -> Unit,
    onOpen: (AnimeSummary, Int) -> Unit,
) {
    val continueWatching = history.filter {
        val status = it.listStatus?.uppercase()
        status == null || status == "CURRENT" || status == "REPEATING"
    }.take(12)
    val hero = continueWatching.firstOrNull()
    val playFocus = remember { FocusRequester() }
    var askedFocus by remember { mutableStateOf(false) }

    LaunchedEffect(loading, hero?.anilistId, trending.firstOrNull()?.id) {
        if (loading || askedFocus) return@LaunchedEffect
        if (hero != null || trending.isNotEmpty()) {
            runCatching { playFocus.requestFocus() }
            askedFocus = true
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage),
    ) {
        LazyColumn(
            contentPadding = PaddingValues(start = 48.dp, end = 48.dp, top = 28.dp, bottom = 48.dp),
            verticalArrangement = Arrangement.spacedBy(22.dp),
        ) {
            item {
                Text(
                    "AniKitty",
                    color = KittyText,
                    fontWeight = FontWeight.Black,
                    fontSize = 34.sp,
                    letterSpacing = (-0.8).sp,
                )
                Text(
                    "On your TV · same library as the phone",
                    color = KittyMuted,
                    fontSize = 14.sp,
                    fontWeight = FontWeight.Medium,
                )
            }
            if (loading && trending.isEmpty()) {
                item {
                    CircularProgressIndicator(color = KittyAccent)
                }
            }
            if (error != null && trending.isEmpty()) {
                item {
                    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Text(error, color = KittyText, fontSize = 16.sp)
                        TvButton(label = "Try again", onClick = onRetry)
                    }
                }
            }
            hero?.let { entry ->
                item {
                    val episode = tvPlaybackTarget(entry)
                    val left = minutesLeft(entry.positionMs, entry.durationMs)
                    TvHero(
                        title = entry.title,
                        coverUrl = entry.coverImageUrl,
                        line = buildString {
                            append("Episode $episode")
                            if (left != null && episode == entry.episode) {
                                append(" · ")
                                append(left)
                                append(" min left")
                            }
                        },
                        action = if (episode == entry.episode && left != null) "Resume" else "Play",
                        actionFocus = playFocus,
                        onPlay = { onOpen(summaryFromHistory(entry), episode) },
                    )
                }
            }
            if (hero == null && trending.isNotEmpty()) {
                val first = trending.first()
                item {
                    TvHero(
                        title = first.title,
                        coverUrl = first.bannerImageUrl ?: first.coverImageUrl,
                        line = first.seasonLabel() ?: "Trending",
                        action = "Play",
                        actionFocus = playFocus,
                        onPlay = { onOpen(first, 1) },
                    )
                }
            }
            if (continueWatching.isNotEmpty()) {
                item {
                    TvRow(
                        title = "Continue watching",
                        items = continueWatching.map { entry ->
                            val episode = tvPlaybackTarget(entry)
                            TvCard(
                                key = "c-${entry.anilistId}",
                                title = entry.title,
                                coverUrl = entry.coverImageUrl,
                                subtitle = "Episode $episode",
                                onClick = { onOpen(summaryFromHistory(entry), episode) },
                            )
                        },
                    )
                }
            }
            if (trending.isNotEmpty()) {
                item {
                    TvRow(
                        title = "Trending",
                        items = trending.map { anime ->
                            TvCard(
                                key = "t-${anime.id}",
                                title = anime.title,
                                coverUrl = anime.coverImageUrl,
                                subtitle = anime.seasonLabel(),
                                onClick = { onOpen(anime, 1) },
                            )
                        },
                    )
                }
            }
            if (seasonal.isNotEmpty()) {
                item {
                    TvRow(
                        title = "Airing",
                        items = seasonal.map { anime ->
                            TvCard(
                                key = "s-${anime.id}",
                                title = anime.title,
                                coverUrl = anime.coverImageUrl,
                                subtitle = anime.statusLabel(),
                                onClick = { onOpen(anime, 1) },
                            )
                        },
                    )
                }
            }
            if (popular.isNotEmpty()) {
                item {
                    TvRow(
                        title = "Popular",
                        items = popular.map { anime ->
                            TvCard(
                                key = "p-${anime.id}",
                                title = anime.title,
                                coverUrl = anime.coverImageUrl,
                                subtitle = anime.averageScore?.let { "$it%" },
                                onClick = { onOpen(anime, 1) },
                            )
                        },
                    )
                }
            }
        }
    }
}

@Composable
private fun TvDetail(
    anime: AnimeSummary,
    startEpisode: Int,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    streamServers: ServerCatalog,
    audio: String,
    onBack: () -> Unit,
    onPlay: (episode: Int, sources: List<PlayableSource>, anime: AnimeSummary) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var detail by remember(anime.id) { mutableStateOf(anime) }
    var episode by remember(anime.id) { mutableIntStateOf(startEpisode.coerceAtLeast(1)) }
    var status by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    val playFocus = remember { FocusRequester() }

    LaunchedEffect(anime.id) {
        val full = runCatching { aniList.media(anime.id, aniListAuth.accessToken) }.getOrNull()
        if (full != null) detail = full
        runCatching { playFocus.requestFocus() }
    }

    val maxEp = detail.releasedEpisodeCount().takeIf { it > 0 } ?: episode.coerceAtLeast(1)

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyPage)
            .padding(horizontal = 48.dp, vertical = 28.dp),
    ) {
        Row(modifier = Modifier.fillMaxSize(), horizontalArrangement = Arrangement.spacedBy(28.dp)) {
            AsyncImage(
                model = detail.coverImageUrl,
                contentDescription = detail.title,
                modifier = Modifier
                    .width(220.dp)
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(18.dp))
                    .border(1.dp, KittyOutlineSoft, RoundedCornerShape(18.dp)),
                contentScale = ContentScale.Crop,
            )
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    detail.title,
                    color = KittyText,
                    fontWeight = FontWeight.Black,
                    fontSize = 32.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    letterSpacing = (-0.6).sp,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    listOfNotNull(
                        detail.seasonLabel(),
                        detail.statusLabel(),
                        detail.studios.firstOrNull(),
                    ).joinToString("  ·  "),
                    color = KittyMuted,
                    fontSize = 14.sp,
                )
                if (!detail.description.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(14.dp))
                    Text(
                        detail.description!!,
                        color = KittyMuted,
                        fontSize = 15.sp,
                        maxLines = 4,
                        overflow = TextOverflow.Ellipsis,
                        lineHeight = 22.sp,
                    )
                }
                Spacer(modifier = Modifier.height(22.dp))
                Text(
                    "Episode $episode of $maxEp",
                    color = KittyText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 16.sp,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    TvButton(
                        label = "Previous",
                        enabled = episode > 1 && !busy,
                        onClick = { if (episode > 1) episode -= 1 },
                    )
                    TvButton(
                        label = if (busy) "Getting stream…" else "Play",
                        enabled = !busy,
                        focusRequester = playFocus,
                        onClick = {
                            if (busy) return@TvButton
                            scope.launch {
                                busy = true
                                status = "Getting stream…"
                                runCatching {
                                    streamServers.resolveWithFailover(
                                        anilistId = detail.id,
                                        episode = episode,
                                        audio = audio,
                                        titleHint = detail.searchTitles().joinToString(" || "),
                                    )
                                }.onSuccess { resolved ->
                                    status = null
                                    onPlay(episode, resolved.sources, detail)
                                }.onFailure {
                                    status = friendlyFailure(it.message)
                                }
                                busy = false
                            }
                        },
                    )
                    TvButton(
                        label = "Next",
                        enabled = episode < maxEp && !busy,
                        onClick = { if (episode < maxEp) episode += 1 },
                    )
                    TvButton(label = "Back", enabled = !busy, onClick = onBack)
                }
                if (!status.isNullOrBlank()) {
                    Spacer(modifier = Modifier.height(12.dp))
                    Text(status!!, color = KittyMuted, fontSize = 14.sp)
                }
            }
        }
    }
}

@Composable
private fun TvPlayer(
    anime: AnimeSummary,
    episode: Int,
    sources: List<PlayableSource>,
    historyDao: WatchHistoryDao,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    streamServers: ServerCatalog,
    audio: String,
    onClose: () -> Unit,
    onPlay: (episode: Int, sources: List<PlayableSource>) -> Unit,
) {
    val scope = rememberCoroutineScope()
    var resumeMs by remember(anime.id, episode) { mutableLongStateOf(0L) }
    LaunchedEffect(anime.id, episode) {
        val entry = historyDao.get(anime.id)
        if (entry != null && entry.episode == episode && entry.positionMs > 2_000L) {
            resumeMs = entry.positionMs
        }
        if (aniListAuth.isLinked) {
            aniListSync.pushProgress(
                anilistId = anime.id,
                episode = episode,
                totalEpisodes = anime.episodes,
            )
        }
    }
    val released = anime.releasedEpisodeCount()
    val hasNext = released <= 0 || episode < released
    PlayerScreen(
        title = anime.title,
        episode = episode,
        sources = sources,
        anilistId = anime.id,
        titleHint = anime.searchTitles().joinToString(" || "),
        loadSkip = streamServers::anikotoSkipTimes,
        startPositionMs = resumeMs,
        onClose = onClose,
        onProgress = { pos, dur ->
            scope.launch {
                val existing = historyDao.get(anime.id)
                historyDao.upsert(
                    WatchHistoryEntity(
                        anilistId = anime.id,
                        title = anime.title,
                        coverImageUrl = anime.coverImageUrl ?: existing?.coverImageUrl,
                        episode = episode,
                        positionMs = pos,
                        durationMs = dur,
                        updatedAtEpochMs = System.currentTimeMillis(),
                        listStatus = existing?.listStatus ?: "CURRENT",
                        malId = anime.malId ?: existing?.malId,
                    ),
                )
            }
        },
        onNextEpisode = if (!hasNext) {
            null
        } else {
            {
                scope.launch {
                    val next = episode + 1
                    runCatching {
                        streamServers.resolveWithFailover(
                            anilistId = anime.id,
                            episode = next,
                            audio = audio,
                            titleHint = anime.searchTitles().joinToString(" || "),
                        )
                    }.onSuccess { resolved ->
                        val existing = historyDao.get(anime.id)
                        historyDao.upsert(
                            WatchHistoryEntity(
                                anilistId = anime.id,
                                title = anime.title,
                                coverImageUrl = anime.coverImageUrl ?: existing?.coverImageUrl,
                                episode = next,
                                positionMs = 0L,
                                durationMs = 0L,
                                updatedAtEpochMs = System.currentTimeMillis(),
                                listStatus = existing?.listStatus ?: "CURRENT",
                                malId = anime.malId ?: existing?.malId,
                            ),
                        )
                        if (aniListAuth.isLinked) {
                            aniListSync.pushProgress(
                                anilistId = anime.id,
                                episode = next,
                                totalEpisodes = anime.episodes,
                            )
                        }
                        onPlay(next, resolved.sources)
                    }
                }
            }
        },
    )
}

@Composable
private fun TvHero(
    title: String,
    coverUrl: String?,
    line: String,
    action: String,
    actionFocus: FocusRequester,
    onPlay: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(220.dp)
            .clip(RoundedCornerShape(20.dp))
            .background(KittySurface)
            .border(1.dp, KittyOutlineSoft, RoundedCornerShape(20.dp)),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = coverUrl,
            contentDescription = title,
            modifier = Modifier
                .width(360.dp)
                .fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 28.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            Text(
                title,
                color = KittyText,
                fontWeight = FontWeight.Black,
                fontSize = 28.sp,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                letterSpacing = (-0.5).sp,
            )
            Text(line, color = KittyMuted, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            TvButton(label = action, onClick = onPlay, focusRequester = actionFocus)
        }
    }
}

private data class TvCard(
    val key: String,
    val title: String,
    val coverUrl: String?,
    val subtitle: String?,
    val onClick: () -> Unit,
)

@Composable
private fun TvRow(title: String, items: List<TvCard>) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        Text(title, color = KittyText, fontWeight = FontWeight.Bold, fontSize = 18.sp)
        LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
            items(items, key = { it.key }) { card ->
                TvPoster(card)
            }
        }
    }
}

@Composable
private fun TvPoster(card: TvCard) {
    var focused by remember { mutableStateOf(false) }
    Column(
        modifier = Modifier
            .width(150.dp)
            .onFocusChanged { focused = it.hasFocus }
            .clip(RoundedCornerShape(16.dp))
            .background(KittySurface)
            .border(
                width = if (focused) 2.dp else 1.dp,
                color = if (focused) KittyAccent else KittyOutlineSoft,
                shape = RoundedCornerShape(16.dp),
            )
            .clickable(onClick = card.onClick)
            .padding(6.dp),
    ) {
        AsyncImage(
            model = card.coverUrl,
            contentDescription = card.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(12.dp)),
            contentScale = ContentScale.Crop,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            card.title,
            color = if (focused) KittyText else KittyMuted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        if (!card.subtitle.isNullOrBlank()) {
            Text(
                card.subtitle,
                color = KittyFaint,
                fontSize = 11.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

@Composable
private fun TvButton(
    label: String,
    onClick: () -> Unit,
    enabled: Boolean = true,
    focusRequester: FocusRequester? = null,
) {
    var focused by remember { mutableStateOf(false) }
    val shape = RoundedCornerShape(999.dp)
    Text(
        label,
        color = if (focused || !enabled) KittyOnAccent else KittyText,
        fontWeight = FontWeight.Bold,
        fontSize = 15.sp,
        modifier = Modifier
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { focused = it.hasFocus }
            .clip(shape)
            .background(if (focused) KittyAccent else KittySurface)
            .border(1.dp, if (focused) KittyAccent else KittyOutlineSoft, shape)
            .clickable(enabled = enabled, onClick = onClick)
            .padding(horizontal = 18.dp, vertical = 10.dp),
    )
}

private fun tvPlaybackTarget(entry: WatchHistoryEntity): Int {
    val stored = entry.episode.coerceAtLeast(1)
    val hasDuration = entry.durationMs > 30_000L
    val ratio = if (hasDuration) entry.positionMs.toFloat() / entry.durationMs.toFloat() else 0f
    val inProgress = hasDuration && entry.positionMs >= 15_000L && ratio < 0.9f
    return if (inProgress) stored else stored + 1
}

private fun summaryFromHistory(entry: WatchHistoryEntity): AnimeSummary {
    return AnimeSummary(
        id = entry.anilistId,
        title = entry.title,
        coverImageUrl = entry.coverImageUrl,
        episodes = null,
        format = null,
        averageScore = null,
        malId = entry.malId,
    )
}
