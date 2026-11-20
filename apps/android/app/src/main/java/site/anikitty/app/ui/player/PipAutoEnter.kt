// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational

/**
 * Home and Recents shrink local playback into a picture-in-picture window.
 * A finished episode stays full screen so the next-episode card is usable.
 * Chromecast, including a receiver this screen just joined, keeps the phone
 * out of that window.
 */
fun shouldAutoEnterPip(
    localPlaying: Boolean,
    playbackEnded: Boolean,
    castBlocks: Boolean,
): Boolean = localPlaying && !playbackEnded && !castBlocks

/**
 * True while the TV owns this episode or a handoff is in progress.
 * [handoffToCast] is the gap after a load starts and before [casting] flips on,
 * which is also how a live receiver is adopted.
 */
fun castBlocksPictureInPicture(
    casting: Boolean,
    castPending: Boolean,
    handoffToCast: Boolean,
): Boolean = casting || castPending || handoffToCast

/**
 * Remembers whether the open player may enter PiP, and tells the system.
 * Android 12+ enters on Home and Recents by itself. Older versions use
 * [onUserLeaveHint].
 */
object PipAutoEnter {
    @Volatile
    var allowed: Boolean = false
        private set

    fun update(activity: Activity, allowed: Boolean) {
        val supported = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O &&
            activity.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)
        this.allowed = allowed && supported
        if (!supported) return
        val builder = PictureInPictureParams.Builder()
            .setAspectRatio(Rational(16, 9))
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            builder.setAutoEnterEnabled(this.allowed)
        }
        runCatching { activity.setPictureInPictureParams(builder.build()) }
    }

    fun onUserLeaveHint(activity: Activity) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O || Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) return
        if (!allowed || activity.isInPictureInPictureMode) return
        val params = PictureInPictureParams.Builder()
            .setAspectRatio(Rational(16, 9))
            .build()
        runCatching { activity.enterPictureInPictureMode(params) }
    }
}
