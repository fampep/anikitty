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
    Row(modifier = modifier, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
        listOfNotNull(badge.quality, badge.qualityRating, badge.audio).distinct().forEach { label ->
            KittyBadge(label = label, onDark = onDark)
        }
    }
}
