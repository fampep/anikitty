// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import com.google.android.gms.cast.framework.CastContext
import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import java.util.concurrent.CopyOnWriteArrayList
import java.util.concurrent.Executors
import java.util.concurrent.atomic.AtomicBoolean

internal const val CAST_STILL_STARTING = "Cast is still starting"
internal const val CAST_DIDNT_START = "Cast didn't start"
internal const val CAST_UNAVAILABLE = "Cast isn't available on this phone"

/**
 * Why the Cast button cannot open a TV. Null means Play services is present.
 * The ints are [ConnectionResult] codes so this stays testable without a device.
 */
internal fun castUnavailableReason(playServicesStatus: Int): String? = when (playServicesStatus) {
    ConnectionResult.SUCCESS -> null
    ConnectionResult.SERVICE_MISSING ->
        "Google Play services isn't installed, so Cast is off"
    ConnectionResult.SERVICE_DISABLED ->
        "Google Play services is turned off, so Cast is off"
    ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED ->
        "Update Google Play services to use Cast"
    else -> CAST_UNAVAILABLE
}

/**
 * Starts Cast off the first frame. The button reads [reason] and stays
 * disabled, with that sentence, until this finishes or Play services refuses.
 */
internal object CastStartup {
    private val executor = Executors.newSingleThreadExecutor { runnable ->
        Thread(runnable, "anikitty-cast-init").apply { isDaemon = true }
    }
    private val main = Handler(Looper.getMainLooper())
    private val listeners = CopyOnWriteArrayList<(String?) -> Unit>()
    private val started = AtomicBoolean(false)

    @Volatile
    var reason: String? = CAST_STILL_STARTING
        private set

    /** Set before [reason] clears, so the player never calls the blocking Cast API. */
    @Volatile
    var context: CastContext? = null
        private set

    fun start(context: Context) {
        if (!started.compareAndSet(false, true)) return
        val app = context.applicationContext
        executor.execute {
            val status = runCatching {
                GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(app)
            }.getOrElse { error ->
                Log.w(TAG, "Play services check failed", error)
                ConnectionResult.INTERNAL_ERROR
            }
            val blocked = castUnavailableReason(status)
            if (blocked != null) {
                publish(blocked)
                Log.w(TAG, "$blocked (Play services status $status)")
                return@execute
            }
            // The Task does its work on [executor]. Calling it from that same
            // thread can deadlock a single-thread pool, so hop back first.
            main.post { begin(app) }
        }
    }

    /** Delivers the current reason immediately, then each later change, on the main thread. */
    fun listen(listener: (String?) -> Unit): () -> Unit {
        listeners.add(listener)
        listener(reason)
        return { listeners.remove(listener) }
    }

    private fun begin(app: Context) {
        val task = runCatching { CastContext.getSharedInstance(app, executor) }
            .getOrElse { error ->
                fail(error)
                return
            }
        task.addOnSuccessListener { ready ->
            context = ready
            publish(null)
            Log.i(TAG, "CastContext ready")
        }.addOnFailureListener { error ->
            fail(error)
        }
    }

    private fun fail(error: Throwable) {
        publish(CAST_DIDNT_START)
        Log.w(TAG, CAST_DIDNT_START, error)
    }

    private fun publish(next: String?) {
        val deliver = {
            reason = next
            listeners.forEach { it(next) }
        }
        if (Looper.myLooper() == Looper.getMainLooper()) deliver() else main.post(deliver)
    }

    private const val TAG = "AniKittyCast"
}
