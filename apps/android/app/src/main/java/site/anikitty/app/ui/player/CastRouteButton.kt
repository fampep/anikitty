// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import android.view.ContextThemeWrapper
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.Cast
import androidx.compose.material3.Icon
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.mediarouter.app.MediaRouteButton
import com.google.android.gms.cast.framework.CastButtonFactory
import site.anikitty.app.R

/**
 * System Cast picker. When [unavailable] is set, the control stays visible
 * and a tap reports that reason instead of the Cast SDK hiding the button.
 */
@Composable
fun CastRouteButton(
    unavailable: String? = null,
    onUnavailable: (String) -> Unit = {},
    modifier: Modifier = Modifier,
) {
    if (unavailable != null) {
        Box(
            modifier = modifier
                .size(48.dp)
                .clickable(
                    interactionSource = remember { MutableInteractionSource() },
                    indication = null,
                    role = Role.Button,
                    onClick = { onUnavailable(unavailable) },
                ),
            contentAlignment = Alignment.Center,
        ) {
            Icon(
                Icons.Outlined.Cast,
                contentDescription = castButtonDescription(unavailable),
                tint = Color.White.copy(alpha = 0.38f),
                modifier = Modifier.size(22.dp),
            )
        }
        return
    }
    AndroidView(
        factory = { ctx ->
            val themed = ContextThemeWrapper(ctx, R.style.Theme_AniKitty_CastButton)
            MediaRouteButton(themed).also { button ->
                button.contentDescription = castButtonDescription(null)
                runCatching {
                    CastButtonFactory.setUpMediaRouteButton(themed, button)
                }
            }
        },
        modifier = modifier.size(48.dp),
    )
}
