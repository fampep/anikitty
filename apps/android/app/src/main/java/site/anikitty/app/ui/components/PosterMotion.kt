// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.AnimatedVisibilityScope
import androidx.compose.animation.BoundsTransform
import androidx.compose.animation.ExperimentalSharedTransitionApi
import androidx.compose.animation.SharedTransitionScope
import androidx.compose.runtime.Composable
import androidx.compose.runtime.compositionLocalOf
import androidx.compose.ui.Modifier

/**
 * Home and search posters share this with the title backdrop.
 * Null outside the shared transition, so other screens stay plain.
 */
@OptIn(ExperimentalSharedTransitionApi::class)
class PosterMotion(
    val scope: SharedTransitionScope,
    val visibility: AnimatedVisibilityScope,
    val bounds: BoundsTransform,
)

@OptIn(ExperimentalSharedTransitionApi::class)
val LocalPosterMotion = compositionLocalOf<PosterMotion?> { null }

/**
 * One shared element per title. Home can show the same show in several rows;
 * the first poster in composition order owns the key.
 */
class PosterFlight {
    val claimed = HashSet<Int>()
}

val LocalPosterFlight = compositionLocalOf<PosterFlight?> { null }

@OptIn(ExperimentalSharedTransitionApi::class)
@Composable
fun Modifier.sharedPoster(id: Int): Modifier {
    val motion = LocalPosterMotion.current ?: return this
    val flight = LocalPosterFlight.current
    if (id <= 0) return this
    if (flight != null && !flight.claimed.add(id)) return this
    return with(motion.scope) {
        sharedElement(
            rememberSharedContentState(key = "art-$id"),
            animatedVisibilityScope = motion.visibility,
            boundsTransform = motion.bounds,
        )
    }
}
