// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
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
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText

/** Solid meta pills for detail chrome. */
@Composable
fun KittyMetaChips(
    items: List<String>,
    modifier: Modifier = Modifier,
    accentFirst: Boolean = false,
    onItemClick: ((String) -> Unit)? = null,
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
                onClick = onItemClick?.let { click -> { click(label) } },
            )
        }
    }
}

@Composable
fun KittyMetaChip(
    label: String,
    modifier: Modifier = Modifier,
    emphasized: Boolean = false,
    onClick: (() -> Unit)? = null,
) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = modifier
            .clip(shape)
            .background(if (emphasized) KittyAccent else KittySurface)
            .border(
                1.dp,
                if (emphasized) KittyAccent else KittyOutlineSoft,
                shape,
            )
            .then(if (onClick != null) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 10.dp, vertical = 5.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = MaterialTheme.typography.labelMedium,
            color = if (emphasized) KittyOnAccent else KittyText,
            fontWeight = FontWeight.SemiBold,
            fontSize = 11.sp,
            maxLines = 1,
        )
    }
}
