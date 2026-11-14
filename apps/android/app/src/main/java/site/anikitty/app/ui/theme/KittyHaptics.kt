// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.theme

import android.content.Context
import android.os.Build
import android.os.SystemClock
import android.os.VibrationEffect
import android.os.Vibrator
import android.provider.Settings
import android.view.HapticFeedbackConstants
import android.view.View

/** One place for taps, snaps, success, and errors. Quiet when the system haptics switch is off. */
object KittyHaptics {
    enum class Kind { Tick, Confirm, Success, Error }

    private var lastAt = LongArray(Kind.entries.size)

    fun perform(view: View, kind: Kind) {
        val now = SystemClock.uptimeMillis()
        val gap = when (kind) {
            Kind.Tick -> 45L
            Kind.Confirm -> 70L
            Kind.Success -> 180L
            Kind.Error -> 220L
        }
        val slot = kind.ordinal
        if (now - lastAt[slot] < gap) return
        lastAt[slot] = now
        if (!enabled(view.context)) return
        val vibrator = view.context.getSystemService(Vibrator::class.java)
        if (vibrator != null && vibrator.hasVibrator() && Build.VERSION.SDK_INT >= 29) {
            val effect = when (kind) {
                Kind.Tick -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_TICK)
                Kind.Confirm -> VibrationEffect.createPredefined(VibrationEffect.EFFECT_CLICK)
                Kind.Success -> if (Build.VERSION.SDK_INT >= 30) {
                    VibrationEffect.createPredefined(VibrationEffect.EFFECT_DOUBLE_CLICK)
                } else {
                    VibrationEffect.createOneShot(28, VibrationEffect.DEFAULT_AMPLITUDE)
                }
                Kind.Error -> VibrationEffect.createWaveform(longArrayOf(0, 16, 36, 16), -1)
            }
            vibrator.vibrate(effect)
            return
        }
        val constant = when (kind) {
            Kind.Tick -> HapticFeedbackConstants.CLOCK_TICK
            Kind.Confirm -> HapticFeedbackConstants.KEYBOARD_TAP
            Kind.Success -> HapticFeedbackConstants.CONFIRM
            Kind.Error -> HapticFeedbackConstants.REJECT
        }
        view.performHapticFeedback(constant)
    }

    private fun enabled(context: Context): Boolean =
        Settings.System.getInt(
            context.contentResolver,
            Settings.System.HAPTIC_FEEDBACK_ENABLED,
            1,
        ) == 1
}
