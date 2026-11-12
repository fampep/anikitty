package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyGlass
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittyText

/**
 * Glass meta pills — replaces plain `|` / `·` divider strings in chrome.
 */
@Composable
fun KittyMetaChips(
    items: List<String>,
    modifier: Modifier = Modifier,
    accentFirst: Boolean = false,
) {
    if (items.isEmpty()) return
    Row(
        modifier = modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        items.forEachIndexed { index, label ->
            KittyMetaChip(
                label = label,
                emphasized = accentFirst && index == 0,
            )
        }
    }
}

@Composable
fun KittyMetaChip(
    label: String,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(if (emphasized) KittyAccentGlow.copy(alpha = 0.18f) else KittyGlass)
            .background(
                Brush.verticalGradient(
                    listOf(
                        Color.White.copy(alpha = 0.10f),
                        Color.Transparent,
                    ),
                ),
            )
            .border(
                1.dp,
                if (emphasized) KittyAccentGlow.copy(alpha = 0.35f) else KittyOutlineSoft,
                shape,
            )
            .padding(horizontal = 10.dp, vertical = 4.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (emphasized) KittyText else KittyMuted,
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            maxLines = 1,
        )
    }
}
