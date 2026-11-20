// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

/**
 * Whether the player should send the current episode to a Chromecast that is
 * already connected. A session that arrives before the stream list is ready
 * stays pending and loads once, not on every later callback.
 */
internal data class CastAttachDecision(
    val pending: Boolean,
    val loadStarted: Boolean,
    val load: Boolean,
)

internal fun reduceCastAttach(
    pending: Boolean,
    loadStarted: Boolean,
    sessionUp: Boolean,
    hasSource: Boolean,
): CastAttachDecision {
    if (!sessionUp) {
        return CastAttachDecision(pending = false, loadStarted = false, load = false)
    }
    if (loadStarted) {
        return CastAttachDecision(pending = false, loadStarted = true, load = false)
    }
    if (!hasSource) {
        return CastAttachDecision(pending = true, loadStarted = false, load = false)
    }
    return CastAttachDecision(pending = false, loadStarted = true, load = true)
}
