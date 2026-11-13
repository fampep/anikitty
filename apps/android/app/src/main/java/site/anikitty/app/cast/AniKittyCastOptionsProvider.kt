// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

package site.anikitty.app.cast

import android.content.Context
import com.google.android.gms.cast.framework.CastOptions
import com.google.android.gms.cast.framework.OptionsProvider
import com.google.android.gms.cast.framework.SessionProvider
import com.google.android.gms.cast.framework.media.CastMediaOptions
import com.google.android.gms.cast.framework.media.NotificationOptions
import site.anikitty.app.MainActivity

/** Default Cast receiver. Streams are relayed from the phone so the TV gets a clean URL. */
class AniKittyCastOptionsProvider : OptionsProvider {
    override fun getCastOptions(context: Context): CastOptions {
        val notification = NotificationOptions.Builder()
            .setTargetActivityClassName(MainActivity::class.java.name)
            .build()
        val media = CastMediaOptions.Builder()
            .setNotificationOptions(notification)
            .build()
        return CastOptions.Builder()
            .setReceiverApplicationId(DEFAULT_RECEIVER_ID)
            .setCastMediaOptions(media)
            .setStopReceiverApplicationWhenEndingSession(true)
            .setResumeSavedSession(false)
            .build()
    }

    override fun getAdditionalSessionProviders(context: Context): List<SessionProvider>? = null

    companion object {
        /** Google Default Media Receiver. */
        const val DEFAULT_RECEIVER_ID = "CC1AD845"
    }
}
