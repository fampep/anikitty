// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.banner

data class BannerChoice(
    val url: String,
    val blur: Boolean,
    val source: String,
)

/**
 * Ordered backdrop candidates. Keyed sources are skipped when the key is absent.
 * The last resort is a cover that the UI must blur.
 */
fun bannerChoices(
    tmdbKeyPresent: Boolean,
    fanartKeyPresent: Boolean,
    tmdbPath: String?,
    fanartUrl: String?,
    kitsuLarge: String?,
    anilistBanner: String?,
    coverExtraLarge: String?,
): List<BannerChoice> {
    val out = ArrayList<BannerChoice>()
    val path = tmdbPath?.takeIf { it.startsWith("/") }
    if (tmdbKeyPresent && path != null) {
        out += BannerChoice("https://image.tmdb.org/t/p/w1280$path", false, "tmdb")
    }
    if (fanartKeyPresent && !fanartUrl.isNullOrBlank()) {
        out += BannerChoice(fanartUrl, false, "fanart")
    }
    if (!kitsuLarge.isNullOrBlank()) out += BannerChoice(kitsuLarge, false, "kitsu")
    if (!anilistBanner.isNullOrBlank()) out += BannerChoice(anilistBanner, false, "anilist")
    if (!coverExtraLarge.isNullOrBlank()) out += BannerChoice(coverExtraLarge, true, "cover")
    return out
}

/** Prefer a textless landscape TMDB backdrop path. */
fun pickTmdbPath(backdrops: List<TmdbBackdrop>): String? {
    val landscape = backdrops.filter { it.path.startsWith("/") && it.aspect >= 1.4 }
    val textless = landscape.filter { it.language.isNullOrBlank() }
    return (textless.ifEmpty { landscape }).maxByOrNull { it.vote }?.path
}

data class TmdbBackdrop(val path: String, val language: String?, val aspect: Double, val vote: Double)
