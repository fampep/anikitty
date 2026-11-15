// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.navigationBars
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.ScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.ClosedCaption
import androidx.compose.material.icons.outlined.Equalizer
import androidx.compose.material.icons.outlined.PlayCircle
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

internal enum class PlayerMenuPage {
    None,
    Root,
    Speed,
    Quality,
    Subs,
    Size,
    Timing,
    Volume,
    Audio,
    Color,
    Edge,
    Background,
    Resize,
    Sleep,
}

internal fun playerMenuTitle(page: PlayerMenuPage): String = when (page) {
    PlayerMenuPage.Speed -> "Play Speed"
    PlayerMenuPage.Quality -> "Quality"
    PlayerMenuPage.Subs -> "Subtitles"
    PlayerMenuPage.Size -> "Subtitle Size"
    PlayerMenuPage.Timing -> "Subtitle Timing"
    PlayerMenuPage.Volume -> "Volume Boost"
    PlayerMenuPage.Audio -> "Audio Tracks"
    PlayerMenuPage.Color -> "Subtitle Color"
    PlayerMenuPage.Edge -> "Subtitle Edge"
    PlayerMenuPage.Background -> "Subtitle Background"
    PlayerMenuPage.Resize -> "Picture"
    PlayerMenuPage.Sleep -> "Sleep timer"
    PlayerMenuPage.None, PlayerMenuPage.Root -> ""
}

/**
 * Landscape theater: a floating card above the control bar, at most half
 * the width. Portrait and the inline player: a bottom sheet in the same
 * dark style. The card scrolls and stays inside the gesture and cutout insets.
 */
@Composable
internal fun PlayerMenuFrame(
    theater: Boolean,
    page: PlayerMenuPage,
    onBack: () -> Unit,
    onDismiss: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    BoxWithConstraints(modifier.fillMaxSize()) {
        val floating = theater && maxWidth > maxHeight
        if (!floating) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.28f))
                    .clickable(onClick = onDismiss),
            )
        }
        val half = maxWidth * 0.5f
        val panelWidth = if (half < 420.dp) half else 420.dp
        // Bottom padding, pill, gap, timeline, and a little air. Keeps the
        // scrubber and the pills uncovered in landscape.
        val aboveControls = 120.dp
        val maxPanel = if (floating) {
            (maxHeight - aboveControls - 8.dp).coerceAtLeast(140.dp)
        } else {
            maxHeight * 0.72f
        }
        val shape = if (floating) {
            RoundedCornerShape(16.dp)
        } else {
            RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
        }
        Column(
            modifier = Modifier
                .align(if (floating) Alignment.BottomEnd else Alignment.BottomCenter)
                .windowInsetsPadding(WindowInsets.navigationBars.union(WindowInsets.displayCutout))
                .padding(
                    end = if (floating) 12.dp else 0.dp,
                    bottom = if (floating) aboveControls else 0.dp,
                )
                .then(if (floating) Modifier.width(panelWidth) else Modifier.fillMaxWidth())
                .heightIn(max = maxPanel)
                .clip(shape)
                .background(Color.Black.copy(alpha = 0.78f))
                .pointerInput(Unit) { detectTapGestures { } },
        ) {
            if (page != PlayerMenuPage.Root && page != PlayerMenuPage.None) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(56.dp)
                        .clickable(onClick = onBack)
                        .padding(start = 4.dp, end = 16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                        Icon(
                            Icons.AutoMirrored.Outlined.ArrowBack,
                            contentDescription = "Back",
                            tint = Color.White,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Text(
                        playerMenuTitle(page),
                        color = Color.White,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.Normal,
                        fontFamily = FontFamily.SansSerif,
                    )
                }
            }
            Column(modifier = Modifier.verticalScroll(remember(page) { ScrollState(0) })) {
                content()
            }
        }
    }
}

@Composable
internal fun PlayerMenuRow(
    label: String,
    value: String = "",
    icon: ImageVector? = null,
    glyph: String? = null,
    selected: Boolean = false,
    showChevron: Boolean = false,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(60.dp)
            .background(if (selected) Color.White.copy(alpha = 0.10f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
            when {
                icon != null -> Icon(
                    icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(22.dp),
                )
                glyph != null -> Text(
                    glyph,
                    color = Color.White,
                    fontSize = 18.sp,
                    fontFamily = FontFamily.SansSerif,
                )
            }
        }
        Text(
            label,
            color = Color.White,
            fontSize = 16.sp,
            fontWeight = FontWeight.Normal,
            fontFamily = FontFamily.SansSerif,
            modifier = Modifier.weight(1f),
        )
        if (value.isNotEmpty()) {
            Text(
                value,
                color = Color(0xFFB5B5B5),
                fontSize = 14.sp,
                fontFamily = FontFamily.SansSerif,
                modifier = Modifier.padding(end = 4.dp),
            )
        }
        if (showChevron) {
            Icon(
                Icons.AutoMirrored.Outlined.KeyboardArrowRight,
                contentDescription = null,
                tint = Color(0xFF9A9A9A),
                modifier = Modifier.size(22.dp),
            )
        } else if (selected) {
            Icon(
                Icons.Outlined.Check,
                contentDescription = null,
                tint = Color.White,
                modifier = Modifier.size(20.dp),
            )
        }
    }
}

@Preview(name = "Phone landscape", widthDp = 800, heightDp = 360)
@Composable
private fun PlayerMenuLandscapePreview() {
    Box(Modifier.fillMaxSize().background(Color(0xFF1A1A1A))) {
        PlayerMenuFrame(
            theater = true,
            page = PlayerMenuPage.Root,
            onBack = {},
            onDismiss = {},
        ) {
            PreviewRows()
        }
        Row(
            modifier = Modifier
                .align(Alignment.BottomEnd)
                .padding(end = 22.dp, bottom = 20.dp)
                .height(48.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(Color.Black.copy(alpha = 0.58f))
                .padding(horizontal = 8.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            listOf("10", "10", "85", "gear").forEach {
                Box(
                    Modifier.size(48.dp),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(it, color = Color.White, fontSize = 12.sp)
                }
            }
        }
    }
}

@Preview(name = "Phone portrait", widthDp = 360, heightDp = 800)
@Composable
private fun PlayerMenuPortraitPreview() {
    Box(Modifier.fillMaxSize().background(Color(0xFF1A1A1A))) {
        PlayerMenuFrame(
            theater = false,
            page = PlayerMenuPage.Speed,
            onBack = {},
            onDismiss = {},
        ) {
            listOf("0.75×" to false, "Normal" to true, "1.25×" to false, "1.5×" to false, "2×" to false)
                .forEach { (label, selected) ->
                    PlayerMenuRow(label = label, selected = selected, onClick = {})
                }
        }
    }
}

@Composable
private fun PreviewRows() {
    PlayerMenuRow(label = "Play Speed", value = "Normal", icon = Icons.Outlined.PlayCircle, showChevron = true, onClick = {})
    PlayerMenuRow(label = "Quality", value = "Auto (1080p)", icon = Icons.Outlined.Equalizer, showChevron = true, onClick = {})
    PlayerMenuRow(label = "Subtitles", value = "English", icon = Icons.Outlined.ClosedCaption, showChevron = true, onClick = {})
    PlayerMenuRow(label = "Subtitle Size", value = "100%", glyph = "T", showChevron = true, onClick = {})
    PlayerMenuRow(label = "Subtitle Timing", value = "High", icon = Icons.Outlined.Schedule, showChevron = true, onClick = {})
    PlayerMenuRow(label = "Volume Boost", value = "Off", showChevron = true, onClick = {})
    PlayerMenuRow(label = "Audio Tracks", value = "Sub", showChevron = true, onClick = {})
    PlayerMenuRow(label = "Episodes", showChevron = true, onClick = {})
    PlayerMenuRow(label = "Next episode", showChevron = true, onClick = {})
}
