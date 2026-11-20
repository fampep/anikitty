// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

/**
 * Whether the player should send the current episode to a Chromecast that is
 * already connected. A session that arrives before the stream list is ready
 * stays pending and loads once, not on every later callback.
 * A quality, audio, or failover change replaces an in-flight load.
 */
internal data class CastAttachDecision(
    val pending: Boolean,
    val loadStarted: Boolean,
    val load: Boolean,
)

internal enum class CastSessionReadiness {
    Down,
    Connecting,
    Ready,
}

/**
 * `isConnected` can be true before [remoteMediaClient] exists. Attaching then
 * fails, and the later availability callback is easy to drop. Wait until the
 * client (or CastPlayer) is actually ready.
 */
internal fun castSessionReadiness(
    connected: Boolean,
    hasRemoteClient: Boolean,
    playerSessionAvailable: Boolean,
): CastSessionReadiness {
    if (hasRemoteClient || playerSessionAvailable) return CastSessionReadiness.Ready
    if (connected) return CastSessionReadiness.Connecting
    return CastSessionReadiness.Down
}

internal fun reduceCastAttach(
    pending: Boolean,
    loadStarted: Boolean,
    sessionUp: Boolean,
    hasSource: Boolean,
    sourceChanged: Boolean = false,
    sessionConnecting: Boolean = false,
): CastAttachDecision {
    if (!sessionUp) {
        return CastAttachDecision(
            pending = sessionConnecting,
            loadStarted = false,
            load = false,
        )
    }
    if (loadStarted && !sourceChanged) {
        return CastAttachDecision(pending = false, loadStarted = true, load = false)
    }
    if (!hasSource) {
        return CastAttachDecision(pending = true, loadStarted = false, load = false)
    }
    return CastAttachDecision(pending = false, loadStarted = true, load = true)
}

/**
 * Playhead to send when attaching. A local player that has not started
 * reports 0; the saved resume must win until playback has actually moved.
 * A live position past a couple of seconds is the one the person is watching.
 */
internal fun castAttachPositionMs(
    localPositionMs: Long,
    resumeAtMs: Long,
    startPositionMs: Long,
    allowHistoryFallback: Boolean,
): Long {
    val local = localPositionMs.coerceAtLeast(0L)
    if (local > 2_000L) return local
    val resume = resumeAtMs.coerceAtLeast(0L)
    val history = if (allowHistoryFallback) startPositionMs.coerceAtLeast(0L) else 0L
    return maxOf(local, resume, history)
}
