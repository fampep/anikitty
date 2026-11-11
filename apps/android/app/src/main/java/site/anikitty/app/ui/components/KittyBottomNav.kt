package site.anikitty.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.material3.ripple
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.theme.KittyNavPillBorder
import site.anikitty.app.ui.theme.KittyNavPillContent
import site.anikitty.app.ui.theme.KittyNavPillSelected
import site.anikitty.app.ui.theme.KittyNavPillSelectedContent
import site.anikitty.app.ui.theme.KittyNavPillSurface

data class KittyNavTab(
    val id: String,
    val label: String,
    val icon: ImageVector,
    val selectedIcon: ImageVector,
)

/** Floating capsule tab bar — content scrolls edge-to-edge behind it. */
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
            .navigationBarsPadding()
            .padding(start = 20.dp, end = 20.dp, top = 8.dp, bottom = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier
                .widthIn(max = 380.dp)
                .fillMaxWidth()
                .height(60.dp)
                .clip(RoundedCornerShape(30.dp))
                .background(KittyNavPillSurface)
                .border(1.dp, KittyNavPillBorder, RoundedCornerShape(30.dp))
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { tab ->
                val selected = tab.id == selectedId
                val bg by animateColorAsState(
                    if (selected) KittyNavPillSelected else KittyNavPillSurface.copy(alpha = 0f),
                    animationSpec = tween(220, easing = FastOutSlowInEasing),
                    label = "navBg",
                )
                val fg by animateColorAsState(
                    if (selected) KittyNavPillSelectedContent else KittyNavPillContent,
                    animationSpec = tween(220, easing = FastOutSlowInEasing),
                    label = "navFg",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .clip(RoundedCornerShape(24.dp))
                        .background(bg)
                        .selectable(
                            selected = selected,
                            onClick = { onSelect(tab.id) },
                            role = Role.Tab,
                            interactionSource = remember { MutableInteractionSource() },
                            indication = ripple(bounded = true),
                        ),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.Center,
                ) {
                    Icon(
                        imageVector = if (selected) tab.selectedIcon else tab.icon,
                        contentDescription = tab.label,
                        tint = fg,
                        modifier = Modifier.size(22.dp),
                    )
                    Text(
                        tab.label,
                        color = fg,
                        fontSize = 10.sp,
                        fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Medium,
                        maxLines = 1,
                    )
                }
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
            .background(KittyNavPillSurface.copy(alpha = 0.72f))
            .border(1.dp, KittyNavPillBorder, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}
