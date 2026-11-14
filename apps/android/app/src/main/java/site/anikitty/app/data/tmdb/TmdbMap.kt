// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.tmdb

data class TitleArt(
    val logoUrl: String? = null,
    val rating: String? = null,
    val runtimeMinutes: Int? = null,
    val overview: String? = null,
    val youtubeId: String? = null,
    val networks: List<BrandMark> = emptyList(),
    val episodes: Map<Int, TmdbEpisode> = emptyMap(),
    /** Keys are normalized names. Values are profile image URLs. */
    val castPhotos: Map<String, String> = emptyMap(),
    val backdrops: List<String> = emptyList(),
    val keywords: List<String> = emptyList(),
    val suggestions: List<Suggestion> = emptyList(),
    val seasons: List<SeasonChip> = emptyList(),
    val crew: List<CrewCredit> = emptyList(),
    val seasonNumber: Int? = null,
    val episodeOffset: Int = 0,
    val tmdbId: Int = 0,
    val movie: Boolean = false,
    val malId: Int = 0,
    val tvdbId: Int = 0,
    val kitsuId: Int = 0,
    val clips: List<VideoClip> = emptyList(),
)

data class VideoClip(val name: String, val youtubeId: String)

data class BrandMark(val name: String, val logoUrl: String?)

data class TmdbEpisode(
    val title: String,
    val stillUrl: String?,
    val airLabel: String?,
    val overview: String? = null,
    val runtimeMinutes: Int? = null,
)

data class SeasonChip(
    val number: Int,
    val name: String,
    val episodes: Int,
)

data class Suggestion(
    val anilistId: Int,
    val title: String,
    val posterUrl: String?,
)

data class CrewCredit(
    val name: String,
    val job: String,
    val photoUrl: String?,
)

/** One AniList title in the Fribb anime-lists index. */
data class MappedShow(
    val anilistId: Int,
    val tmdbId: Int,
    val movie: Boolean,
    val season: Int?,
    val episodeOffset: Int,
    val malId: Int,
    val tvdbId: Int,
    val kitsuId: Int,
)

data class TmdbImage(
    val path: String,
    val language: String?,
    val vote: Double,
)

data class TmdbSeasonSlot(
    val number: Int,
    val name: String,
    val airYear: Int?,
)

data class TmdbSearchHit(
    val id: Int,
    val name: String,
    val year: Int?,
    val popularity: Double,
)

fun stripSeasonWords(title: String): String {
    return title
        .replace(Regex("""(?i)\b\d+(?:st|nd|rd|th)\s+season\b"""), " ")
        .replace(Regex("""(?i)\bseason\s*\d+\b"""), " ")
        .replace(Regex("""(?i)\bpart\s*\d+\b"""), " ")
        .replace(Regex("""\s+"""), " ")
        .trim()
}

fun normalizeTitle(title: String): String {
    return stripSeasonWords(title)
        .lowercase()
        .replace(Regex("""[^a-z0-9]+"""), " ")
        .trim()
}

fun seasonNumberFromTitle(title: String): Int? {
    val patterns = listOf(
        Regex("""(?i)\bseason\s*(\d+)\b"""),
        Regex("""(?i)\b(\d+)(?:st|nd|rd|th)\s+season\b"""),
        Regex("""(?i)\bpart\s*(\d+)\b"""),
    )
    for (pattern in patterns) {
        val n = pattern.find(title)?.groupValues?.getOrNull(1)?.toIntOrNull()
        if (n != null && n in 1..50) return n
    }
    return null
}

fun pickSeason(seasons: List<TmdbSeasonSlot>, title: String, year: Int?): Int {
    val real = seasons.filter { it.number > 0 }
    if (real.isEmpty()) return 1
    val hint = seasonNumberFromTitle(title)
    if (hint != null && real.any { it.number == hint }) return hint
    if (year != null) {
        real.filter { it.airYear == year }.minByOrNull { it.number }?.let { return it.number }
    }
    return real.minByOrNull { it.number }?.number ?: 1
}

fun pickSearchHit(hits: List<TmdbSearchHit>, title: String, year: Int?): TmdbSearchHit? {
    val want = normalizeTitle(title)
    if (want.length < 2) return null
    val scored = hits.mapNotNull { hit ->
        if (hit.id <= 0) return@mapNotNull null
        val name = normalizeTitle(hit.name)
        if (name.isBlank()) return@mapNotNull null
        var score = 0
        if (name == want) score += 50
        else if (name.contains(want) || want.contains(name)) score += 20
        if (year != null && hit.year == year) score += 30
        else if (year != null && hit.year != null && hit.year != year) score -= 10
        score += hit.popularity.toInt().coerceIn(0, 20)
        if (score < 20) null else score to hit
    }
    return scored.maxByOrNull { it.first }?.second
}

/** Title art prefers an English logo, then Japanese, then a textless one. */
fun pickLogo(logos: List<TmdbImage>): String? {
    val usable = logos.filter { it.path.startsWith("/") }
    if (usable.isEmpty()) return null
    return usable.maxWithOrNull(
        compareBy<TmdbImage> {
            when (it.language) {
                "en" -> 3
                "ja" -> 2
                null, "" -> 1
                else -> 0
            }
        }.thenBy { it.vote },
    )?.path
}

fun pickRating(entries: List<Pair<String, String>>): String? {
    val clean = entries.map { it.first.uppercase() to it.second.trim() }.filter { it.second.isNotEmpty() }
    for (country in listOf("US", "JP", "GB", "DE")) {
        clean.firstOrNull { it.first == country }?.let { return it.second }
    }
    return clean.firstOrNull()?.second
}

fun preferEpisodeTitle(current: String, number: Int, tmdbTitle: String?): String {
    val clean = tmdbTitle?.trim().orEmpty()
    val placeholder = "Episode $number"
    if (clean.isEmpty() || clean.equals(placeholder, ignoreCase = true)) {
        return current.ifBlank { placeholder }
    }
    return clean
}

fun preferStill(current: String?, still: String?): String? {
    val next = still?.trim().orEmpty()
    return if (next.startsWith("http")) next else current?.takeIf { it.isNotBlank() }
}

fun shortAirDate(iso: String?): String? {
    val raw = iso?.trim().orEmpty()
    val match = Regex("""(\d{4})-(\d{2})-(\d{2})""").find(raw) ?: return null
    val month = match.groupValues[2].toIntOrNull() ?: return null
    val day = match.groupValues[3].toIntOrNull() ?: return null
    if (month !in 1..12 || day !in 1..31) return null
    val names = listOf(
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    )
    return "${names[month - 1]} $day"
}

fun nameKey(value: String): String {
    return value.lowercase().replace(Regex("""[^a-z0-9]+"""), " ").trim()
}

fun tmdbEpisodeNumber(shown: Int, offset: Int): Int = (shown + offset).coerceAtLeast(1)

fun writeMapped(show: MappedShow): String {
    val season = show.season?.toString() ?: ""
    val kind = if (show.movie) "m" else "t"
    return listOf(
        show.anilistId,
        show.tmdbId,
        kind,
        season,
        show.episodeOffset,
        show.malId,
        show.tvdbId,
        show.kitsuId,
    ).joinToString("\t")
}

fun readMapped(line: String): MappedShow? {
    val parts = line.split('\t')
    if (parts.size < 8) return null
    val anilist = parts[0].toIntOrNull() ?: return null
    val tmdb = parts[1].toIntOrNull() ?: return null
    if (anilist <= 0 || tmdb <= 0) return null
    return MappedShow(
        anilistId = anilist,
        tmdbId = tmdb,
        movie = parts[2] == "m",
        season = parts[3].toIntOrNull(),
        episodeOffset = parts[4].toIntOrNull() ?: 0,
        malId = parts[5].toIntOrNull() ?: 0,
        tvdbId = parts[6].toIntOrNull() ?: 0,
        kitsuId = parts[7].toIntOrNull() ?: 0,
    )
}

fun imageUrl(path: String?, size: String): String? {
    val clean = path?.takeIf { it.startsWith("/") } ?: return null
    return "https://image.tmdb.org/t/p/$size$clean"
}
