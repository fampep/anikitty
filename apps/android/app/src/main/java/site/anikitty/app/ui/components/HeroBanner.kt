// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import android.graphics.Bitmap
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import coil.compose.AsyncImage
import coil.request.ImageRequest
import coil.size.Size
import coil.transform.Transformation
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import site.anikitty.app.data.banner.BannerChoice
import site.anikitty.app.data.banner.BannerRepository

/** Landscape hero. Resolves a wider backdrop, and blurs a cover when that is all we have. */
@Composable
fun HeroBanner(
    anilistId: Int,
    bannerUrl: String?,
    coverUrl: String?,
    contentDescription: String?,
    modifier: Modifier = Modifier,
    contentScale: ContentScale = ContentScale.Crop,
) {
    val localArt = bannerUrl?.startsWith("android.resource://") == true ||
        coverUrl?.startsWith("android.resource://") == true
    if (localArt) {
        AsyncImage(
            model = ImageRequest.Builder(LocalContext.current)
                .data(bannerUrl ?: coverUrl)
                .size(Size(1280, 720))
                .crossfade(false)
                .build(),
            contentDescription = contentDescription,
            contentScale = contentScale,
            modifier = modifier,
        )
        return
    }
    val context = LocalContext.current
    val repo = remember { BannerRepository(context) }
    var choice by remember(anilistId, bannerUrl, coverUrl) {
        mutableStateOf<BannerChoice?>(null)
    }
    LaunchedEffect(anilistId, bannerUrl, coverUrl) {
        choice = withContext(Dispatchers.IO) {
            repo.resolve(anilistId, bannerUrl, coverUrl)
        }
    }
    val shown = choice
    val model = if (shown == null) {
        bannerUrl ?: coverUrl
    } else {
        ImageRequest.Builder(context)
            .data(shown.url)
            .size(Size(1280, 720))
            .apply { if (shown.blur) transformations(SoftCover) }
            .build()
    }
    Box(modifier) {
        AsyncImage(
            model = model,
            contentDescription = contentDescription,
            modifier = Modifier.fillMaxSize(),
            contentScale = contentScale,
        )
    }
}

private object SoftCover : Transformation {
    override val cacheKey: String = "anikitty-soft-cover"

    override suspend fun transform(input: Bitmap, size: Size): Bitmap {
        val tiny = Bitmap.createScaledBitmap(input, 28, 16, true)
        val wide = Bitmap.createScaledBitmap(tiny, input.width.coerceAtMost(640), input.height.coerceAtMost(280), true)
        val out = wide.copy(Bitmap.Config.ARGB_8888, true)
        val pixels = IntArray(out.width * out.height)
        out.getPixels(pixels, 0, out.width, 0, 0, out.width, out.height)
        for (i in pixels.indices) {
            val color = pixels[i]
            val a = color ushr 24
            val r = ((color shr 16) and 0xFF) * 4 / 10
            val g = ((color shr 8) and 0xFF) * 4 / 10
            val b = (color and 0xFF) * 4 / 10
            pixels[i] = (a shl 24) or (r shl 16) or (g shl 8) or b
        }
        out.setPixels(pixels, 0, out.width, 0, 0, out.width, out.height)
        if (tiny !== input) tiny.recycle()
        if (wide !== out) wide.recycle()
        return out
    }
}
