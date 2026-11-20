// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context

/**
 * One Chromecast session for the process. The player screen borrows it and
 * gives the listeners back. Leaving the player, or opening the next episode,
 * must not release it — that is what used to stop the TV.
 */
internal object CastLifetime {
    private val gate = Any()
    private var helper: CastSessionHelper? = null

    fun obtain(context: Context): CastSessionHelper? = synchronized(gate) {
        val existing = helper
        if (existing != null && !existing.isClosed) return existing
        val created = CastSessionHelper.create(context.applicationContext) ?: return null
        helper = created
        created
    }

    fun current(): CastSessionHelper? = synchronized(gate) {
        helper?.takeIf { !it.isClosed }
    }
}

/**
 * The foreground service stays up while the TV is playing or a load is still
 * handing the stream to the receiver. Which screen is open is not an input.
 */
internal fun castForegroundShouldRun(casting: Boolean, loadInFlight: Boolean): Boolean =
    casting || loadInFlight

/**
 * The last screen leaving after the receiver finished should stop the relay.
 * Another open screen, or a load that has not settled, keeps the session.
 */
internal fun castShouldStopWhenScreenDetaches(
    screensLeft: Int,
    episodeEnded: Boolean,
    loadInFlight: Boolean,
): Boolean = screensLeft == 0 && episodeEnded && !loadInFlight

/**
 * The screen that is leaving must not clear a listener the next screen just set.
 */
internal class CastListenerSlot<T> {
    var current: T? = null
        private set

    fun set(listener: T?) {
        current = listener
    }

    fun clear(listener: T): Boolean {
        if (current !== listener) return false
        current = null
        return true
    }
}

/** Identity of the item the receiver is already playing. */
internal data class CastItemKey(
    val anilistId: Int,
    val episode: Int,
    val url: String,
    val audio: String,
)

internal fun castAudioKey(audio: String?): String = audio?.trim()?.lowercase().orEmpty()

internal fun castSameItem(loaded: CastItemKey?, screen: CastItemKey): Boolean {
    if (loaded == null || loaded.url.isBlank() || screen.url.isBlank()) return false
    if (loaded.url != screen.url || loaded.episode != screen.episode) return false
    if (castAudioKey(loaded.audio) != castAudioKey(screen.audio)) return false
    if (loaded.anilistId > 0 && screen.anilistId > 0 && loaded.anilistId != screen.anilistId) return false
    return true
}

internal enum class CastJoin { Load, Adopt }

/** A screen that opens onto the item already on the TV joins it. It does not reload. */
internal fun castJoin(casting: Boolean, loadInFlight: Boolean, sameItem: Boolean): CastJoin =
    if (sameItem && (casting || loadInFlight)) CastJoin.Adopt else CastJoin.Load

/** The playback service, not the player, hears session end and item end. */
internal interface CastServiceWatch {
    fun onSessionEnded()
    fun onItemFinished()
}

/** Screen callbacks for one load. Clearing the token drops them after the screen is gone. */
internal class CastLoadHooks(
    private val onReady: () -> Unit,
    private val onError: (String) -> Unit,
) {
    fun ready() = onReady()
    fun failed(message: String) = onError(message)
}
