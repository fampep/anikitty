// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

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
import androidx.compose.material3.CircularProgressIndicator
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
import androidx.compose.ui.graphics.Color
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
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale

@Composable
fun ScheduleFeed(
    aniList: AniListClient,
    onBack: () -> Unit,
    onOpen: (AnimeSummary) -> Unit,
    showBack: Boolean = true,
    bottomInset: Dp = 12.dp,
    followedEpisodes: Map<Int, Int> = emptyMap(),
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

    val dayStart = days[selected].timeInMillis
    val dayEnd = dayStart + 24L * 60L * 60L * 1000L
    val visible = slots.filter { slot ->
        val ms = slot.airingAtEpochSec * 1000L
        val onDay = ms in dayStart until dayEnd
        val mine = !onlyMine || followedEpisodes.containsKey(slot.anime.id)
        onDay && mine
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars)
            .padding(bottom = bottomInset),
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 8.dp, vertical = 4.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            if (showBack) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = KittyText)
                }
            } else {
                Spacer(modifier = Modifier.width(8.dp))
            }
            Column(modifier = Modifier.padding(start = 8.dp)) {
                Text(
                    "Schedule",
                    color = Color.White,
                    style = MaterialTheme.typography.headlineMedium,
                    fontWeight = FontWeight.SemiBold,
                    letterSpacing = (-0.4).sp,
                )
                Text(
                    "The next five days",
                    color = Color.White.copy(alpha = 0.45f),
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
                    color = if (onlyMine) KittyOnAccent else KittyText,
                    fontWeight = FontWeight.Bold,
                    fontSize = 12.sp,
                    modifier = Modifier
                        .clip(shape)
                        .background(if (onlyMine) KittyAccent else KittySurface)
                        .border(1.dp, if (onlyMine) KittyAccent else KittyOutlineSoft, shape)
                        .clickable { onlyMine = !onlyMine }
                        .padding(horizontal = 12.dp, vertical = 6.dp),
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
                        .spacePress { selected = index }
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (on) Color.White else Color(0xFF0C0C10))
                        .border(
                            0.5.dp,
                            if (on) Color.White else Color.White.copy(alpha = 0.08f),
                            RoundedCornerShape(12.dp),
                        )
                        .padding(vertical = 8.dp),
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
                        color = if (on) KittyOnAccent else KittyFaint,
                        fontSize = 9.sp,
                        fontWeight = FontWeight.Bold,
                    )
                    Text(
                        day.get(Calendar.DAY_OF_MONTH).toString(),
                        color = if (on) KittyOnAccent else KittyText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 14.sp,
                    )
                }
            }
        }
        when {
            loading -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KittyAccent)
            }
            error != null && slots.isEmpty() -> Column(Modifier.padding(16.dp)) {
                Text(error!!, color = MaterialTheme.colorScheme.error)
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    "Retry",
                    color = KittyOnAccent,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(KittyAccent)
                        .clickable { reloadTick++ }
                        .padding(horizontal = 14.dp, vertical = 8.dp),
                )
            }
            visible.isEmpty() -> {
                val nextIndex = days.indices.firstOrNull { index ->
                    index != selected && slots.any { slot ->
                        val ms = slot.airingAtEpochSec * 1000L
                        val start = days[index].timeInMillis
                        val onDay = ms in start until start + 24L * 60L * 60L * 1000L
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
                Text(
                    hint,
                    color = KittyMuted,
                    modifier = Modifier
                        .padding(16.dp)
                        .clickable(enabled = nextIndex != null) {
                            if (nextIndex != null) selected = nextIndex
                        },
                )
            }
            else -> LazyColumn(
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 8.dp),
                verticalArrangement = Arrangement.spacedBy(8.dp),
            ) {
                items(visible, key = { "${it.anime.id}-${it.episode}-${it.airingAtEpochSec}" }) { slot ->
                    ScheduleRow(
                        slot,
                        clock.format(Date(slot.airingAtEpochSec * 1000L)),
                        catchUpLabel(slot.episode, followedEpisodes[slot.anime.id]),
                        onOpen,
                    )
                }
            }
        }
    }
}

/** [watchedEpisode] is episodes finished. 0 means on the list but nothing finished, so episode 1 is New. */
private fun catchUpLabel(airingEpisode: Int, watchedEpisode: Int?): String? {
    if (watchedEpisode == null) return null
    val behind = airingEpisode - watchedEpisode.coerceAtLeast(0)
    return when {
        behind > 1 -> "$behind behind"
        behind == 1 -> "New"
        else -> "On list"
    }
}

@Composable
private fun ScheduleRow(
    slot: AiringSlot,
    timeLabel: String,
    listLabel: String?,
    onOpen: (AnimeSummary) -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .spacePress { onOpen(slot.anime) }
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF0C0C10))
            .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = slot.anime.coverImageUrl,
            contentDescription = slot.anime.title,
            contentScale = ContentScale.Crop,
            modifier = Modifier
                .width(48.dp)
                .height(68.dp)
                .clip(RoundedCornerShape(10.dp))
                .background(KittyOutlineSoft),
        )
        Spacer(modifier = Modifier.width(12.dp))
        val now = System.currentTimeMillis() / 1000L
        val relative = airingLabel(slot.airingAtEpochSec, now, timeLabel)
        val aired = slot.airingAtEpochSec + 60 < now
        Column(modifier = Modifier.weight(1f)) {
            Text(
                slot.anime.title,
                color = KittyText,
                fontWeight = FontWeight.Bold,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                "Episode ${slot.episode}",
                color = KittyMuted,
                fontSize = 12.sp,
                fontWeight = FontWeight.SemiBold,
            )
            if (!listLabel.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    listLabel,
                    color = KittyOnAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(KittyAccent)
                        .padding(horizontal = 7.dp, vertical = 2.dp),
                )
            }
        }
        Column(horizontalAlignment = Alignment.End) {
            if (relative != timeLabel) {
                Text(
                    relative,
                    color = KittyOnAccent,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                    modifier = Modifier
                        .clip(RoundedCornerShape(999.dp))
                        .background(KittyAccent)
                        .padding(horizontal = 8.dp, vertical = 3.dp),
                )
                Spacer(modifier = Modifier.height(4.dp))
            } else if (aired) {
                Text(
                    "Aired",
                    color = KittyFaint,
                    fontSize = 10.sp,
                    fontWeight = FontWeight.Bold,
                )
                Spacer(modifier = Modifier.height(4.dp))
            }
            Text(
                timeLabel,
                color = if (aired) KittyFaint else KittyText,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                modifier = Modifier
                    .clip(RoundedCornerShape(8.dp))
                    .background(if (aired) KittySurface else KittyAccent.copy(alpha = 0.12f))
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
