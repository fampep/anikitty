// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

@file:OptIn(androidx.media3.common.util.UnstableApi::class)

package site.anikitty.app.ui.player

import androidx.annotation.OptIn
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.outlined.PictureInPicture
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.PictureInPicture
import androidx.compose.material.icons.rounded.Settings
import site.anikitty.app.ui.components.EpisodeCarousel
import site.anikitty.app.ui.components.EpisodeSlide
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
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
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.draw.scale
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.key
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import kotlinx.coroutines.delay
import site.anikitty.app.ui.app.spacePress
import site.anikitty.app.ui.theme.PlayerChrome

@Composable
internal fun PlayerPageBar(
    title: String,
    episodeLine: String,
    onBack: () -> Unit,
    onExpand: () -> Unit,
    onSettings: () -> Unit,
    onPip: () -> Unit,
    cast: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black)
            .windowInsetsPadding(WindowInsets.statusBars.union(WindowInsets.displayCutout))
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ChromeDisc(onClick = onBack, size = 48.dp) {
            Icon(
                Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = "Back",
                tint = Color.White,
            )
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp),
        ) {
            Text(
                title,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                letterSpacing = (-0.3).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                episodeLine,
                color = Color.White.copy(alpha = 0.55f),
                fontSize = 13.sp,
                maxLines = 1,
            )
        }
        Box(
            modifier = Modifier.size(48.dp),
            contentAlignment = Alignment.Center,
        ) {
            cast()
        }
        ChromeDisc(onClick = onPip, size = 48.dp) {
            Icon(
                Icons.Rounded.PictureInPicture,
                contentDescription = "Picture in picture",
                tint = Color.White,
            )
        }
        ChromeDisc(onClick = onSettings, size = 48.dp) {
            Icon(
                Icons.Rounded.Settings,
                contentDescription = "Settings",
                tint = Color.White,
            )
        }
        ChromeDisc(onClick = onExpand, size = 48.dp) {
            Icon(
                Icons.Rounded.Fullscreen,
                contentDescription = "Full screen",
                tint = Color.White,
            )
        }
    }
}

@Composable
internal fun PlayerEpisodeShelf(
    marks: List<String> = emptyList(),
    episode: Int,
    totalEpisodes: Int,
    watchedThrough: Int,
    positionFraction: Float,
    audio: String,
    isMovie: Boolean,
    autoNext: Boolean,
    onPickEpisode: (Int) -> Unit,
    onPickAudio: (String) -> Unit,
    onToggleAutoNext: () -> Unit,
    episodeSlides: List<EpisodeSlide>,
    anilistId: Int = 0,
    fallbackArt: String?,
    minutesLeft: Int?,
    onToggleWatched: ((Int) -> Unit)?,
    speedLabel: String = "1×",
    qualityLabel: String = "Auto",
    onSpeed: () -> Unit = {},
    onQuality: () -> Unit = {},
    onAudio: () -> Unit = {},
    onEpisodes: () -> Unit = {},
    onNext: () -> Unit = {},
    nextEnabled: Boolean = false,
    speedSelected: Boolean = false,
    qualitySelected: Boolean = false,
    audioSelected: Boolean = false,
    episodesSelected: Boolean = false,
    downloadLabel: String? = null,
    downloadEnabled: Boolean = false,
    onDownload: () -> Unit = {},
    onRemoveDownload: (() -> Unit)? = null,
    modifier: Modifier = Modifier,
) {
    val showGrid = !isMovie && totalEpisodes > 1
    var jump by remember { mutableStateOf("") }
    val audioLabel = if (audio == "dub") "Dub" else "Sub"
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (marks.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                marks.forEach { PlayerMetaPill(it) }
            }
        }
        if (downloadLabel != null) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(16.dp),
            ) {
                Text(
                    text = downloadLabel,
                    color = Color.White,
                    fontSize = 15.sp,
                    fontWeight = FontWeight.Medium,
                    modifier = Modifier
                        .clip(RoundedCornerShape(8.dp))
                        .clickable(enabled = downloadEnabled, role = Role.Button) { onDownload() }
                        .padding(horizontal = 4.dp, vertical = 8.dp),
                )
                if (onRemoveDownload != null) {
                    Text(
                        text = "Remove",
                        color = Color.White.copy(alpha = 0.72f),
                        fontSize = 15.sp,
                        modifier = Modifier
                            .clip(RoundedCornerShape(8.dp))
                            .clickable(role = Role.Button) { onRemoveDownload() }
                            .padding(horizontal = 4.dp, vertical = 8.dp),
                    )
                }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            PlayerTool(
                label = "Speed",
                value = speedLabel,
                selected = speedSelected,
                onClick = onSpeed,
                modifier = Modifier.weight(1f),
            )
            PlayerTool(
                label = "Quality",
                value = qualityLabel,
                selected = qualitySelected,
                onClick = onQuality,
                modifier = Modifier.weight(1f),
            )
            PlayerTool(
                label = "Audio",
                value = audioLabel,
                selected = audioSelected,
                onClick = onAudio,
                modifier = Modifier.weight(1f),
            )
            if (showGrid) {
                PlayerTool(
                    label = "Episodes",
                    value = "E$episode",
                    selected = episodesSelected,
                    onClick = onEpisodes,
                    modifier = Modifier.weight(1f),
                )
            }
            PlayerTool(
                label = "Next",
                value = if (nextEnabled) "E${episode + 1}" else "—",
                enabled = nextEnabled,
                onClick = onNext,
                modifier = Modifier.weight(1f),
            )
        }
        if (showGrid) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.06f))
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                BasicTextField(
                    value = jump,
                    onValueChange = { next -> if (next.all { it.isDigit() }) jump = next },
                    textStyle = TextStyle(color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Go,
                    ),
                    keyboardActions = KeyboardActions(onGo = {
                        val picked = jump.toIntOrNull()
                        if (picked != null && picked in 1..totalEpisodes) {
                            onPickEpisode(picked)
                            jump = ""
                        }
                    }),
                    singleLine = true,
                    modifier = Modifier.fillMaxWidth(),
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
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("sub" to "Subtitled", "dub" to "Dubbed").forEach { (key, label) ->
                val selected = audio == key
                val background by animateColorAsState(
                    if (selected) Color.White else Color(0xFF0C0C10),
                    tween(180),
                    label = "audioBg",
                )
                val text by animateColorAsState(
                    if (selected) Color.Black else Color.White.copy(alpha = 0.7f),
                    tween(180),
                    label = "audioText",
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .spacePress { onPickAudio(key) }
                        .clip(RoundedCornerShape(12.dp))
                        .background(background)
                        .border(
                            0.5.dp,
                            if (selected) Color.White else Color.White.copy(alpha = 0.08f),
                            RoundedCornerShape(12.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = text,
                    )
                }
            }
        }
        if (showGrid) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    "Episodes",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    letterSpacing = (-0.2).sp,
                )
                Text(
                    "$totalEpisodes",
                    color = Color.White.copy(alpha = 0.45f),
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    if (autoNext) "Auto on" else "Auto off",
                    color = if (autoNext) Color.Black else Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (autoNext) Color.White else Color.White.copy(alpha = 0.06f))
                        .clickable(onClick = onToggleAutoNext)
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                )
            }
            val slides = if (episodeSlides.isNotEmpty()) {
                episodeSlides
            } else {
                (1..totalEpisodes).map { number ->
                    EpisodeSlide(number, "Episode $number", null)
                }
            }
            EpisodeCarousel(
                slides = slides,
                current = episode,
                watchedThrough = watchedThrough,
                currentProgress = positionFraction,
                fallbackArt = fallbackArt,
                onPick = onPickEpisode,
                onDark = true,
                minutesLeft = minutesLeft,
                onToggleWatched = onToggleWatched,
                anilistId = anilistId,
            )
            val upcoming = slides.filter { it.number > episode }.take(3)
            if (upcoming.isNotEmpty()) {
                Text(
                    "Next up",
                    color = Color.White.copy(alpha = 0.45f),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
                upcoming.forEach { next ->
                    Text(
                        "${next.number}. ${next.title.ifBlank { "Episode ${next.number}" }}",
                        color = Color.White,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onPickEpisode(next.number) }
                            .padding(vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
internal fun PlayerTool(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    enabled: Boolean = true,
) {
    Column(
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) Color.White.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.06f),
            )
            .clearAndSetSemantics { contentDescription = "$label, $value" }
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 4.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            value,
            color = if (enabled) Color.White else Color.White.copy(alpha = 0.35f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            label,
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 10.sp,
            maxLines = 1,
        )
    }
}

@Composable
internal fun PlayerMetaPill(label: String, emphasized: Boolean = false) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = Modifier
            .clip(shape)
            .background(if (emphasized) PlayerChrome.Accent else PlayerChrome.Disc)
            .border(
                1.dp,
                if (emphasized) PlayerChrome.Accent else PlayerChrome.DiscStroke,
                shape,
            )
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(
            label,
            color = if (emphasized) Color.Black else PlayerChrome.Graphite,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
    }
}

@Composable
internal fun ChromeDisc(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    size: androidx.compose.ui.unit.Dp = 40.dp,
    large: Boolean = false,
    accent: Boolean = false,
    focusRequester: FocusRequester? = null,
    content: @Composable () -> Unit,
) {
    val shape = CircleShape
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = modifier
            .size(size)
            .scale(if (focused) 1.06f else 1f)
            .clip(shape)
            .background(
                when {
                    accent -> PlayerChrome.Accent
                    large -> Color.White.copy(alpha = 0.14f)
                    else -> Color.White.copy(alpha = 0.08f)
                },
            )
            .border(
                if (focused) 2.dp else 0.5.dp,
                if (focused || accent) Color.White else Color.White.copy(alpha = 0.12f),
                shape,
            )
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { focused = it.isFocused }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}

@Composable
internal fun LiveClockText(
    player: Player?,
    scrubbing: Boolean,
    scrubValue: Float,
    durationMs: Long,
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
    val remain = (durationMs - shown).coerceAtLeast(0L)
    Text(
        "${formatClockPadded(shown)}  −${formatClockPadded(remain)}",
        color = Color.White,
        fontSize = 13.sp,
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        maxLines = 1,
        modifier = modifier,
    )
}

@Composable
internal fun PlayerCapsule(content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit) {
    Row(
        modifier = Modifier
            .height(48.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.Black.copy(alpha = 0.58f))
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
internal fun PillIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = description,
            tint = Color.White,
            modifier = Modifier.size(22.dp),
        )
    }
}

@Composable
internal fun PillLabel(
    label: String,
    description: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(48.dp)
            .clip(CircleShape)
            .clearAndSetSemantics { contentDescription = description }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = Color.White,
            fontSize = 13.sp,
            fontFamily = FontFamily.SansSerif,
            fontWeight = FontWeight.Medium,
        )
    }
}
