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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.theme.KittyAccentGlow
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

/** Floating glass capsule — content scrolls edge-to-edge behind it. */
@Composable
fun KittyBottomNav(
    tabs: List<KittyNavTab>,
    selectedId: String,
    onSelect: (String) -> Unit,
    modifier: Modifier = Modifier,
) {
    val pill = RoundedCornerShape(22.dp)
    Box(
        modifier = modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(start = 16.dp, end = 16.dp, top = 4.dp, bottom = 10.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(
            modifier = Modifier
                .widthIn(max = 420.dp)
                .fillMaxWidth()
                .height(60.dp)
                .shadow(
                    elevation = 24.dp,
                    shape = pill,
                    clip = false,
                    ambientColor = KittyAccentGlow.copy(alpha = 0.25f),
                    spotColor = Color.Black.copy(alpha = 0.55f),
                )
                .clip(pill)
                .background(KittyNavPillSurface)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.White.copy(alpha = 0.14f),
                            Color.White.copy(alpha = 0.03f),
                            Color.Transparent,
                            Color.Black.copy(alpha = 0.22f),
                        ),
                    ),
                )
                .border(1.dp, KittyNavPillBorder, pill)
                .padding(horizontal = 6.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.SpaceEvenly,
        ) {
            tabs.forEach { tab ->
                val selected = tab.id == selectedId
                val bg by animateColorAsState(
                    if (selected) KittyNavPillSelected else Color.Transparent,
                    animationSpec = tween(240, easing = FastOutSlowInEasing),
                    label = "navBg",
                )
                val fg by animateColorAsState(
                    if (selected) KittyNavPillSelectedContent else KittyNavPillContent,
                    animationSpec = tween(240, easing = FastOutSlowInEasing),
                    label = "navFg",
                )
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .height(48.dp)
                        .clip(RoundedCornerShape(16.dp))
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
                        fontWeight = if (selected) FontWeight.Bold else FontWeight.Medium,
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
            .size(42.dp)
            .clip(CircleShape)
            .background(KittyNavPillSurface)
            .background(
                Brush.verticalGradient(
                    listOf(Color.White.copy(alpha = 0.10f), Color.Transparent),
                ),
            )
            .border(1.dp, KittyNavPillBorder, CircleShape)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}
