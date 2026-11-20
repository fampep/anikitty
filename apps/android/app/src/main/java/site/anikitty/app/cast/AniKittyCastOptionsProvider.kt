// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import android.content.Context
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider
import com.google.android.gms.cast.framework.media.CastMediaOptions
import com.google.android.gms.cast.framework.media.MediaIntentReceiver
import com.google.android.gms.cast.framework.media.NotificationOptions
import com.google.android.gms.cast.framework.media.widget.ExpandedControllerActivity

/**
 * Default Cast receiver. Streams are relayed from the phone so the TV gets a
 * clean URL. The relay lives in a playback foreground service, so the TV keeps
 * playing after the player screen closes. The notification skips the same 10
 * seconds as the on-screen −10 / +10 buttons, and its expanded controller is
 * the full-screen remote.
 */
class AniKittyCastOptionsProvider : OptionsProvider {
    override fun getCastOptions(context: Context): CastOptions {
        // Rewind and forward are what the skip step applies to. Without them
        // the shade only has play and stop, and the 10 second step is unused.
        val actions = listOf(
            MediaIntentReceiver.ACTION_REWIND,
            MediaIntentReceiver.ACTION_TOGGLE_PLAYBACK,
            MediaIntentReceiver.ACTION_FORWARD,
            MediaIntentReceiver.ACTION_STOP_CASTING,
        )
        val notification = NotificationOptions.Builder()
            .setActions(actions, intArrayOf(1, 3))
            .setSkipStepMs(NotificationOptions.SKIP_STEP_TEN_SECONDS_IN_MS)
            .setTargetActivityClassName(ExpandedControllerActivity::class.java.name)
            .build()
        val media = CastMediaOptions.Builder()
            .setNotificationOptions(notification)
            .setExpandedControllerActivityClassName(ExpandedControllerActivity::class.java.name)
            .build()
        return CastOptions.Builder()
            .setReceiverApplicationId(DEFAULT_RECEIVER_ID)
            .setCastMediaOptions(media)
            .setStopReceiverApplicationWhenEndingSession(true)
            // Reconnect the TV that was playing when the process last stopped,
            // so the player can load onto it as soon as it opens.
            .setResumeSavedSession(true)
            .build()
    }

    override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? = null

    companion object {
        /** Google Default Media Receiver. */
        const val DEFAULT_RECEIVER_ID = "CC1AD845"
    }
}
