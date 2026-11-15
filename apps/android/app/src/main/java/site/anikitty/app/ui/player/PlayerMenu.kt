// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
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
import androidx.compose.foundation.layout.statusBars
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
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.remember
import androidx.compose.runtime.staticCompositionLocalOf
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

private val LocalMenuCompact = staticCompositionLocalOf { false }

/**
 * Sized from the space left after cutouts and system bars.
 * A short landscape phone stays above the pills. A narrow portrait
 * phone uses a bottom sheet. A tablet stays a 360dp card.
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
    Box(
        modifier
            .fillMaxSize()
            .windowInsetsPadding(
                WindowInsets.navigationBars
                    .union(WindowInsets.displayCutout)
                    .union(WindowInsets.statusBars),
            ),
    ) {
        BoxWithConstraints(Modifier.fillMaxSize()) {
            val landscape = maxWidth > maxHeight
            val shortSide = if (maxWidth < maxHeight) maxWidth else maxHeight
            val tablet = shortSide >= 600.dp
            val compactHeight = maxHeight < 480.dp
            val sheet = !tablet && !landscape
            val floating = !sheet
            if (sheet) {
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(Color.Black.copy(alpha = 0.28f))
                        .clickable(onClick = onDismiss),
                )
            }
            val aboveControls = if (compactHeight) 112.dp else 120.dp
            val room = maxHeight - aboveControls - 8.dp
            val panelMax = if (sheet) maxHeight * 0.60f else room.coerceAtLeast(48.dp)
            val panelWidth = if (tablet) {
                360.dp
            } else if (sheet) {
                maxWidth
            } else {
                maxWidth * 0.45f
            }
            val shape = if (sheet) {
                RoundedCornerShape(topStart = 16.dp, topEnd = 16.dp)
            } else {
                RoundedCornerShape(16.dp)
            }
            Column(
                modifier = Modifier
                    .align(if (sheet) Alignment.BottomCenter else Alignment.BottomEnd)
                    .padding(
                        start = if (sheet) 0.dp else 12.dp,
                        end = if (sheet) 0.dp else 12.dp,
                        bottom = if (theater && landscape) aboveControls else 0.dp,
                    )
                    .then(if (sheet) Modifier.fillMaxWidth() else Modifier.width(panelWidth))
                    .heightIn(max = panelMax)
                    .clip(shape)
                    .background(Color.Black.copy(alpha = 0.78f))
                    .pointerInput(Unit) { detectTapGestures { } },
            ) {
                if (page != PlayerMenuPage.Root && page != PlayerMenuPage.None) {
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(if (compactHeight) 48.dp else 56.dp)
                            .clickable(onClick = onBack)
                            .padding(end = 12.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
                            Icon(
                                Icons.AutoMirrored.Outlined.ArrowBack,
                                contentDescription = "Back",
                                tint = Color.White,
                                modifier = Modifier.size(if (compactHeight) 20.dp else 22.dp),
                            )
                        }
                        Text(
                            playerMenuTitle(page),
                            color = Color.White,
                            fontSize = if (compactHeight) 14.sp else 16.sp,
                            fontWeight = FontWeight.Normal,
                            fontFamily = FontFamily.SansSerif,
                            maxLines = 1,
                        )
                    }
                }
                Column(
                    modifier = Modifier
                        .weight(1f, fill = false)
                        .verticalScroll(remember(page) { ScrollState(0) }),
                ) {
                    CompositionLocalProvider(LocalMenuCompact provides compactHeight) {
                        content()
                    }
                }
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
    val compact = LocalMenuCompact.current
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .height(if (compact) 48.dp else 60.dp)
            .background(if (selected) Color.White.copy(alpha = 0.10f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Box(Modifier.size(48.dp), contentAlignment = Alignment.Center) {
            when {
                icon != null -> Icon(
                    icon,
                    contentDescription = null,
                    tint = Color.White,
                    modifier = Modifier.size(if (compact) 20.dp else 22.dp),
                )
                glyph != null -> Text(
                    glyph,
                    color = Color.White,
                    fontSize = if (compact) 16.sp else 18.sp,
                    fontFamily = FontFamily.SansSerif,
                )
            }
        }
        Text(
            label,
            color = Color.White,
            fontSize = if (compact) 14.sp else 16.sp,
            fontWeight = FontWeight.Normal,
            fontFamily = FontFamily.SansSerif,
            modifier = Modifier.weight(1f),
        )
        if (value.isNotEmpty()) {
            Text(
                value,
                color = Color(0xFFB5B5B5),
                fontSize = if (compact) 13.sp else 14.sp,
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

@Preview(name = "320x640", widthDp = 320, heightDp = 640)
@Composable
private fun Preview320x640() = MenuPreview(sheet = true)

@Preview(name = "360x800", widthDp = 360, heightDp = 800)
@Composable
private fun Preview360x800() = MenuPreview(sheet = true)

@Preview(name = "800x360", widthDp = 800, heightDp = 360)
@Composable
private fun Preview800x360() = MenuPreview(sheet = false)

@Preview(name = "640x320", widthDp = 640, heightDp = 320)
@Composable
private fun Preview640x320() = MenuPreview(sheet = false)

@Preview(name = "Tablet landscape", widthDp = 1280, heightDp = 800)
@Composable
private fun PreviewTabletLandscape() = MenuPreview(sheet = false)

@Preview(name = "Tablet portrait", widthDp = 800, heightDp = 1280)
@Composable
private fun PreviewTabletPortrait() = MenuPreview(sheet = false)

@Composable
private fun MenuPreview(sheet: Boolean) {
    Box(Modifier.fillMaxSize().background(Color(0xFF1A1A1A))) {
        PlayerMenuFrame(
            theater = !sheet,
            page = PlayerMenuPage.Root,
            onBack = {},
            onDismiss = {},
        ) {
            PreviewRows()
        }
        if (!sheet) {
            Row(
                modifier = Modifier
                    .align(Alignment.BottomEnd)
                    .padding(end = 22.dp, bottom = 20.dp)
                    .height(48.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.Black.copy(alpha = 0.58f))
                    .padding(horizontal = 8.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text("pills", color = Color.White, fontSize = 12.sp, modifier = Modifier.padding(horizontal = 12.dp))
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
