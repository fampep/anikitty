// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.lazy.rememberLazyListState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.components.EpisodeCarousel
import site.anikitty.app.ui.components.EpisodeSlide
import site.anikitty.app.ui.theme.PlayerChrome

private const val EpisodePageSize = 50
private const val EpisodeGridColumns = 5

/**
 * Glass-dark episode picker for the player chrome. Range chips keep long
 * seasons usable; the number grid and thumb rail both switch the episode.
 */
@Composable
internal fun EpisodeSelectorPanel(
    episode: Int,
    totalEpisodes: Int,
    watchedThrough: Int,
    positionFraction: Float,
    slides: List<EpisodeSlide>,
    fallbackArt: String?,
    minutesLeft: Int?,
    anilistId: Int,
    onPick: (Int) -> Unit,
    onToggleWatched: ((Int) -> Unit)?,
    modifier: Modifier = Modifier,
    requestJumpFocus: Boolean = false,
) {
    val total = totalEpisodes.coerceAtLeast(1)
    val rangeCount = ((total + EpisodePageSize - 1) / EpisodePageSize).coerceAtLeast(1)
    var browseRange by remember(total) {
        mutableIntStateOf(((episode - 1) / EpisodePageSize).coerceIn(0, rangeCount - 1))
    }
    LaunchedEffect(episode, total) {
        browseRange = ((episode - 1) / EpisodePageSize).coerceIn(0, rangeCount - 1)
    }
    var jump by remember { mutableStateOf("") }
    val jumpFocus = remember { FocusRequester() }
    LaunchedEffect(requestJumpFocus) {
        if (requestJumpFocus) {
            runCatching { jumpFocus.requestFocus() }
        }
    }

    val rangeStart = browseRange * EpisodePageSize + 1
    val rangeEnd = minOf(total, rangeStart + EpisodePageSize - 1)
    val numbers = remember(rangeStart, rangeEnd) { (rangeStart..rangeEnd).toList() }
    val resolvedSlides = remember(slides, total) {
        if (slides.isNotEmpty()) {
            slides
        } else {
            (1..total).map { number -> EpisodeSlide(number, "Episode $number", null) }
        }
    }
    val rangeSlides = remember(resolvedSlides, rangeStart, rangeEnd) {
        resolvedSlides.filter { it.number in rangeStart..rangeEnd }
    }
    val currentSlide = resolvedSlides.firstOrNull { it.number == episode }
    val currentTitle = currentSlide?.title?.trim().orEmpty().let { title ->
        when {
            title.isEmpty() -> "Episode $episode"
            title.equals("Episode $episode", ignoreCase = true) -> title
            else -> "E$episode · $title"
        }
    }

    fun commitJump() {
        val picked = jump.toIntOrNull()
        if (picked != null && picked in 1..total) {
            onPick(picked)
            jump = ""
        }
    }

    Column(
        modifier = modifier
            .fillMaxWidth()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text(
            currentTitle,
            color = PlayerChrome.Paper,
            fontWeight = FontWeight.SemiBold,
            fontSize = 15.sp,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            if (watchedThrough > 0) {
                "$total episodes · watched through E$watchedThrough"
            } else {
                "$total episodes"
            },
            color = PlayerChrome.Faint,
            fontSize = 12.sp,
        )

        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.08f))
                    .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                BasicTextField(
                    value = jump,
                    onValueChange = { next -> if (next.all(Char::isDigit) && next.length <= 4) jump = next },
                    textStyle = TextStyle(
                        color = PlayerChrome.Paper,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    ),
                    cursorBrush = SolidColor(PlayerChrome.Paper),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Go,
                    ),
                    keyboardActions = KeyboardActions(onGo = { commitJump() }),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(jumpFocus),
                    decorationBox = { inner ->
                        if (jump.isEmpty()) {
                            Text(
                                "Jump to episode",
                                color = Color.White.copy(alpha = 0.35f),
                                fontSize = 14.sp,
                            )
                        }
                        inner()
                    },
                )
            }
            Box(
                modifier = Modifier
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PlayerChrome.Accent)
                    .clickable(onClick = ::commitJump)
                    .padding(horizontal = 16.dp),
                contentAlignment = Alignment.Center,
            ) {
                Text(
                    "Go",
                    color = PlayerChrome.Ink,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 14.sp,
                )
            }
        }

        if (rangeCount > 1) {
            val rangeListState = rememberLazyListState()
            LaunchedEffect(browseRange, rangeCount) {
                rangeListState.animateScrollToItem(
                    browseRange.coerceIn(0, (rangeCount - 1).coerceAtLeast(0)),
                )
            }
            LazyRow(
                state = rangeListState,
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(
                    count = rangeCount,
                    key = { it },
                ) { index ->
                    val start = index * EpisodePageSize + 1
                    val end = minOf(total, start + EpisodePageSize - 1)
                    val selected = browseRange == index
                    val background by animateColorAsState(
                        if (selected) PlayerChrome.Accent else Color.White.copy(alpha = 0.08f),
                        tween(180),
                        label = "rangeBg",
                    )
                    val text by animateColorAsState(
                        if (selected) PlayerChrome.Ink else PlayerChrome.Paper.copy(alpha = 0.8f),
                        tween(180),
                        label = "rangeText",
                    )
                    Text(
                        "$start–$end",
                        color = text,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .heightIn(min = 40.dp)
                            .clip(RoundedCornerShape(12.dp))
                            .background(background)
                            .clickable { browseRange = index }
                            .padding(horizontal = 14.dp, vertical = 10.dp),
                    )
                }
            }
        }

        EpisodeNumberGrid(
            numbers = numbers,
            current = episode,
            watchedThrough = watchedThrough,
            onPick = onPick,
        )

        if (rangeSlides.isNotEmpty()) {
            Text(
                "Stills",
                color = PlayerChrome.Faint,
                fontWeight = FontWeight.SemiBold,
                fontSize = 12.sp,
            )
            EpisodeCarousel(
                slides = rangeSlides,
                current = episode,
                watchedThrough = watchedThrough,
                currentProgress = positionFraction,
                fallbackArt = fallbackArt,
                onPick = onPick,
                onDark = true,
                minutesLeft = minutesLeft,
                onToggleWatched = onToggleWatched,
                anilistId = anilistId,
                modifier = Modifier.padding(horizontal = (-14).dp),
            )
        }
    }
}

@Composable
private fun EpisodeNumberGrid(
    numbers: List<Int>,
    current: Int,
    watchedThrough: Int,
    onPick: (Int) -> Unit,
) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        numbers.chunked(EpisodeGridColumns).forEach { row ->
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                row.forEach { number ->
                    EpisodeNumberCell(
                        number = number,
                        selected = number == current,
                        watched = watchedThrough > 0 && number <= watchedThrough && number != current,
                        onClick = { onPick(number) },
                        modifier = Modifier.weight(1f),
                    )
                }
                repeat(EpisodeGridColumns - row.size) {
                    Spacer(modifier = Modifier.weight(1f))
                }
            }
        }
    }
}

@Composable
private fun EpisodeNumberCell(
    number: Int,
    selected: Boolean,
    watched: Boolean,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(12.dp)
    val background by animateColorAsState(
        when {
            selected -> PlayerChrome.Accent
            watched -> Color.White.copy(alpha = 0.10f)
            else -> Color.White.copy(alpha = 0.06f)
        },
        tween(160),
        label = "epCellBg",
    )
    val border = when {
        selected -> PlayerChrome.Accent
        watched -> Color.White.copy(alpha = 0.18f)
        else -> Color.White.copy(alpha = 0.10f)
    }
    val foreground = when {
        selected -> PlayerChrome.Ink
        watched -> PlayerChrome.Faint
        else -> PlayerChrome.Paper.copy(alpha = 0.92f)
    }
    Box(
        modifier = modifier
            .height(44.dp)
            .clip(shape)
            .background(background)
            .border(1.dp, border, shape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (watched && !selected) {
                Icon(
                    Icons.Rounded.Check,
                    contentDescription = null,
                    tint = foreground,
                    modifier = Modifier.size(12.dp),
                )
                Spacer(modifier = Modifier.width(3.dp))
            }
            Text(
                "$number",
                color = foreground,
                fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                fontSize = 14.sp,
            )
        }
    }
}
