// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.snap
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import site.anikitty.app.ui.app.spacePress
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyHaptics
import site.anikitty.app.ui.theme.KittyNavPillContent
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.prefersReducedMotion

data class KittyNavTab(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
)

private val DockFill = Color(0xF2101014)
private val DockStroke = Color.White.copy(alpha = 0.12f)
private val DockSelectedFill = Color.White
private val DockIdle = Color.White.copy(alpha = 0.48f)

/**
 * Floating glass capsule dock — same language as the home top pill.
 * Selected tab is a white chip with black icon/label; others stay quiet.
 */
@Composable
fun KittyBottomNav(
    tabs: List<KittyNavTab>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
    profileTabId: String? = null,
    profileImageUrl: String? = null,
) {
    val view = LocalView.current
    val reduced = prefersReducedMotion()
    val shape = RoundedCornerShape(28.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(horizontal = 14.dp, vertical = 8.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .height(64.dp)
                .shadow(
                    elevation = 18.dp,
                    shape = shape,
                    ambientColor = Color.Black.copy(alpha = 0.55f),
                    spotColor = Color.Black.copy(alpha = 0.4f),
                )
                .clip(shape)
                .background(DockFill)
                .border(1.dp, DockStroke, shape)
                .padding(horizontal = 6.dp, vertical = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { tab ->
                val selected = tab.id == selectedId
                val scale by animateFloatAsState(
                    targetValue = if (selected && !reduced) 1.0f else 1f,
                    animationSpec = if (reduced) snap() else tween(180),
                    label = "navScale",
                )
                val chipColor by animateColorAsState(
                    targetValue = if (selected) DockSelectedFill else Color.Transparent,
                    animationSpec = if (reduced) snap() else tween(200),
                    label = "navChip",
                )
                val tint by animateColorAsState(
                    targetValue = if (selected) Color.Black else DockIdle,
                    animationSpec = if (reduced) snap() else tween(180),
                    label = "navTint",
                )
                val chipShape = RoundedCornerShape(20.dp)
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .graphicsLayer(scaleX = scale, scaleY = scale)
                        .clip(chipShape)
                        .background(chipColor)
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = {
                                KittyHaptics.perform(view, KittyHaptics.Kind.Tick)
                                onSelect(tab.id)
                            },
                        )
                        .padding(horizontal = 4.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    if (tab.id == profileTabId && !profileImageUrl.isNullOrBlank()) {
                        AsyncImage(
                            model = profileImageUrl,
                            contentDescription = tab.label,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier
                                .size(22.dp)
                                .clip(CircleShape)
                                .border(
                                    width = if (selected) 1.5.dp else 0.dp,
                                    color = if (selected) Color.Black else Color.Transparent,
                                    shape = CircleShape,
                                ),
                        )
                    } else {
                        Icon(
                            imageVector = if (selected) tab.selectedIcon else tab.icon,
                            contentDescription = tab.label,
                            tint = tint,
                            modifier = Modifier.size(22.dp),
                        )
                    }
                    Spacer(modifier = Modifier.height(3.dp))
                    Text(
                        tab.label,
                        color = tint,
                        fontSize = 10.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        letterSpacing = (-0.1).sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                    )
                }
            }
        }
    }
}

/**
 * Living-room version of the phone dock. Same destinations, sized for a remote.
 * Focus fills the row white so the selection is obvious from the couch.
 */
@Composable
fun KittySideNav(
    tabs: List<KittyNavTab>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Column(
        modifier = modifier
            .width(196.dp)
            .fillMaxHeight()
            .clip(RoundedCornerShape(20.dp))
            .background(DockFill)
            .border(1.dp, KittyOutlineSoft, RoundedCornerShape(20.dp))
            .padding(10.dp),
        verticalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Text(
            "AniKitty",
            color = KittyAccent,
            fontWeight = FontWeight.Black,
            fontSize = 18.sp,
            modifier = Modifier.padding(start = 12.dp, top = 8.dp, bottom = 8.dp),
        )
        tabs.forEach { tab ->
            val selected = tab.id == selectedId
            var focused by remember { mutableStateOf(false) }
            val shape = RoundedCornerShape(14.dp)
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .onFocusChanged { focused = it.hasFocus }
                    .clip(shape)
                    .background(if (focused || selected) KittyAccent else Color.Transparent)
                    .border(
                        width = if (selected && !focused) 1.dp else 0.dp,
                        color = if (selected && !focused) KittyAccent else Color.Transparent,
                        shape = shape,
                    )
                    .clickable { onSelect(tab.id) }
                    .padding(horizontal = 12.dp, vertical = 10.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(10.dp),
            ) {
                Icon(
                    imageVector = if (selected) tab.selectedIcon else tab.icon,
                    contentDescription = tab.label,
                    tint = if (focused || selected) KittyOnAccent else KittyNavPillContent,
                    modifier = Modifier.size(22.dp),
                )
                Text(
                    tab.label,
                    color = if (focused || selected) KittyOnAccent else KittyNavPillContent,
                    fontSize = 15.sp,
                    fontWeight = if (selected || focused) FontWeight.Bold else FontWeight.Medium,
                    maxLines = 1,
                )
            }
        }
    }
}

@Composable
fun KittyRoundIconButton(
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .size(40.dp)
            .spacePress(onClick)
            .clip(CircleShape)
            .background(Color(0xE6141418))
            .border(1.dp, Color.White.copy(alpha = 0.16f), CircleShape),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}
