// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

package site.anikitty.app.ui.components

import androidx.compose.animation.core.animateFloatAsState
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
import androidx.compose.foundation.layout.fillMaxSize
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
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyNavPillContent
import site.anikitty.app.ui.theme.KittyNavPillSurface
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurfaceElevated

data class KittyNavTab(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
)

/** Full-width dock — icon + tiny label, white when selected, hairline on top. */
@Composable
fun KittyBottomNav(
    tabs: List<KittyNavTab>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    Box(
        modifier = modifier
            .fillMaxWidth()
            .background(KittyNavPillSurface)
            .drawBehind {
                drawLine(
                    color = Color.White.copy(alpha = 0.08f),
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = 1.dp.toPx(),
                )
            }
            .navigationBarsPadding()
            .height(56.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier.fillMaxSize(),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { tab ->
                val selected = tab.id == selectedId
                val scale by animateFloatAsState(
                    targetValue = if (selected) 1.05f else 1f,
                    animationSpec = tween(150),
                    label = "navScale",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .fillMaxHeight()
                        .clickable(
                            interactionSource = remember { MutableInteractionSource() },
                            indication = null,
                            onClick = { onSelect(tab.id) },
                        ),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        imageVector = if (selected) tab.selectedIcon else tab.icon,
                        contentDescription = tab.label,
                        tint = if (selected) KittyAccent else KittyNavPillContent,
                        modifier = Modifier
                            .graphicsLayer(scaleX = scale, scaleY = scale)
                            .size(18.dp),
                    )
                    Spacer(modifier = Modifier.height(2.dp))
                    Text(
                        tab.label,
                        color = if (selected) KittyAccent else KittyNavPillContent,
                        fontSize = 9.sp,
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
                        maxLines = 1,
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
            .background(KittyNavPillSurface)
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
                    .background(if (focused) KittyAccent else Color.Transparent)
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
                    tint = if (focused) KittyOnAccent else if (selected) KittyAccent else KittyNavPillContent,
                    modifier = Modifier.size(22.dp),
                )
                Text(
                    tab.label,
                    color = if (focused) KittyOnAccent else if (selected) KittyAccent else KittyNavPillContent,
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
            .clip(CircleShape)
            .background(KittySurfaceElevated)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}
