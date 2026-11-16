// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.demo

import android.content.Context
import site.anikitty.app.R
import site.anikitty.app.data.anilist.AiringSlot
import site.anikitty.app.data.anilist.AnimePerson
import site.anikitty.app.data.anilist.AnimeRelation
import site.anikitty.app.data.anilist.AnimeStreamingEpisode
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.data.anilist.MediaRank
import site.anikitty.app.data.anilist.NextAiring
import site.anikitty.app.data.anilist.ScoreBucket
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.data.servers.PlayableSource
import java.io.File

/**
 * Sample library for demo mode. Nothing here is an AniList account, and nothing
 * is written into the on-device watch history or the AniList token store.
 */
object DemoLibrary {
    private const val PKG = "site.anikitty.app"

    private fun cover(name: String) = "android.resource://$PKG/drawable/demo_cover_$name"
    private fun banner(name: String) = "android.resource://$PKG/drawable/demo_banner_$name"

    private fun show(
        id: Int,
        title: String,
        art: String,
        bannerName: String?,
        episodes: Int,
        format: String,
        score: Int,
        description: String,
        genres: List<String>,
        studio: String,
        year: Int,
        recommendations: List<AnimeSummary> = emptyList(),
        season: String = "SPRING",
        popularity: Int? = null,
        favourites: Int? = null,
        malId: Int? = null,
        characters: List<AnimePerson> = emptyList(),
        staff: List<AnimePerson> = emptyList(),
        relations: List<AnimeRelation> = emptyList(),
        nextAiring: NextAiring? = null,
        scoreDistribution: List<ScoreBucket> = emptyList(),
        rankings: List<MediaRank> = emptyList(),
        recapEpisode: Int? = null,
        status: String? = null,
    ): AnimeSummary = AnimeSummary(
        id = id,
        title = title,
        coverImageUrl = cover(art),
        bannerImageUrl = bannerName?.let(::banner),
        episodes = episodes,
        format = format,
        averageScore = score,
        description = description,
        season = season,
        seasonYear = year,
        startMonth = 4,
        popularity = popularity,
        malId = malId,
        durationMinutes = 24,
        genres = genres,
        studios = listOf(studio),
        streamingEpisodes = (1..episodes.coerceAtMost(8)).map { number ->
            AnimeStreamingEpisode(
                title = if (number == recapEpisode) "Episode $number — Recap" else "Episode $number",
                thumbnailUrl = cover(art),
            )
        },
        characters = characters,
        staff = staff,
        relations = relations,
        nextAiring = nextAiring,
        favourites = favourites,
        scoreDistribution = scoreDistribution,
        rankings = rankings,
        recommendations = recommendations,
        status = status,
        detailLoaded = true,
    )

    private val night = show(
        id = 910002,
        title = "Night Market",
        art = "night",
        bannerName = "night",
        episodes = 12,
        format = "TV",
        score = 81,
        description = "A sample series in the demo library. It is not from your AniList account.",
        genres = listOf("Drama", "Mystery"),
        studio = "Demo Studio",
        year = 2024,
        status = "RELEASING",
    )
    private val glass = show(
        id = 910003,
        title = "Glass Rail",
        art = "glass",
        bannerName = "glass",
        episodes = 12,
        format = "TV",
        score = 77,
        description = "A finished sample. Playback is a short clip bundled with the app.",
        genres = listOf("Adventure"),
        studio = "Demo Studio",
        year = 2023,
    )

    val harbor = show(
        id = 910001,
        title = "Paper Harbor",
        art = "harbor",
        bannerName = "harbor",
        episodes = 12,
        format = "TV",
        score = 86,
        description = "Demo title. Continue from episode 4. The picture and sound marks on the player come from the bundled sample source.",
        genres = listOf("Action", "Fantasy"),
        studio = "Demo Studio",
        year = 2025,
        recommendations = listOf(night, glass),
        popularity = 18420,
        favourites = 2104,
        malId = 910001,
        recapEpisode = 1,
        characters = listOf(
            AnimePerson(1, "Hana Ito", cover("harbor"), "Main"),
            AnimePerson(2, "Ren Sato", cover("night"), "Main"),
            AnimePerson(3, "Mio Abe", cover("glass"), "Supporting"),
        ),
        staff = listOf(
            AnimePerson(11, "Demo Director", cover("tide"), "Director"),
            AnimePerson(12, "Demo Writer", cover("garden"), "Series composition"),
        ),
        relations = listOf(
            AnimeRelation(
                id = night.id,
                title = night.title,
                coverImageUrl = night.coverImageUrl,
                relationType = "Sequel",
                format = "TV",
                episodes = 12,
                season = "SPRING",
                seasonYear = 2024,
            ),
        ),
        nextAiring = NextAiring(5, System.currentTimeMillis() / 1000L + 50 * 60),
        scoreDistribution = listOf(
            ScoreBucket(50, 18),
            ScoreBucket(60, 42),
            ScoreBucket(70, 96),
            ScoreBucket(80, 240),
            ScoreBucket(90, 310),
            ScoreBucket(100, 74),
        ),
        rankings = listOf(
            MediaRank(4, "RATED", "season", "SPRING", 2025, false),
            MediaRank(28, "POPULAR", "season", "SPRING", 2025, false),
        ),
        status = "RELEASING",
    )

    private val tide = show(
        id = 910004,
        title = "Low Tide",
        art = "tide",
        bannerName = null,
        episodes = 8,
        format = "TV",
        score = 74,
        description = "Paused in the demo library.",
        genres = listOf("Slice of Life"),
        studio = "Demo Studio",
        year = 2022,
    )
    private val garden = show(
        id = 910005,
        title = "Static Garden",
        art = "garden",
        bannerName = null,
        episodes = 6,
        format = "TV",
        score = 79,
        description = "Another show you are partway through in the demo.",
        genres = listOf("Comedy"),
        studio = "Demo Studio",
        year = 2025,
        status = "RELEASING",
    )
    private val window = show(
        id = 910006,
        title = "North Window",
        art = "window",
        bannerName = null,
        episodes = 1,
        format = "MOVIE",
        score = 83,
        description = "A sample film in the demo library.",
        genres = listOf("Drama"),
        studio = "Demo Studio",
        year = 2021,
        recommendations = emptyList(),
    )

    val catalog: List<AnimeSummary> = listOf(harbor, night, glass, tide, garden, window)
    val featured: List<AnimeSummary> = listOf(harbor, night, glass)
    val seasonal: List<AnimeSummary> = listOf(harbor, garden, night, tide)

    fun find(id: Int): AnimeSummary? = catalog.firstOrNull { it.id == id }

    fun airing(nowEpochSec: Long): List<AiringSlot> = listOf(
        AiringSlot(glass, 7, nowEpochSec - 6 * 60 * 60, subEpisodes = 7, dubEpisodes = 4),
        AiringSlot(garden, 3, nowEpochSec - 2 * 60 * 60, subEpisodes = 3, dubEpisodes = 3),
        AiringSlot(tide, 4, nowEpochSec - 50 * 60, subEpisodes = 4, dubEpisodes = null),
        AiringSlot(harbor, 5, nowEpochSec + 50 * 60, subEpisodes = 5, dubEpisodes = 2),
        AiringSlot(night, 8, nowEpochSec + 3 * 60 * 60, subEpisodes = 8, dubEpisodes = 8),
    )

    private fun row(
        anime: AnimeSummary,
        episode: Int,
        positionMs: Long,
        durationMs: Long,
        status: String,
        ageMs: Long,
    ) = WatchHistoryEntity(
        anilistId = anime.id,
        title = anime.title,
        coverImageUrl = anime.coverImageUrl,
        episode = episode,
        positionMs = positionMs,
        durationMs = durationMs,
        updatedAtEpochMs = System.currentTimeMillis() - ageMs,
        listStatus = status,
    )

    val history: List<WatchHistoryEntity> = listOf(
        row(harbor, 4, 8 * 60_000L, 24 * 60_000L, "CURRENT", 2 * 60 * 60_000L),
        row(garden, 2, 12 * 60_000L, 24 * 60_000L, "CURRENT", 26 * 60 * 60_000L),
        row(night, 1, 0L, 0L, "PLANNING", 5 * 24 * 60 * 60_000L),
        row(tide, 3, 4 * 60_000L, 24 * 60_000L, "PAUSED", 10 * 24 * 60 * 60_000L),
        row(glass, 12, 24 * 60_000L, 24 * 60_000L, "COMPLETED", 20 * 24 * 60 * 60_000L),
        row(window, 1, 10 * 60_000L, 90 * 60_000L, "DROPPED", 40 * 24 * 60 * 60_000L),
    )

    /**
     * Bundled clip copied into the app cache so Media3 can open a file URI.
     * Quality fields are sample metadata, not measured from the file.
     * Returns null for any id outside this library.
     */
    fun clip(context: Context, id: Int): PlayableSource? {
        if (find(id) == null) return null
        val file = File(context.cacheDir, "anikitty-demo-clip-2.mp4")
        if (!file.exists() || file.length() == 0L) {
            context.resources.openRawResource(R.raw.demo_clip).use { input ->
                file.outputStream().use { input.copyTo(it) }
            }
        }
        return PlayableSource(
            url = file.toURI().toString(),
            label = "1080p",
            quality = "1080p",
            audio = "AAC 2.0 · SUB",
            qualityRating = "FHD",
        )
    }

    fun search(query: String): List<AnimeSummary> {
        val q = query.trim()
        if (q.length < 2) return catalog
        return catalog.filter { anime ->
            anime.title.contains(q, ignoreCase = true) ||
                anime.genres.any { it.contains(q, ignoreCase = true) }
        }
    }
}
