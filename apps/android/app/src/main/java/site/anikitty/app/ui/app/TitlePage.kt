// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import android.content.Intent
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
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
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.BookmarkBorder
import androidx.compose.material.icons.outlined.Extension
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.rounded.Bookmark
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.derivedStateOf
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.nestedscroll.nestedScroll
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.data.anilist.AnimePerson
import site.anikitty.app.data.anilist.AnimeRelation
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.anilist.MediaRank
import site.anikitty.app.data.tmdb.TitleArt
import site.anikitty.app.data.tmdb.TmdbCatalog
import site.anikitty.app.data.tmdb.preferEpisodeTitle
import site.anikitty.app.data.tmdb.preferStill
import site.anikitty.app.data.servers.StreamServer
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.anikitty.app.ui.components.EpisodeCarousel
import site.anikitty.app.ui.components.EpisodeSlide
import site.anikitty.app.ui.components.HeroBanner
import site.anikitty.app.ui.components.rememberDockScroll
import site.anikitty.app.ui.components.KittyBadge
import site.anikitty.app.ui.components.KittyBottomSheet
import site.anikitty.app.ui.components.KittyChip
import site.anikitty.app.ui.components.KittyImage
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.components.QualityMarks
import site.anikitty.app.ui.components.sharedPoster
import site.anikitty.app.ui.theme.KittyRadius
import site.anikitty.app.ui.theme.KittySpace
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.ShimmerBox
import site.anikitty.app.ui.theme.prefersReducedMotion

@Composable
internal fun TitleStage(
    detail: AnimeSummary,
    posterModifier: Modifier,
    detailLoading: Boolean,
    episode: Int,
    maxEp: Int,
    audio: String,
    onAudio: (String) -> Unit,
    resumeEpisode: Int,
    resumeAtMs: Long,
    resumeDurationMs: Long,
    lastWatchedEp: Int,
    watchedThrough: Int,
    resolving: Boolean,
    status: String?,
    listStatus: String?,
    listScore: Int,
    favourite: Boolean,
    canEditList: Boolean,
    activeServer: StreamServer?,
    episodeSlides: List<EpisodeSlide>,
    rangeCount: Int,
    browseRange: Int,
    episodePageSize: Int,
    seasonTabs: List<AnimeRelation>,
    epJump: String,
    onEpJump: (String) -> Unit,
    onJumpCommit: () -> Unit,
    onBrowseRange: (Int) -> Unit,
    onPickEpisode: (Int) -> Unit,
    onToggleWatched: (Int) -> Unit,
    onPlay: () -> Unit,
    onBack: () -> Unit,
    onMyList: () -> Unit,
    onListStatus: (String) -> Unit,
    onScore: (Int) -> Unit,
    onShare: () -> Unit,
    onTrailer: (() -> Unit)?,
    onSources: () -> Unit,
    onOpenUrl: (String) -> Unit,
    onOpenRelated: (AnimeSummary) -> Unit,
    onOpenRelation: (AnimeRelation) -> Unit,
    onOpenGenre: (String) -> Unit,
) {
    val palette = LocalKittyPalette.current
    val reduced = prefersReducedMotion()
    val context = LocalContext.current
    val tmdb = remember { TmdbCatalog(context) }
    var art by remember(detail.id) { mutableStateOf<TitleArt?>(null) }
    LaunchedEffect(detail.id, detail.title, detail.seasonYear, detail.format, detail.detailLoaded) {
        art = withContext(Dispatchers.IO) { tmdb.load(detail) }
    }
    val slides = remember(episodeSlides, art) {
        val episodes = art?.episodes.orEmpty()
        if (episodes.isEmpty()) {
            episodeSlides
        } else {
            episodeSlides.map { slide ->
                val episodeArt = episodes[slide.number]
                slide.copy(
                    title = preferEpisodeTitle(slide.title, slide.number, episodeArt?.title),
                    imageUrl = preferStill(slide.imageUrl, episodeArt?.stillUrl),
                    airLabel = episodeArt?.airLabel ?: slide.airLabel,
                )
            }
        }
    }
    val cast = remember(detail.characters, art) {
        detail.characters.map { person ->
            val photo = tmdb.photoFor(person, art)
            if (photo == person.imageUrl) person else person.copy(imageUrl = photo)
        }
    }
    val synopsis = detail.description?.trim()?.takeIf { it.isNotEmpty() } ?: art?.overview
    val trailerClick = onTrailer ?: art?.youtubeId?.let { id ->
        { onOpenUrl("https://www.youtube.com/watch?v=$id") }
    }
    val listState = rememberLazyListState()
    val stuck by remember {
        derivedStateOf {
            listState.firstVisibleItemIndex > 0 || listState.firstVisibleItemScrollOffset > 120
        }
    }
    val movie = detail.format.equals("MOVIE", true)
    val total = detail.releasedEpisodeCount().takeIf { it > 0 } ?: maxEp
    val seriesFraction = if (total > 0 && watchedThrough > 0) {
        (watchedThrough.toFloat() / total.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val episodeFraction = if (
        resumeEpisode == episode &&
        resumeDurationMs > 0L &&
        resumeAtMs > 0L
    ) {
        (resumeAtMs.toFloat() / resumeDurationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val playLabel = if (resumeEpisode == episode && resumeAtMs > 2_000L) {
        val totalSec = resumeAtMs / 1000L
        "Resume  ${totalSec / 60}:${(totalSec % 60).toString().padStart(2, '0')}"
    } else if (movie) {
        "Play"
    } else {
        "Play  episode $episode"
    }
    var person by remember { mutableStateOf<Pair<AnimePerson, String>?>(null) }
    val related = remember(detail) { detail.relatedOutsideSeasons() }

    BoxWithConstraints(modifier = Modifier.fillMaxSize().background(palette.page)) {
        val heroHeight = maxHeight
        LazyColumn(
            state = listState,
            modifier = Modifier.nestedScroll(rememberDockScroll()),
            contentPadding = PaddingValues(bottom = 120.dp),
        ) {
            item(key = "hero", contentType = "hero") {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(heroHeight)
                        .clipToBounds(),
                ) {
                    val localArt = detail.bannerImageUrl?.startsWith("android.resource://") == true ||
                        detail.coverImageUrl?.startsWith("android.resource://") == true
                    HeroBanner(
                        anilistId = detail.id,
                        bannerUrl = if (localArt) detail.coverImageUrl else detail.bannerImageUrl,
                        coverUrl = detail.coverImageUrl,
                        contentDescription = detail.title,
                        contentScale = ContentScale.Crop,
                        alignment = if (localArt) Alignment.TopCenter else Alignment.Center,
                        title = detail.title,
                        year = detail.seasonYear,
                        movie = movie,
                        modifier = posterModifier
                            .fillMaxSize()
                            .graphicsLayer {
                                val drift = if (reduced || listState.firstVisibleItemIndex > 0) {
                                    0f
                                } else {
                                    listState.firstVisibleItemScrollOffset * 0.35f
                                }
                                translationY = drift
                                val scale = if (localArt || reduced) 1f else 1.08f
                                scaleX = scale
                                scaleY = scale
                            },
                    )
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    0f to Color.Black.copy(alpha = 0.28f),
                                    0.18f to Color.Black.copy(alpha = 0.05f),
                                    0.46f to Color.Black.copy(alpha = 0.42f),
                                    0.68f to Color.Black.copy(alpha = 0.82f),
                                    1f to Color.Black.copy(alpha = 0.96f),
                                ),
                            ),
                    )
                    Column(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = KittySpace.md)
                            .padding(bottom = 108.dp),
                    ) {
                        val logo = art?.logoUrl
                        if (logo != null) {
                            AsyncImage(
                                model = logo,
                                contentDescription = detail.title,
                                contentScale = ContentScale.Fit,
                                alignment = Alignment.CenterStart,
                                modifier = Modifier
                                    .fillMaxWidth(0.78f)
                                    .height(72.dp),
                            )
                        } else {
                            Text(
                                detail.title,
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 34.sp,
                                lineHeight = 38.sp,
                                letterSpacing = (-0.8).sp,
                                maxLines = 3,
                                overflow = TextOverflow.Ellipsis,
                                style = TextStyle(
                                    shadow = Shadow(Color.Black, Offset(0f, 2f), 18f),
                                ),
                            )
                        }
                        val alt = listOfNotNull(detail.romajiTitle, detail.nativeTitle)
                            .distinct()
                            .joinToString("  ·  ")
                        if (alt.isNotBlank()) {
                            Text(
                                alt,
                                color = Color.White.copy(alpha = 0.62f),
                                fontSize = 13.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis,
                                modifier = Modifier.padding(top = 4.dp),
                            )
                        }
                        Spacer(Modifier.height(KittySpace.sm))
                        MetaLine(detail, movie, total, art)
                        val marks = art?.networks?.filter { !it.logoUrl.isNullOrBlank() }.orEmpty()
                        if (marks.isNotEmpty()) {
                            Spacer(Modifier.height(KittySpace.sm))
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(KittySpace.md),
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                marks.forEach { mark ->
                                    AsyncImage(
                                        model = mark.logoUrl,
                                        contentDescription = mark.name,
                                        contentScale = ContentScale.Fit,
                                        modifier = Modifier.height(22.dp),
                                    )
                                }
                            }
                        }
                        if (detail.genres.isNotEmpty()) {
                            Spacer(Modifier.height(KittySpace.sm))
                            Row(
                                modifier = Modifier.horizontalScroll(rememberScrollState()),
                                horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
                            ) {
                                detail.genres.take(8).forEach { genre ->
                                    OnDarkChip(label = genre, onClick = { onOpenGenre(genre) })
                                }
                            }
                        }
                        detail.nextAiring?.let { next ->
                            Spacer(Modifier.height(KittySpace.sm))
                            KittyBadge(
                                label = "Episode ${next.episode}  ·  ${airCountdown(next.airingAtEpochSec)}",
                                onDark = true,
                            )
                        }
                        Spacer(Modifier.height(KittySpace.md))
                        PlayButton(
                            label = playLabel,
                            busy = resolving,
                            fraction = if (episodeFraction > 0f) episodeFraction else seriesFraction,
                            onClick = onPlay,
                        )
                        if (watchedThrough > 0 && total > 0) {
                            Text(
                                "$watchedThrough of $total watched",
                                color = Color.White.copy(alpha = 0.72f),
                                fontSize = 12.sp,
                                modifier = Modifier.padding(top = 6.dp),
                            )
                        }
                        Spacer(Modifier.height(KittySpace.sm))
                        Row(horizontalArrangement = Arrangement.spacedBy(KittySpace.sm)) {
                            TitleAction(
                                icon = if (listStatus != null || favourite) Icons.Rounded.Bookmark else Icons.Outlined.BookmarkBorder,
                                label = if (listStatus != null) listBadge(listStatus) else "My List",
                                onClick = onMyList,
                                modifier = Modifier.weight(1f),
                            )
                            TitleAction(
                                icon = Icons.Outlined.Share,
                                label = "Share",
                                onClick = onShare,
                                modifier = Modifier.weight(1f),
                            )
                            if (trailerClick != null) {
                                TitleAction(
                                    icon = Icons.Rounded.PlayArrow,
                                    label = "Trailer",
                                    onClick = trailerClick,
                                    modifier = Modifier.weight(1f),
                                )
                            }
                            TitleAction(
                                icon = Icons.Outlined.Extension,
                                label = "Sources",
                                onClick = onSources,
                                modifier = Modifier.weight(1f),
                            )
                        }
                    }
                }
            }
            item(key = "actions", contentType = "actions") {
                Column(
                    modifier = Modifier.padding(
                        horizontal = KittySpace.md,
                        vertical = KittySpace.md,
                    ),
                ) {
                    if (canEditList) {
                        Spacer(Modifier.height(KittySpace.sm))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
                        ) {
                            listOf(
                                "CURRENT" to "Watching",
                                "PLANNING" to "Plan",
                                "PAUSED" to "Paused",
                                "COMPLETED" to "Done",
                                "DROPPED" to "Dropped",
                            ).forEach { (value, label) ->
                                KittyChip(
                                    label = label,
                                    selected = listStatus.equals(value, ignoreCase = true),
                                    onClick = { onListStatus(value) },
                                )
                            }
                        }
                        Spacer(Modifier.height(KittySpace.sm))
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(6.dp),
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                if (listScore > 0) "Your score ${listScore / 10}" else "Your score",
                                color = palette.muted,
                                fontSize = 12.sp,
                            )
                            (1..10).forEach { point ->
                                KittyChip(
                                    label = point.toString(),
                                    selected = listScore / 10 == point,
                                    onClick = { onScore(point) },
                                )
                            }
                        }
                    }
                    if (status != null) {
                        Text(
                            status,
                            color = palette.muted,
                            fontSize = 12.sp,
                            modifier = Modifier.padding(top = KittySpace.sm),
                        )
                    }
                }
            }
            item(key = "synopsis", contentType = "copy") {
                if (detailLoading && detail.description.isNullOrBlank()) {
                    Column(Modifier.padding(KittySpace.md)) {
                        repeat(3) {
                            ShimmerBox(
                                Modifier
                                    .padding(bottom = 8.dp)
                                    .fillMaxWidth(if (it == 2) 0.55f else 1f)
                                    .height(14.dp)
                                    .clip(RoundedCornerShape(4.dp)),
                            )
                        }
                    }
                } else if (!synopsis.isNullOrBlank()) {
                    Synopsis(synopsis)
                }
            }
            item(key = "episodes", contentType = "episodes") {
                if (detailLoading && episodeSlides.size <= 1 && detail.streamingEpisodes.isEmpty()) {
                    Column(Modifier.padding(horizontal = KittySpace.md)) {
                        ShimmerBox(
                            Modifier
                                .fillMaxWidth()
                                .height(96.dp)
                                .clip(RoundedCornerShape(KittyRadius.sm)),
                        )
                    }
                } else {
                    EpisodeBlock(
                        detail = detail,
                        episode = episode,
                        maxEp = maxEp,
                        audio = audio,
                        onAudio = onAudio,
                        slides = slides,
                        watchedThrough = watchedThrough,
                        episodeFraction = episodeFraction,
                        rangeCount = rangeCount,
                        browseRange = browseRange,
                        episodePageSize = episodePageSize,
                        seasonTabs = seasonTabs,
                        epJump = epJump,
                        onEpJump = onEpJump,
                        onJumpCommit = onJumpCommit,
                        onBrowseRange = onBrowseRange,
                        onPickEpisode = onPickEpisode,
                        onToggleWatched = onToggleWatched,
                        onOpenRelation = onOpenRelation,
                        activeServer = activeServer,
                    )
                }
            }
            if (!detailLoading && cast.isNotEmpty()) {
                item(key = "cast", contentType = "people") {
                    PeopleRow("Cast", cast) { person = it to "character" }
                }
            }
            if (!detailLoading && detail.staff.isNotEmpty()) {
                item(key = "staff", contentType = "people") {
                    PeopleRow("Staff", detail.staff) { person = it to "staff" }
                }
            }
            if (related.isNotEmpty()) {
                item(key = "related", contentType = "posters") {
                    PosterLane(
                        title = "Related",
                        cards = related.map { rel ->
                            LaneCard(rel.id, rel.title, rel.coverImageUrl, rel.relationType.uppercase()) {
                                onOpenRelation(rel)
                            }
                        },
                    )
                }
            }
            val picks = detail.recommendations.filter { it.id != detail.id }
            if (picks.isNotEmpty()) {
                item(key = "recs", contentType = "posters") {
                    PosterLane(
                        title = "Recommended",
                        cards = picks.map { rec ->
                            LaneCard(rec.id, rec.title, rec.coverImageUrl, rec.seasonLabel()) {
                                onOpenRelated(rec)
                            }
                        },
                    )
                }
            }
            if (
                detail.scoreDistribution.isNotEmpty() ||
                detail.rankings.isNotEmpty() ||
                (detail.popularity ?: 0) > 0
            ) {
                item(key = "stats", contentType = "stats") {
                    StatsBlock(detail)
                }
            }
            item(key = "links", contentType = "links") {
                LinkRow(detail, onOpenUrl)
            }
        }

        AnimatedVisibility(
            visible = stuck,
            enter = if (reduced) fadeIn(tween(0)) else fadeIn(tween(180)),
            exit = if (reduced) fadeOut(tween(0)) else fadeOut(tween(140)),
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(palette.page.copy(alpha = 0.94f))
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(horizontal = 8.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                HeaderIcon(onBack, "Back")
                Text(
                    detail.title,
                    color = palette.text,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier
                        .weight(1f)
                        .padding(horizontal = 8.dp),
                )
                HeaderIcon(onPlay, "Play")
            }
        }
        if (!stuck) {
            HeaderIcon(
                onClick = onBack,
                description = "Back",
                modifier = Modifier
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(KittySpace.md),
            )
        }
    }

    person?.let { (who, kind) ->
        KittyBottomSheet(title = who.name, onDismiss = { person = null }) {
            Row(verticalAlignment = Alignment.CenterVertically) {
                KittyImage(
                    url = who.imageUrl,
                    contentDescription = who.name,
                    widthPx = 240,
                    heightPx = 240,
                    modifier = Modifier
                        .size(72.dp)
                        .clip(CircleShape),
                )
                Column(Modifier.padding(start = KittySpace.md)) {
                    who.role?.let { role ->
                        Text(role, color = palette.muted, fontSize = 13.sp)
                    }
                    Text(
                        if (kind == "staff") "Staff" else "Voice cast",
                        color = palette.text,
                        fontWeight = FontWeight.Medium,
                        modifier = Modifier.padding(top = 4.dp),
                    )
                }
            }
            Spacer(Modifier.height(KittySpace.md))
            KittyChip(
                label = "AniList",
                selected = false,
                onClick = {
                    val path = if (kind == "staff") "staff" else "character"
                    onOpenUrl("https://anilist.co/$path/${who.id}")
                    person = null
                },
            )
        }
    }
}

@Composable
private fun MetaLine(detail: AnimeSummary, movie: Boolean, total: Int, art: TitleArt?) {
    val season = detail.season?.lowercase()?.replaceFirstChar { it.titlecase() }
    val runtime = detail.durationMinutes ?: art?.runtimeMinutes
    val bits = listOfNotNull(
        art?.rating,
        detail.seasonYear?.toString(),
        season,
        formatName(detail.format),
        if (movie) runtime?.let { "$it min" } else "$total eps",
        if (!movie) runtime?.let { "$it min" } else null,
        detail.studios.firstOrNull(),
        detail.scoreLabel()?.let { "★ $it" },
    )
    if (bits.isEmpty()) return
    Text(
        bits.joinToString("   "),
        color = Color.White.copy(alpha = 0.82f),
        fontSize = 13.sp,
        maxLines = 1,
        softWrap = false,
        modifier = Modifier.horizontalScroll(rememberScrollState()),
    )
    QualityMarks(
        badge = site.anikitty.app.data.servers.SourceBadgeCache.title(
            LocalContext.current,
            detail.id,
        ),
        onDark = true,
        modifier = Modifier.padding(top = 8.dp),
    )
}

@Composable
private fun PlayButton(
    label: String,
    busy: Boolean,
    fraction: Float,
    onClick: () -> Unit,
) {
    val palette = LocalKittyPalette.current
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(KittyRadius.lg))
            .background(palette.accent)
            .spacePress(onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .height(52.dp),
            contentAlignment = Alignment.Center,
        ) {
            if (busy) {
                CircularProgressIndicator(
                    modifier = Modifier.size(22.dp),
                    strokeWidth = 2.dp,
                    color = palette.onAccent,
                )
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, tint = palette.onAccent)
                    Spacer(Modifier.width(6.dp))
                    Text(
                        label,
                        color = palette.onAccent,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 16.sp,
                    )
                }
            }
        }
        if (fraction > 0f) {
            Box(
                Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .background(palette.onAccent.copy(alpha = 0.18f)),
            ) {
                Box(
                    Modifier
                        .fillMaxWidth(fraction.coerceIn(0.04f, 1f))
                        .height(3.dp)
                        .background(palette.onAccent),
                )
            }
        }
    }
}

@Composable
private fun TitleAction(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val palette = LocalKittyPalette.current
    Column(
        modifier = modifier
            .clip(RoundedCornerShape(KittyRadius.md))
            .background(palette.surface)
            .spacePress(onClick)
            .padding(vertical = 10.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Icon(icon, contentDescription = label, tint = palette.text, modifier = Modifier.size(18.dp))
        Text(
            label,
            color = palette.text,
            fontSize = 11.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            modifier = Modifier.padding(top = 4.dp),
        )
    }
}

@Composable
private fun Synopsis(text: String) {
    var open by remember(text) { mutableStateOf(false) }
    val palette = LocalKittyPalette.current
    Column(Modifier.padding(horizontal = KittySpace.md, vertical = KittySpace.md)) {
        KittySectionHeading(title = "Synopsis", padded = false)
        Spacer(Modifier.height(KittySpace.sm))
        Text(
            text,
            color = palette.text.copy(alpha = 0.78f),
            fontSize = 15.sp,
            lineHeight = 22.sp,
            maxLines = if (open) 40 else 4,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            if (open) "Show less" else "More",
            color = palette.text,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            modifier = Modifier
                .padding(top = 8.dp)
                .spacePress { open = !open },
        )
    }
}

@Composable
private fun EpisodeBlock(
    detail: AnimeSummary,
    episode: Int,
    maxEp: Int,
    audio: String,
    onAudio: (String) -> Unit,
    slides: List<EpisodeSlide>,
    watchedThrough: Int,
    episodeFraction: Float,
    rangeCount: Int,
    browseRange: Int,
    episodePageSize: Int,
    seasonTabs: List<AnimeRelation>,
    epJump: String,
    onEpJump: (String) -> Unit,
    onJumpCommit: () -> Unit,
    onBrowseRange: (Int) -> Unit,
    onPickEpisode: (Int) -> Unit,
    onToggleWatched: (Int) -> Unit,
    onOpenRelation: (AnimeRelation) -> Unit,
    activeServer: StreamServer?,
) {
    val palette = LocalKittyPalette.current
    Column {
        Row(
            modifier = Modifier.padding(horizontal = KittySpace.md),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            KittySectionHeading(title = "Episodes", subtitle = "$maxEp", padded = false)
        }
        if (seasonTabs.size > 1) {
            Spacer(Modifier.height(KittySpace.sm))
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = KittySpace.md),
                horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
            ) {
                seasonTabs.forEach { season ->
                    val label = season.seasonLabel()
                        ?: if (season.relationType.equals("Current", true)) "This season" else season.relationType
                    KittyChip(
                        label = label,
                        selected = season.id == detail.id,
                        onClick = { if (season.id != detail.id) onOpenRelation(season) },
                    )
                }
            }
        }
        if (rangeCount > 1) {
            Spacer(Modifier.height(KittySpace.sm))
            Row(
                modifier = Modifier
                    .horizontalScroll(rememberScrollState())
                    .padding(horizontal = KittySpace.md),
                horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
            ) {
                for (index in 0 until rangeCount) {
                    val start = index * episodePageSize + 1
                    val end = minOf(maxEp, start + episodePageSize - 1)
                    KittyChip(
                        label = "$start–$end",
                        selected = browseRange == index,
                        onClick = { onBrowseRange(index) },
                    )
                }
            }
        }
        Spacer(Modifier.height(KittySpace.sm))
        Row(
            modifier = Modifier
                .padding(horizontal = KittySpace.md)
                .horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            listOf("sub" to "Sub", "dub" to "Dub").forEach { (key, label) ->
                KittyChip(label = label, selected = audio == key, onClick = { onAudio(key) })
            }
            JumpField(epJump, onEpJump, onJumpCommit)
            KittyChip(label = "Go", selected = false, onClick = onJumpCommit)
            if (episode < maxEp) {
                KittyChip(label = "Next", selected = false, onClick = { onPickEpisode(episode + 1) })
            }
        }
        activeServer?.let { server ->
            Text(
                server.name,
                color = palette.muted,
                fontSize = 12.sp,
                modifier = Modifier.padding(start = KittySpace.md, top = 8.dp),
            )
        }
        Spacer(Modifier.height(KittySpace.sm))
        EpisodeCarousel(
            slides = slides,
            current = episode,
            watchedThrough = watchedThrough,
            currentProgress = episodeFraction,
            fallbackArt = detail.bannerImageUrl ?: detail.coverImageUrl,
            onPick = onPickEpisode,
            anilistId = detail.id,
            onToggleWatched = onToggleWatched,
        )
    }
}

@Composable
private fun JumpField(value: String, onValue: (String) -> Unit, onGo: () -> Unit) {
    val palette = LocalKittyPalette.current
    BasicTextField(
        value = value,
        onValueChange = { next -> if (next.all { it.isDigit() }) onValue(next) },
        textStyle = TextStyle(color = palette.text, fontSize = 13.sp),
        keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number, imeAction = ImeAction.Go),
        keyboardActions = KeyboardActions(onGo = { onGo() }),
        singleLine = true,
        modifier = Modifier
            .width(72.dp)
            .clip(RoundedCornerShape(KittyRadius.pill))
            .background(palette.surface)
            .padding(horizontal = 12.dp, vertical = 8.dp),
        decorationBox = { inner ->
            if (value.isEmpty()) Text("Ep", color = palette.muted, fontSize = 13.sp)
            inner()
        },
    )
}

private data class LaneCard(
    val id: Int,
    val title: String,
    val image: String?,
    val caption: String?,
    val onClick: () -> Unit,
)

@Composable
private fun PosterLane(title: String, cards: List<LaneCard>) {
    val palette = LocalKittyPalette.current
    Column(Modifier.padding(top = KittySpace.lg)) {
        KittySectionHeading(
            title = title,
            padded = false,
            modifier = Modifier.padding(horizontal = KittySpace.md),
        )
        Spacer(Modifier.height(KittySpace.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = KittySpace.md),
            horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
        ) {
            items(cards, key = { it.id }, contentType = { "poster" }) { card ->
                Column(
                    modifier = Modifier
                        .width(104.dp)
                        .spacePress(card.onClick),
                ) {
                    KittyImage(
                        url = card.image,
                        contentDescription = card.title,
                        widthPx = 320,
                        heightPx = 480,
                        modifier = Modifier
                            .sharedPoster(card.id)
                            .fillMaxWidth()
                            .aspectRatio(2f / 3f)
                            .clip(RoundedCornerShape(KittyRadius.sm)),
                    )
                    card.caption?.let {
                        Text(
                            it,
                            color = palette.muted,
                            fontSize = 10.sp,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            modifier = Modifier.padding(top = 6.dp),
                        )
                    }
                    Text(
                        card.title,
                        color = palette.text,
                        fontSize = 12.sp,
                        fontWeight = FontWeight.Medium,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

@Composable
private fun PeopleRow(title: String, people: List<AnimePerson>, onOpen: (AnimePerson) -> Unit) {
    val palette = LocalKittyPalette.current
    Column(Modifier.padding(top = KittySpace.lg)) {
        KittySectionHeading(
            title = title,
            padded = false,
            modifier = Modifier.padding(horizontal = KittySpace.md),
        )
        Spacer(Modifier.height(KittySpace.sm))
        LazyRow(
            contentPadding = PaddingValues(horizontal = KittySpace.md),
            horizontalArrangement = Arrangement.spacedBy(KittySpace.md),
        ) {
            items(people, key = { "${it.id}-${it.role}" }, contentType = { "person" }) { person ->
                Column(
                    modifier = Modifier
                        .width(84.dp)
                        .spacePress { onOpen(person) },
                ) {
                    KittyImage(
                        url = person.imageUrl,
                        contentDescription = person.name,
                        widthPx = 200,
                        heightPx = 200,
                        modifier = Modifier
                            .size(72.dp)
                            .clip(CircleShape),
                    )
                    Text(
                        person.name,
                        color = palette.text,
                        fontWeight = FontWeight.Medium,
                        fontSize = 12.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier.padding(top = 6.dp),
                    )
                    person.role?.let { role ->
                        Text(role, color = palette.muted, fontSize = 11.sp, maxLines = 1)
                    }
                }
            }
        }
    }
}

@Composable
private fun StatsBlock(detail: AnimeSummary) {
    val palette = LocalKittyPalette.current
    val max = detail.scoreDistribution.maxOfOrNull { it.amount }?.coerceAtLeast(1) ?: 1
    Column(Modifier.padding(horizontal = KittySpace.md, vertical = KittySpace.lg)) {
        KittySectionHeading(title = "Stats", padded = false)
        Spacer(Modifier.height(KittySpace.sm))
        Row(horizontalArrangement = Arrangement.spacedBy(KittySpace.lg)) {
            detail.scoreLabel()?.let { score ->
                StatFigure(score, "Score")
            }
            detail.popularity?.takeIf { it > 0 }?.let { StatFigure(compactCount(it), "Popularity") }
            detail.favourites?.takeIf { it > 0 }?.let { StatFigure(compactCount(it), "Favorites") }
        }
        if (detail.rankings.isNotEmpty()) {
            Spacer(Modifier.height(KittySpace.sm))
            detail.rankings.take(4).forEach { rank ->
                Text(
                    rank.line(),
                    color = palette.text,
                    fontSize = 13.sp,
                    modifier = Modifier.padding(top = 4.dp),
                )
            }
        }
        if (detail.scoreDistribution.isNotEmpty()) {
            Spacer(Modifier.height(KittySpace.md))
            detail.scoreDistribution.forEach { bucket ->
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text(
                        "${bucket.score}",
                        color = palette.muted,
                        fontSize = 11.sp,
                        modifier = Modifier.width(28.dp),
                    )
                    Box(
                        Modifier
                            .weight(1f)
                            .height(6.dp)
                            .clip(RoundedCornerShape(KittyRadius.pill))
                            .background(palette.text.copy(alpha = 0.08f)),
                    ) {
                        Box(
                            Modifier
                                .fillMaxWidth(bucket.amount.toFloat() / max)
                                .height(6.dp)
                                .background(palette.text),
                        )
                    }
                }
                Spacer(Modifier.height(4.dp))
            }
        }
    }
}

@Composable
private fun StatFigure(value: String, label: String) {
    val palette = LocalKittyPalette.current
    Column {
        Text(value, color = palette.text, fontWeight = FontWeight.SemiBold, fontSize = 22.sp)
        Text(label, color = palette.muted, fontSize = 12.sp)
    }
}

@Composable
private fun LinkRow(detail: AnimeSummary, onOpenUrl: (String) -> Unit) {
    Row(
        modifier = Modifier
            .padding(horizontal = KittySpace.md, vertical = KittySpace.lg)
            .horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(KittySpace.sm),
    ) {
        KittyChip(label = "AniList", selected = false, onClick = {
            onOpenUrl("https://anilist.co/anime/${detail.id}")
        })
        detail.malId?.let { mal ->
            KittyChip(label = "MyAnimeList", selected = false, onClick = {
                onOpenUrl("https://myanimelist.net/anime/$mal")
            })
        }
        detail.externalLinks
            .filter { it.site !in setOf("AniList", "MyAnimeList") }
            .take(4)
            .forEach { link ->
                KittyChip(label = link.site, selected = false, onClick = { onOpenUrl(link.url) })
            }
    }
}

@Composable
private fun OnDarkChip(label: String, onClick: () -> Unit) {
    val shape = RoundedCornerShape(KittyRadius.pill)
    Text(
        label,
        color = Color.White,
        fontWeight = FontWeight.Medium,
        fontSize = 12.sp,
        modifier = Modifier
            .clip(shape)
            .background(Color.White.copy(alpha = 0.16f))
            .border(0.5.dp, Color.White.copy(alpha = 0.35f), shape)
            .spacePress(onClick)
            .padding(horizontal = 12.dp, vertical = 6.dp),
    )
}

@Composable
private fun HeaderIcon(
    onClick: () -> Unit,
    description: String,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .size(36.dp)
            .clip(CircleShape)
            .background(Color.Black.copy(alpha = 0.45f))
            .spacePress(onClick),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            if (description == "Play") Icons.Filled.PlayArrow else Icons.AutoMirrored.Rounded.ArrowBack,
            contentDescription = description,
            tint = Color.White,
            modifier = Modifier.size(20.dp),
        )
    }
}

private fun formatName(format: String?): String? = when (format?.uppercase()) {
    null, "" -> null
    "TV_SHORT" -> "TV Short"
    "MOVIE" -> "Movie"
    else -> format
}

private fun listBadge(status: String?): String = when (status?.uppercase()) {
    "CURRENT" -> "Watching"
    "PLANNING" -> "Plan"
    "COMPLETED" -> "Done"
    "PAUSED" -> "Paused"
    "DROPPED" -> "Dropped"
    "REPEATING" -> "Rewatch"
    else -> "My List"
}

private fun airCountdown(epochSec: Long): String {
    val left = (epochSec - System.currentTimeMillis() / 1000L).coerceAtLeast(0L)
    val days = left / 86_400
    val hours = (left % 86_400) / 3_600
    val mins = (left % 3_600) / 60
    return when {
        days > 0 -> "in ${days}d ${hours}h"
        hours > 0 -> "in ${hours}h ${mins}m"
        else -> "in ${mins}m"
    }
}

private fun compactCount(value: Int): String = when {
    value >= 1_000_000 -> "%.1fm".format(value / 1_000_000f)
    value >= 1_000 -> "%.1fk".format(value / 1_000f)
    else -> value.toString()
}

private fun MediaRank.line(): String {
    val kind = when (type.uppercase()) {
        "RATED" -> "Rated"
        "POPULAR" -> "Popular"
        else -> type.lowercase().replaceFirstChar { it.titlecase() }
    }
    val where = if (allTime) {
        "all time"
    } else {
        listOfNotNull(
            season?.lowercase()?.replaceFirstChar { it.titlecase() },
            year?.toString(),
        ).joinToString(" ").ifBlank { context.lowercase() }
    }
    return "#$rank $kind · $where"
}

internal fun shareTitle(context: android.content.Context, detail: AnimeSummary) {
    val send = Intent(Intent.ACTION_SEND).apply {
        type = "text/plain"
        putExtra(Intent.EXTRA_TEXT, "${detail.title}\nhttps://anilist.co/anime/${detail.id}")
    }
    context.startActivity(Intent.createChooser(send, detail.title))
}
