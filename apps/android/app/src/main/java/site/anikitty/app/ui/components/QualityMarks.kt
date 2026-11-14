// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.data.servers.SourceBadgeCache

/** Extension-reported marks. Renders nothing when the source omitted every field. */
@Composable
fun QualityMarks(
    badge: SourceBadgeCache.Badge?,
    modifier: Modifier = Modifier,
    onDark: Boolean = true,
) {
    if (badge == null || !badge.visible) return
    val ink = if (onDark) Color.White else Color.Black
    val plate = if (onDark) Color.Black.copy(alpha = 0.55f) else Color.White.copy(alpha = 0.88f)
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOfNotNull(badge.quality, badge.qualityRating, badge.audio).distinct().forEach { label ->
            Text(
                label,
                color = ink,
                fontSize = 9.sp,
                fontWeight = FontWeight.SemiBold,
                maxLines = 1,
                modifier = Modifier
                    .background(plate, RoundedCornerShape(6.dp))
                    .border(0.5.dp, ink.copy(alpha = 0.28f), RoundedCornerShape(6.dp))
                    .padding(horizontal = 5.dp, vertical = 2.dp),
            )
        }
    }
}
