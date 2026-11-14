// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import android.content.Context
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue

/** Series removed from Continue watching. Watching again puts the card back. */
object ContinueHidden {
    private const val PREF = "anikitty_continue"
    private const val KEY = "hidden"

    var ids by mutableStateOf(emptySet<Int>())
        private set

    private var installed = false

    fun install(context: Context) {
        if (installed) return
        installed = true
        val raw = context.applicationContext
            .getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .getStringSet(KEY, emptySet())
            .orEmpty()
        ids = raw.mapNotNull { it.toIntOrNull() }.toSet()
    }

    fun hide(context: Context, anilistId: Int) {
        install(context)
        if (anilistId in ids) return
        ids = ids + anilistId
        persist(context)
    }

    fun reveal(context: Context, anilistId: Int) {
        install(context)
        if (anilistId !in ids) return
        ids = ids - anilistId
        persist(context)
    }

    private fun persist(context: Context) {
        context.applicationContext
            .getSharedPreferences(PREF, Context.MODE_PRIVATE)
            .edit()
            .putStringSet(KEY, ids.map { it.toString() }.toSet())
            .apply()
    }
}
