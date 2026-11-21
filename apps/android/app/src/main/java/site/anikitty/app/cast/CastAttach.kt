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

/**
 * A give-up only stops the wait that just ended. CastPlayer's availability
 * signal starts a fresh wait even when the receiver client is not ready yet,
 * because that callback usually fires only once.
 */
internal data class CastGiveUpReset(
    val gaveUp: Boolean,
    val retry: Int,
    val pending: Boolean,
    val load: Boolean,
)

internal fun reduceCastGiveUp(
    gaveUp: Boolean,
    retry: Int,
    pending: Boolean,
    availabilitySignaled: Boolean,
    clientReady: Boolean,
): CastGiveUpReset {
    if (!availabilitySignaled) {
        return CastGiveUpReset(gaveUp = gaveUp, retry = retry, pending = pending, load = false)
    }
    if (!clientReady) {
        return CastGiveUpReset(gaveUp = false, retry = 0, pending = true, load = false)
    }
    return CastGiveUpReset(gaveUp = false, retry = 0, pending = false, load = true)
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

/** The phone stays silent while the TV has the episode, or while that handoff is still starting. */
internal fun castPhoneShouldStayQuiet(
    casting: Boolean,
    handoff: Boolean,
    pending: Boolean,
): Boolean = casting || handoff || pending

/**
 * The receiver often opens at the start even when the load asked for a later
 * playhead, and a new episode can still be sitting on the previous ending.
 * One seek after it is playing puts the TV on the playhead we asked for.
 * A missing request is not a request to start at zero.
 */
internal fun castReceiverNeedsSeek(requestedMs: Long, receiverMs: Long): Boolean {
    if (requestedMs < 0L) return false
    val requested = requestedMs.coerceAtLeast(0L)
    val receiver = receiverMs.coerceAtLeast(0L)
    return kotlin.math.abs(requested - receiver) > 3_000L
}

/**
 * Only a load this screen started may correct the receiver. Joining a load
 * already in flight did not record that load's playhead, so the screen clock
 * is still unknown or left over from the previous item.
 */
internal fun castMayCorrectReceiver(
    playheadRequested: Boolean,
    requestedMs: Long,
    receiverMs: Long,
): Boolean {
    if (!playheadRequested) return false
    return castReceiverNeedsSeek(requestedMs, receiverMs)
}

/**
 * A failed load hands the episode back to the phone. The attach flags have to
 * drop first, or the phone stays paused and the connecting screen stays up.
 * A receiver that is still playing is not a hand-back.
 */
internal data class CastHandoffRelease(
    val clearHandoff: Boolean,
    val playOnPhone: Boolean,
)

internal fun releaseCastHandoff(receiverStillPlaying: Boolean): CastHandoffRelease =
    if (receiverStillPlaying) {
        CastHandoffRelease(clearHandoff = false, playOnPhone = false)
    } else {
        CastHandoffRelease(clearHandoff = true, playOnPhone = true)
    }

/**
 * Clock to put on the phone when a cast load fails.
 * A load this screen just started carries the position for the episode now
 * showing. The cast clock can still be the previous episode, and that must
 * not become the resume point.
 */
internal fun castPhoneKnownPosition(
    loadRequested: Boolean,
    sentPositionMs: Long,
    screenPositionMs: Long,
    playheadMs: Long,
): Long {
    if (loadRequested && sentPositionMs >= 0L) return sentPositionMs.coerceAtLeast(0L)
    return maxOf(screenPositionMs.coerceAtLeast(0L), playheadMs.coerceAtLeast(0L))
}

/**
 * Where the phone resumes when the receiver disconnects.
 * The shared receiver can still be sitting on the previous episode until this
 * screen has seen it playing. A remounted episode does not inherit that clock.
 */
internal fun castDisconnectResumeMs(
    casting: Boolean,
    clockStale: Boolean,
    loadRequested: Boolean,
    sentPositionMs: Long,
    screenPositionMs: Long,
    playheadMs: Long,
    receiverMs: Long,
): Long {
    val receiverIsThisEpisode = casting && !clockStale && !loadRequested
    if (receiverIsThisEpisode) return receiverMs.coerceAtLeast(0L)
    return castPhoneKnownPosition(loadRequested, sentPositionMs, screenPositionMs, playheadMs)
}

/**
 * Where the phone should start after the TV hands the episode back.
 * The clock copied from the receiver wins when the phone is still at the start.
 * A phone that is already there does not need another seek.
 */
internal fun castPhoneResumeTarget(localMs: Long, knownMs: Long): Long? {
    val local = localMs.coerceAtLeast(0L)
    val known = knownMs.coerceAtLeast(0L)
    if (known <= 1_000L) return null
    if (known <= local + 1_500L) return null
    return known
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
