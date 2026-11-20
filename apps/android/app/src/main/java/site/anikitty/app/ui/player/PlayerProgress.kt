// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

@file:OptIn(androidx.media3.common.util.UnstableApi::class)

package site.anikitty.app.ui.player

import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import kotlinx.coroutines.delay
import site.anikitty.app.data.skip.SkipTimes
import site.anikitty.app.ui.theme.PlayerChrome

internal class Playhead {
    var ms: Long = 0L
}

@Composable
internal fun LiveTimeline(
    player: Player?,
    scrubbing: Boolean,
    scrubValue: Float,
    durationMs: Long,
    skipTimes: SkipTimes,
    thumbnails: site.anikitty.app.data.servers.ThumbnailTrack?,
    mediaUrl: String?,
    onScrub: (Float) -> Unit,
    onScrubFinished: (Float) -> Unit,
    modifier: Modifier = Modifier,
) {
    var liveMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player, scrubbing) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            if (!scrubbing) {
                val next = p.currentPosition.coerceAtLeast(0L)
                if (next != liveMs) liveMs = next
            }
            delay(200)
        }
    }
    val shown = if (scrubbing) (scrubValue * durationMs).toLong() else liveMs
    val dur = durationMs.coerceAtLeast(1L).toFloat()
    var bufferedMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            val next = p.bufferedPosition.coerceAtLeast(0L)
            if (next != bufferedMs) bufferedMs = next
            delay(400)
        }
    }
    val buffered = if (durationMs > 0L) {
        (bufferedMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    val context = androidx.compose.ui.platform.LocalContext.current
    val loader = remember(thumbnails?.url, mediaUrl) {
        ThumbnailLoader(context, thumbnails, mediaUrl)
    }
    var frame by remember { mutableStateOf<android.graphics.Bitmap?>(null) }
    LaunchedEffect(scrubbing, scrubValue, durationMs, loader) {
        if (!scrubbing || durationMs <= 0L) {
            frame = null
            return@LaunchedEffect
        }
        val ms = (scrubValue.coerceIn(0f, 1f) * durationMs).toLong()
        frame = loader.frame(ms)
    }
    Box(modifier) {
        GlassScrubber(
            progress = if (durationMs > 0L) (shown / dur).coerceIn(0f, 1f) else 0f,
            buffered = buffered,
            durationMs = durationMs,
            scrubbing = scrubbing,
            onScrub = onScrub,
            onScrubFinished = onScrubFinished,
            skipTimes = skipTimes,
            modifier = Modifier.fillMaxWidth(),
        )
        if (scrubbing && durationMs > 0L) {
            SeekPreview(
                fraction = scrubValue,
                timeLabel = formatClockPadded(shown),
                frame = frame,
            )
        }
    }
}

@Composable
internal fun NextEpisodePrompt(
    modifier: Modifier = Modifier,
    nextEpisode: Int,
    ended: Boolean,
    secondsLeft: Int,
    player: Player? = null,
    durationMs: Long = 0L,
    busy: Boolean,
    onPlayNow: () -> Unit,
    onDismiss: () -> Unit,
) {
    var remainSec by remember { mutableIntStateOf(secondsLeft) }
    LaunchedEffect(player, ended, durationMs) {
        if (ended) return@LaunchedEffect
        val p = player ?: return@LaunchedEffect
        while (true) {
            val left = ((durationMs - p.currentPosition.coerceAtLeast(0L)) / 1000L).toInt().coerceAtLeast(0)
            if (left != remainSec) remainSec = left
            delay(250)
        }
    }
    val countdown = if (ended) secondsLeft else remainSec
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .widthIn(max = 360.dp)
            .shadow(16.dp, shape, clip = false, ambientColor = Color.Black.copy(alpha = 0.45f))
            .clip(shape)
            .background(PlayerChrome.Sheet)
            .border(1.dp, PlayerChrome.SheetStroke, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            site.anikitty.app.ui.components.KittyFace(
                modifier = Modifier
                    .padding(end = 8.dp)
                    .size(22.dp)
                    .clearAndSetSemantics { },
            )
            Text(
                "Up next",
                color = PlayerChrome.Faint,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Episode $nextEpisode",
            color = PlayerChrome.Paper,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            when {
                busy -> "Loading next episode…"
                ended -> "Starting automatically in ${secondsLeft}s"
                countdown > 0 -> "Episode ends in ${countdown}s"
                else -> "Episode $nextEpisode is ready"
            },
            color = PlayerChrome.Graphite,
            fontSize = 13.sp,
        )
        if (countdown > 0) {
            val span = if (ended) AUTOPLAY_COUNTDOWN_SEC else (NEAR_END_THRESHOLD_MS / 1000L).toInt()
            val fraction = (countdown.toFloat() / span.coerceAtLeast(1)).coerceIn(0f, 1f)
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White.copy(alpha = 0.12f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction)
                        .background(Color.White),
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            var playNowFocused by remember { mutableStateOf(false) }
            var dismissFocused by remember { mutableStateOf(false) }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (playNowFocused) Color.White else PlayerChrome.Accent)
                    .border(
                        if (playNowFocused) 2.dp else 0.dp,
                        Color.White,
                        RoundedCornerShape(12.dp),
                    )
                    .onFocusChanged { playNowFocused = it.isFocused }
                    .clickable(enabled = !busy, role = Role.Button, onClick = onPlayNow)
                    .clearAndSetSemantics {
                        contentDescription = "Play episode $nextEpisode now"
                    }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    if (ended) "Play now" else "Next episode",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (dismissFocused) Color.White else PlayerChrome.Disc)
                    .border(
                        if (dismissFocused) 2.dp else 1.dp,
                        if (dismissFocused) Color.White else PlayerChrome.Accent.copy(alpha = 0.35f),
                        RoundedCornerShape(12.dp),
                    )
                    .onFocusChanged { dismissFocused = it.isFocused }
                    .clickable(enabled = !busy, role = Role.Button, onClick = onDismiss)
                    .clearAndSetSemantics {
                        contentDescription = if (ended) "Cancel autoplay" else "Dismiss up next"
                    }
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    if (ended) "Cancel" else "Not now",
                    color = if (dismissFocused) Color.Black else PlayerChrome.Paper,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                )
            }
        }
    }
}
