// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.painter.ColorPainter
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest
import site.anikitty.app.ui.theme.LocalKittyPalette

/**
 * Poster and backdrop requests are decoded to the slot, then kept in Coil's
 * memory and disk caches. The first paint is a flat placeholder, not a spinner.
 */
@Composable
fun KittyImage(
    url: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    widthPx: Int = 480,
    heightPx: Int = 720,
    contentScale: ContentScale = ContentScale.Crop,
    alignment: Alignment = Alignment.Center,
    placeholder: Color? = null,
) {
    val context = LocalContext.current
    val matteColor = placeholder ?: LocalKittyPalette.current.surface
    if (url.isNullOrBlank()) {
        Box(modifier.background(matteColor))
        return
    }
    val matte = if (matteColor.alpha > 0f) ColorPainter(matteColor) else null
    AsyncImage(
        model = ImageRequest.Builder(context)
            .data(url)
            .size(widthPx, heightPx)
            .crossfade(180)
            .memoryCacheKey("$url@$widthPx")
            .diskCacheKey("$url@$widthPx")
            .build(),
        contentDescription = contentDescription,
        contentScale = contentScale,
        alignment = alignment,
        placeholder = matte,
        error = matte,
        modifier = modifier,
    )
}
