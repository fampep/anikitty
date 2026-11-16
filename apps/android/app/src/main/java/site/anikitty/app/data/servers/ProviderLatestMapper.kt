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
        coroutineScope {
            items.map { item ->
                async {
                    val anime = resolveAnime(item, aniList, known) ?: return@async null
                    val episode = item.episodeFor(audio).coerceAtLeast(1)
                    AiringSlot(
                        anime = anime.copy(
                            coverImageUrl = anime.coverImageUrl ?: item.posterUrl,
                        ),
                        episode = episode,
                        // Unknown scrape timestamp — blank relative time in the UI.
                        airingAtEpochSec = 0L,
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
        tipCache[item.siteId]?.let { cachedId ->
            val cached = known[cachedId] ?: runCatching { aniList.media(cachedId) }.getOrNull()
            if (cached != null && mediaMatchesTitle(item.title, cached)) {
                return cached
            }
            // Stale or wrong cache (same-named film / recap) — search again.
            tipCache.remove(item.siteId)
        }
        val hits = runCatching { aniList.search(item.title, perPage = 8) }.getOrDefault(emptyList())
        val match = pickMatch(item.title, hits) ?: return null
        tipMutex.withLock { tipCache[item.siteId] = match.id }
        return match
    }

    /**
     * Exact normalized title / romaji / synonym only.
     * Never substring or “first hit” — those open the wrong AniList media.
     */
    internal fun pickMatch(title: String, hits: List<AnimeSummary>): AnimeSummary? {
        if (hits.isEmpty()) return null
        val needle = normalize(title)
        if (needle.isBlank()) return null
        return hits.firstOrNull { mediaMatchesTitle(needle, it, alreadyNormalized = true) }
    }

    private fun mediaMatchesTitle(
        titleOrNeedle: String,
        anime: AnimeSummary,
        alreadyNormalized: Boolean = false,
    ): Boolean {
        val needle = if (alreadyNormalized) titleOrNeedle else normalize(titleOrNeedle)
        if (needle.isBlank()) return false
        val candidates = buildList {
            add(anime.title)
            anime.romajiTitle?.let { add(it) }
            anime.nativeTitle?.let { add(it) }
            addAll(anime.synonyms)
        }
        return candidates.any { normalize(it) == needle }
    }

    private fun normalize(raw: String): String =
        raw.lowercase()
            .replace('’', '\'')
            .replace(Regex("""[^a-z0-9]+"""), " ")
            .trim()
}
