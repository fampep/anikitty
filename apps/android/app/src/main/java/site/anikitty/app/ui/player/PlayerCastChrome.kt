// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

@file:OptIn(androidx.media3.common.util.UnstableApi::class)

package site.anikitty.app.ui.player

import androidx.annotation.OptIn
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.CastConnected
import androidx.compose.material.icons.outlined.Forward10
import androidx.compose.material.icons.outlined.FullscreenExit
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Replay10
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.outlined.VideoLibrary
import androidx.compose.material.icons.automirrored.outlined.VolumeOff
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.rounded.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import site.anikitty.app.ui.theme.PlayerChrome

@Composable
internal fun CastStatusBadge(
    episode: Int,
    title: String,
    isMovie: Boolean,
    buffering: Boolean = false,
    connecting: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val shape = RoundedCornerShape(14.dp)
    val line = if (isMovie) title else "EP $episode · $title"
    Row(
        modifier = modifier
            .clip(shape)
            .background(Color.Black.copy(alpha = 0.72f))
            .border(1.dp, Color.White.copy(alpha = 0.22f), shape)
            .clearAndSetSemantics {
                contentDescription = castStatusDescription(
                    buffering,
                    isMovie,
                    episode,
                    title,
                    connecting = connecting,
                )
            }
            .padding(horizontal = 14.dp, vertical = 10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Icon(
            Icons.Rounded.CastConnected,
            contentDescription = null,
            tint = PlayerChrome.Paper,
            modifier = Modifier.size(18.dp),
        )
        Spacer(modifier = Modifier.width(10.dp))
        Column {
            Text(
                when {
                    connecting -> "Connecting to your TV"
                    buffering -> "Buffering on your TV"
                    else -> "Casting to your TV"
                },
                color = PlayerChrome.Paper,
                fontWeight = FontWeight.SemiBold,
                fontSize = 13.sp,
                maxLines = 1,
            )
            Text(
                line,
                color = PlayerChrome.Graphite,
                fontSize = 12.sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
        }
    }
}

/** Play / seek / mute / speed — larger hit targets while casting. */
@Composable
internal fun CastTransportRow(
    playing: Boolean,
    muted: Boolean,
    player: Player?,
    scrubbing: Boolean,
    scrubValue: Float,
    durationMs: Long,
    showEpisodes: Boolean,
    castUnavailable: String?,
    onCastUnavailable: (String) -> Unit,
    speedLabel: String,
    onPlayPause: () -> Unit,
    onMute: () -> Unit,
    onSeekBack: () -> Unit,
    onSeekForward: () -> Unit,
    onSpeed: () -> Unit,
    onEpisodes: () -> Unit,
    onSettings: () -> Unit,
    onExitTheater: () -> Unit,
) {
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        PlayerCapsule {
            PillIcon(
                icon = if (playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                description = if (playing) "Pause" else "Play",
                onClick = onPlayPause,
            )
            PillIcon(
                icon = if (muted) Icons.AutoMirrored.Outlined.VolumeOff else Icons.AutoMirrored.Outlined.VolumeUp,
                description = if (muted) "Unmute TV" else "Mute TV",
                onClick = onMute,
            )
            PillLabel(
                label = speedLabel,
                description = "Play speed",
                onClick = onSpeed,
            )
            LiveClockText(
                player = player,
                scrubbing = scrubbing,
                scrubValue = scrubValue,
                durationMs = durationMs,
                modifier = Modifier.padding(horizontal = 8.dp),
            )
        }
        PlayerCapsule {
            PillIcon(
                icon = Icons.Outlined.Replay10,
                description = "Back 10 seconds",
                onClick = onSeekBack,
            )
            PillIcon(
                icon = Icons.Outlined.Forward10,
                description = "Forward 10 seconds",
                onClick = onSeekForward,
            )
            if (showEpisodes) {
                PillIcon(
                    icon = Icons.Outlined.VideoLibrary,
                    description = "Episodes",
                    onClick = onEpisodes,
                )
            }
            PillIcon(
                icon = Icons.Outlined.Settings,
                description = "Settings",
                onClick = onSettings,
            )
            PillIcon(
                icon = Icons.Outlined.FullscreenExit,
                description = "Exit full screen",
                onClick = onExitTheater,
            )
            CastRouteButton(
                unavailable = castUnavailable,
                onUnavailable = onCastUnavailable,
                modifier = Modifier.size(48.dp),
            )
        }
    }
}
