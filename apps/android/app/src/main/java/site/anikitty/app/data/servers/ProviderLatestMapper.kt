// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AnimeSummary
import java.util.concurrent.ConcurrentHashMap

/**
 * Maps Anikoto latest-update cards onto AniList titles so home can open the
 * right show, while keeping the scrape site's true Sub / Dub episode counts.
 */
object ProviderLatestMapper {
    private val tipCache = ConcurrentHashMap<String, Int>()
    private val tipMutex = Mutex()

    suspend fun toSlots(
        items: List<AnikotoLatestItem>,
        audio: String,
        aniList: AniListClient,
        known: Map<Int, AnimeSummary> = emptyMap(),
    ): List<AiringSlot> = withContext(Dispatchers.IO) {
        if (items.isEmpty()) return@withContext emptyList()
        val now = System.currentTimeMillis() / 1000L
        coroutineScope {
            items.mapIndexed { index, item ->
                async {
                    val anime = resolveAnime(item, aniList, known) ?: return@async null
                    val episode = item.episodeFor(audio).coerceAtLeast(1)
                    AiringSlot(
                        anime = anime.copy(
                            coverImageUrl = anime.coverImageUrl ?: item.posterUrl,
                        ),
                        episode = episode,
                        // Preserve widget order: newer cards first.
                        airingAtEpochSec = now - index * 60L,
                        subEpisodes = item.latestSub.takeIf { it > 0 },
                        dubEpisodes = item.latestDub.takeIf { it > 0 },
                    )
                }
            }.awaitAll().filterNotNull()
        }
    }

    private suspend fun resolveAnime(
        item: AnikotoLatestItem,
        aniList: AniListClient,
        known: Map<Int, AnimeSummary>,
    ): AnimeSummary? {
        tipCache[item.siteId]?.let { id ->
            known[id]?.let { return it }
            runCatching { aniList.media(id) }.getOrNull()?.let { return it }
        }
        val hits = runCatching { aniList.search(item.title, perPage = 8) }.getOrDefault(emptyList())
        val match = pickMatch(item.title, hits) ?: return null
        tipMutex.withLock { tipCache[item.siteId] = match.id }
        return match
    }

    internal fun pickMatch(title: String, hits: List<AnimeSummary>): AnimeSummary? {
        if (hits.isEmpty()) return null
        val needle = normalize(title)
        hits.firstOrNull { normalize(it.title) == needle }?.let { return it }
        hits.firstOrNull { normalize(it.romajiTitle.orEmpty()) == needle }?.let { return it }
        hits.firstOrNull { normalize(it.title).contains(needle) || needle.contains(normalize(it.title)) }
            ?.let { return it }
        return hits.firstOrNull()
    }

    private fun normalize(raw: String): String =
        raw.lowercase()
            .replace('’', '\'')
            .replace(Regex("""[^a-z0-9]+"""), " ")
            .trim()
}
