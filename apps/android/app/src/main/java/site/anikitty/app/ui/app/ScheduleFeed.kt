// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
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
import androidx.compose.foundation.layout.defaultMinSize
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
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
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import site.anikitty.app.data.airingLabel
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.components.KittyEmptyState
import site.anikitty.app.ui.components.KittyShimmerBox
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.prefersReducedMotion
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ScheduleFeed(
    aniList: AniListClient,
    demo: Boolean = false,
    onBack: () -> Unit,
    onOpen: (AnimeSummary, Int) -> Unit,
    showBack: Boolean = true,
    bottomInset: Dp = 12.dp,
    followedEpisodes: Map<Int, Int> = emptyMap(),
    inProgressIds: Set<Int> = emptySet(),
) {
    val days = remember { upcomingDays(5) }
    var selected by remember { mutableIntStateOf(0) }
    var slots by remember { mutableStateOf<List<AiringSlot>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    val clock = remember { SimpleDateFormat("h:mm a", Locale.getDefault()) }
    var onlyMine by remember { mutableStateOf(false) }
    var reloadTick by remember { mutableIntStateOf(0) }

    LaunchedEffect(reloadTick) {
        if (demo) {
            slots = site.anikitty.app.data.demo.DemoLibrary.airing(System.currentTimeMillis() / 1000L)
            loading = false
            error = null
            return@LaunchedEffect
        }
        loading = true
        error = null
        runCatching {
            aniList.airingSchedule(
                fromSec = days.first().timeInMillis / 1000L,
                toSec = days.last().clone().let { end ->
                    (end as Calendar).add(Calendar.DAY_OF_YEAR, 1)
                    end.timeInMillis / 1000L
                },
            )
        }.onSuccess { slots = it }
            .onFailure { error = friendlyFailure(it.message ?: "Could not load the schedule") }
        loading = false
    }

    val palette = LocalKittyPalette.current
    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(palette.page)
            .windowInsetsPadding(WindowInsets.statusBars),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showBack) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = palette.text)
                }
            } else {
                Spacer(modifier = Modifier.width(8.dp))
            }
            Column(modifier = Modifier.padding(start = 8.dp)) {
                Text(
                    "Schedule",
                    color = palette.text,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-0.4).sp,
                )
                Text(
                    "The next five days",
                    color = palette.muted,
                    style = MaterialTheme.typography.bodySmall,
                )
            }
        }
        if (followedEpisodes.isNotEmpty()) {
            Row(
                modifier = Modifier.padding(horizontal = 16.dp, vertical = 2.dp),
            ) {
                val shape = RoundedCornerShape(999.dp)
                Text(
                    if (onlyMine) "My list" else "All airing",
                    color = if (onlyMine) palette.page else palette.text,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .defaultMinSize(minHeight = 48.dp)
                        .clip(shape)
                        .background(if (onlyMine) palette.text else palette.surface)
                        .border(1.dp, if (onlyMine) palette.text else palette.hairline, shape)
                        .clickable { onlyMine = !onlyMine }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
        }
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 8.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            days.forEachIndexed { index, day ->
                val on = index == selected
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .defaultMinSize(minHeight = 48.dp)
                        .spacePress { selected = index }
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (on) palette.text else palette.surface)
                        .border(
                            0.5.dp,
                            if (on) palette.text else palette.hairline,
                            RoundedCornerShape(12.dp),
                        )
                        .padding(vertical = 6.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                ) {
                    Text(
                        if (index == 0) {
                            "TODAY"
                        } else {
                            day.getDisplayName(Calendar.DAY_OF_WEEK, Calendar.SHORT, Locale.getDefault())
                                .orEmpty()
                                .uppercase(Locale.getDefault())
                        },
                        color = if (on) palette.page else palette.muted,
                        fontSize = 11.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        day.get(Calendar.DAY_OF_MONTH).toString(),
                        color = if (on) palette.page else palette.text,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
        val reducedMotion = prefersReducedMotion()
        when {
            loading -> Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                repeat(5) {
                    KittyShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(72.dp),
                        shape = RoundedCornerShape(12.dp),
                    )
                }
            }
            error != null && slots.isEmpty() -> Column(Modifier.weight(1f).padding(16.dp)) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Retry",
                    color = palette.page,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .defaultMinSize(minHeight = 48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(palette.text)
                        .clickable { reloadTick++ }
                        .padding(horizontal = 18.dp, vertical = 12.dp),
                )
            }
            else -> AnimatedContent(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth(),
                targetState = selected,
                transitionSpec = {
                    if (reducedMotion) {
                        fadeIn(tween(0)) togetherWith fadeOut(tween(0))
                    } else {
                        fadeIn(tween(180)) togetherWith fadeOut(tween(120))
                    }
                },
                label = "scheduleDay",
            ) { day ->
                val start = days[day].timeInMillis
                val end = start + 24L * 60L * 60L * 1000L
                val daySlots = slots.filter { slot ->
                    val ms = slot.airingAtEpochSec * 1000L
                    val onDay = ms in start until end
                    val mine = !onlyMine || followedEpisodes.containsKey(slot.anime.id)
                    onDay && mine
                }
                if (daySlots.isEmpty()) {
                    val nextIndex = days.indices.firstOrNull { index ->
                        index != day && slots.any { slot ->
                            val ms = slot.airingAtEpochSec * 1000L
                            val dayStart = days[index].timeInMillis
                            val onDay = ms in dayStart until dayStart + 24L * 60L * 60L * 1000L
                            val mine = !onlyMine || followedEpisodes.containsKey(slot.anime.id)
                            onDay && mine
                        }
                    }
                    val dayName = nextIndex?.let { index ->
                        if (index == 0) {
                            "Today"
                        } else {
                            days[index].getDisplayName(Calendar.DAY_OF_WEEK, Calendar.LONG, Locale.getDefault())
                        }
                    }
                    val hint = when {
                        dayName != null && onlyMine -> "Nothing from your list this day. $dayName has shows."
                        dayName != null -> "Nothing this day. $dayName has shows."
                        onlyMine -> "Nothing from your list airs this day."
                        else -> "Nothing airing this day."
                    }
                    KittyEmptyState(
                        title = if (onlyMine) "Nothing from your list" else "Nothing airing",
                        body = hint,
                        modifier = Modifier.padding(start = 16.dp, end = 16.dp, top = 16.dp, bottom = bottomInset),
                        actionLabel = dayName?.let { "Show $it" },
                        onAction = if (nextIndex != null) {
                            { selected = nextIndex }
                        } else {
                            null
                        },
                    )
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = bottomInset),
                        verticalArrangement = Arrangement.spacedBy(8.dp),
                    ) {
                        items(daySlots, key = { "${it.anime.id}-${it.episode}-${it.airingAtEpochSec}" }) { slot ->
                            ScheduleRow(
                                slot,
                                clock.format(Date(slot.airingAtEpochSec * 1000L)),
                                catchUpLabel(
                                    slot.episode,
                                    followedEpisodes[slot.anime.id],
                                    inProgress = slot.anime.id in inProgressIds,
                                ),
                                onOpen,
                            )
                        }
                    }
                }
            }
        }
    }
}

/** [watchedEpisode] is the stored frontier. 0 means on the list but nothing finished, so episode 1 is New. */
private fun catchUpLabel(airingEpisode: Int, watchedEpisode: Int?, inProgress: Boolean): String? {
    if (watchedEpisode == null) return null
    val behind = airingEpisode - watchedEpisode.coerceAtLeast(0)
    return when {
        behind > 1 -> "$behind behind"
        behind == 1 -> "New"
        behind <= 0 && inProgress -> "Resume"
        else -> "On list"
    }
}

@Composable
private fun ScheduleRow(
    slot: AiringSlot,
    timeLabel: String,
    listLabel: String?,
    onOpen: (AnimeSummary, Int) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .spacePress { onOpen(slot.anime, slot.episode) }
            .clip(RoundedCornerShape(12.dp))
            .background(LocalKittyPalette.current.surface)
            .border(0.5.dp, LocalKittyPalette.current.hairline, RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = slot.anime.coverImageUrl,
            contentDescription = null,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(48.dp)
                .height(68.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(LocalKittyPalette.current.hairline),
        )
        Spacer(modifier = Modifier.width(12.dp))
        val now = System.currentTimeMillis() / 1000L
        val relative = airingLabel(slot.airingAtEpochSec, now, timeLabel)
        val aired = slot.airingAtEpochSec + 60 < now
        Column(modifier = Modifier.weight(1f)) {
            Text(
                slot.anime.title,
                color = LocalKittyPalette.current.text,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "Episode ${slot.episode}",
                color = LocalKittyPalette.current.muted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (!listLabel.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    listLabel,
                    color = LocalKittyPalette.current.page,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(LocalKittyPalette.current.text)
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                )
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            if (relative != timeLabel) {
                Text(
                    relative,
                    color = LocalKittyPalette.current.page,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(LocalKittyPalette.current.text)
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
                Spacer(modifier = Modifier.height(4.dp))
            } else if (aired) {
                Text(
                    "Aired",
                    color = LocalKittyPalette.current.muted,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
            Text(
                timeLabel,
                color = if (aired) LocalKittyPalette.current.muted else LocalKittyPalette.current.text,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (aired) LocalKittyPalette.current.hairline else LocalKittyPalette.current.text.copy(alpha = 0.12f))
                    .padding(horizontal = 8.dp, vertical = 4.dp),
            )
        }
    }
}

private fun upcomingDays(count: Int): List<Calendar> {
    val start = Calendar.getInstance().apply {
        set(Calendar.HOUR_OF_DAY, 0)
        set(Calendar.MINUTE, 0)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
    }
    return List(count) { offset ->
        (start.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, offset) }
    }
}
