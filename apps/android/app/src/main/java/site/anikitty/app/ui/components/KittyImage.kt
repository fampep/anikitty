// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest

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
    placeholder: Color = Color(0xFF141416),
) {
    val context = LocalContext.current
    if (url.isNullOrBlank()) {
        Box(modifier.background(placeholder))
        return
    }
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
        modifier = modifier.background(placeholder),
    )
}
