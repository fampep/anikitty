// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

@file:OptIn(ExperimentalSharedTransitionApi::class)

package site.anikitty.app.ui.theme

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.OverlayClip
import androidx.compose.animation.SharedContentState
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.animation.core.CubicBezierEasing
import androidx.compose.animation.core.tween
import androidx.compose.runtime.Composable
import androidx.compose.runtime.staticCompositionLocalOf
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Rect
import androidx.compose.ui.layout.LayoutDirection
import androidx.compose.ui.unit.Density

val LocalSharedTransitionScope = staticCompositionLocalOf<SharedTransitionScope?> { null }
val LocalNavAnimatedVisibilityScope = staticCompositionLocalOf<AnimatedVisibilityScope?> { null }

/**
 * Key of the cover that is actually in flight. Null while browsing, so rows do not
 * register a shared element and scroll does not pay for one approach-layout per poster.
 */
val LocalActiveCoverKey = staticCompositionLocalOf<String?> { null }

private val CoverEasing = CubicBezierEasing(0.2f, 0.0f, 0.0f, 1f)

private val CoverBounds = BoundsTransform { _, _ ->
    tween(durationMillis = 380, easing = CoverEasing)
}

/** One instance. Parent clips must not freeze the overlay at the start size. */
private val NoOverlayClip = OverlayClip { _: SharedContentState, _: Rect, _: LayoutDirection, _: Density ->
    null
}

/** Stable id for one poster on one surface. The detail screen reuses the same string. */
fun coverKey(kind: String, id: Int, slot: String = ""): String =
    if (slot.isEmpty()) "cover:$kind:$id" else "cover:$kind:$slot:$id"

fun coverKeyIsBanner(key: String?): Boolean = key?.startsWith("cover:banner:") == true

/**
 * Shared bounds for a cover. Returns [this] unchanged unless [key] is the active flight,
 * so a list of posters does not enter the shared-element map while idle.
 * Put this outside clip and size so the overlay is the full image.
 */
@Composable
fun Modifier.sharedCover(key: String?): Modifier {
    if (key.isNullOrBlank() || key != LocalActiveCoverKey.current) return this
    val shared = LocalSharedTransitionScope.current ?: return this
    val visibility = LocalNavAnimatedVisibilityScope.current ?: return this
    return with(shared) {
        // sharedElement draws one bitmap in the overlay. sharedBounds would fade two copies.
        this@sharedCover.sharedElement(
            state = rememberSharedContentState(key = key),
            animatedVisibilityScope = visibility,
            boundsTransform = CoverBounds,
            clipInOverlayDuringTransition = NoOverlayClip,
        )
    }
}
