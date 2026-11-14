// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.MoreVert
import androidx.compose.material3.DropdownMenu
import androidx.compose.material3.DropdownMenuItem
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.app.spacePress
import site.anikitty.app.ui.theme.KittyHaptics

data class KittyMenuEntry(
    val label: String,
    val onClick: () -> Unit,
)

/** Layered black menu. One surface, hairline, no extra decoration. */
@Composable
fun KittyMenu(
    expanded: Boolean,
    onDismiss: () -> Unit,
    entries: List<KittyMenuEntry>,
) {
    DropdownMenu(
        expanded = expanded,
        onDismissRequest = onDismiss,
        shape = RoundedCornerShape(14.dp),
        containerColor = Color(0xFF101014),
        tonalElevation = 6.dp,
        shadowElevation = 16.dp,
        border = BorderStroke(0.5.dp, Color.White.copy(alpha = 0.16f)),
    ) {
        entries.forEachIndexed { index, entry ->
            if (index > 0) {
                HorizontalDivider(color = Color.White.copy(alpha = 0.08f), thickness = 0.5.dp)
            }
            DropdownMenuItem(
                text = {
                    Text(
                        entry.label,
                        color = Color.White,
                        fontSize = 14.sp,
                        fontWeight = FontWeight.Medium,
                    )
                },
                onClick = {
                    onDismiss()
                    entry.onClick()
                },
            )
        }
    }
}

@Composable
fun KittyOverflow(
    contentDescription: String,
    entries: List<KittyMenuEntry>,
    modifier: Modifier = Modifier,
    tint: Color = Color.White,
) {
    var open by remember { mutableStateOf(false) }
    val view = LocalView.current
    Box(modifier) {
        Icon(
            Icons.Outlined.MoreVert,
            contentDescription = contentDescription,
            tint = tint,
            modifier = Modifier
                .size(22.dp)
                .spacePress {
                    KittyHaptics.perform(view, KittyHaptics.Kind.Tick)
                    open = true
                },
        )
        KittyMenu(expanded = open, onDismiss = { open = false }, entries = entries)
    }
}
