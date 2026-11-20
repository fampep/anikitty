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
