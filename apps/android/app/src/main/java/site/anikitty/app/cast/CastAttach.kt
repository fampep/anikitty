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
 * Ready means the receiver [remoteMediaClient] exists. CastPlayer can report
 * the session as available, and the session can be connected, before that
 * client exists. Loading then fails and must not be treated as a reason to
 * load again immediately.
 */
internal fun castSessionReadiness(
    connected: Boolean,
    hasRemoteClient: Boolean,
    playerSessionAvailable: Boolean,
): CastSessionReadiness {
    if (hasRemoteClient) return CastSessionReadiness.Ready
    if (connected || playerSessionAvailable) return CastSessionReadiness.Connecting
    return CastSessionReadiness.Down
}

/** How many times to retry a load that failed because the receiver client was missing. */
internal const val CAST_CLIENT_RETRY_LIMIT = 3

/**
 * Backoff before retry [attempt] (1-based). Null means stop and play on the phone.
 */
internal fun castClientRetryDelayMs(attempt: Int): Long? {
    if (attempt !in 1..CAST_CLIENT_RETRY_LIMIT) return null
    return 400L shl (attempt - 1)
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
 * Playhead to send when attaching. A resume that is still pending wins even
 * if the phone has been playing from the start for a few seconds. A live
 * playhead wins only after that resume has been applied, or history is no
 * longer allowed.
 */
internal fun castAttachPositionMs(
    localPositionMs: Long,
    resumeAtMs: Long,
    startPositionMs: Long,
    allowHistoryFallback: Boolean,
    pendingResume: Boolean = false,
): Long {
    val local = localPositionMs.coerceAtLeast(0L)
    val resume = resumeAtMs.coerceAtLeast(0L)
    val history = if (allowHistoryFallback) startPositionMs.coerceAtLeast(0L) else 0L
    val saved = maxOf(resume, history)
    if (pendingResume && saved > 0L) return saved
    if (local > 2_000L) return local
    return maxOf(local, saved)
}
