// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import android.content.Context

/** Remembered extension metadata. Cards read this; they never resolve on their own. */
object SourceBadgeCache {
    data class Badge(
        val quality: String?,
        val audio: String?,
        val qualityRating: String?,
    ) {
        val visible: Boolean
            get() = !quality.isNullOrBlank() || !audio.isNullOrBlank() || !qualityRating.isNullOrBlank()
    }

    private const val PREFS = "anikitty_source_badges"
    private const val MAX = 240

    fun remember(context: Context, anilistId: Int, episode: Int, sources: List<PlayableSource>) {
        if (anilistId <= 0 || episode <= 0) return
        val ranked = sources.mapNotNull { source ->
            val badge = Badge(source.quality, source.audio, source.qualityRating)
            if (!badge.visible) null else badge
        }
        val best = ranked.maxByOrNull { rank(it) } ?: return
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val editor = prefs.edit()
        editor.putString(key(anilistId, episode), encode(best))
        val title = prefs.getString(key(anilistId, 0), null)?.let(::decode)
        if (title == null || rank(best) >= rank(title)) {
            editor.putString(key(anilistId, 0), encode(best))
        }
        editor.apply()
        trim(context)
    }

    fun episode(context: Context, anilistId: Int, episode: Int): Badge? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(key(anilistId, episode), null)
            ?.let(::decode)
            ?.takeIf { it.visible }

    fun title(context: Context, anilistId: Int): Badge? =
        context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
            .getString(key(anilistId, 0), null)
            ?.let(::decode)
            ?.takeIf { it.visible }

    private fun rank(badge: Badge): Int {
        val height = Regex("""(\d{3,4})p""").find(badge.quality.orEmpty())?.groupValues?.get(1)?.toIntOrNull()
        return when {
            badge.quality == "4K" -> 4000
            height != null -> height
            badge.quality != null -> 1
            else -> 0
        }
    }

    private fun key(id: Int, episode: Int) = "$id:$episode"

    private fun encode(badge: Badge): String =
        listOf(badge.quality.orEmpty(), badge.audio.orEmpty(), badge.qualityRating.orEmpty()).joinToString("\u001f")

    private fun decode(raw: String): Badge {
        val parts = raw.split('\u001f')
        return Badge(
            quality = parts.getOrNull(0)?.ifBlank { null },
            audio = parts.getOrNull(1)?.ifBlank { null },
            qualityRating = parts.getOrNull(2)?.ifBlank { null },
        )
    }

    private fun trim(context: Context) {
        val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val keys = prefs.all.keys
        if (keys.size <= MAX) return
        val editor = prefs.edit()
        keys.sorted().take(keys.size - MAX).forEach { editor.remove(it) }
        editor.apply()
    }
}
