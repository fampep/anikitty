// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.tmdb

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.anilist.AnimePerson
import site.anikitty.app.data.anilist.AnimeSummary
import java.net.URLEncoder
import java.util.concurrent.TimeUnit

/**
 * Extra title detail from TMDB. AniList stays the catalog. Results are cached
 * on the phone. The key is the built-in one, unless Settings overrides it.
 */
class TmdbCatalog(context: Context) {
    private val app = context.applicationContext
    private val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val http = OkHttpClient.Builder().callTimeout(8, TimeUnit.SECONDS).build()

    fun load(detail: AnimeSummary): TitleArt? {
        if (detail.id <= 0) return null
        if (site.anikitty.app.data.demo.DemoLibrary.find(detail.id) != null) return null
        cached(detail.id)?.let { return it }
        val key = apiKey()
        if (key.isBlank()) return null
        val art = runCatching { fetch(detail, key) }.getOrNull() ?: return null
        remember(detail.id, art)
        return art
    }

    /** TMDB id. Fribb's anime-lists index first, then the id cache, arm, then title search. */
    fun findId(anilistId: Int, title: String?, year: Int?, movie: Boolean): Int? {
        if (anilistId <= 0) return null
        val key = apiKey()
        if (key.isBlank()) return null
        val mapped = runCatching { AnimeListIndex(app).find(anilistId) }.getOrNull()
        if (mapped != null) {
            rememberId(anilistId, mapped.tmdbId)
            return mapped.tmdbId
        }
        cachedId(anilistId)?.let { return it }
        val fromArm = armTmdb(anilistId)
        if (fromArm != null) {
            rememberId(anilistId, fromArm)
            return fromArm
        }
        val fromSearch = search(title, year, movie, key) ?: return null
        rememberId(anilistId, fromSearch)
        return fromSearch
    }

    /** Episodes for a TMDB season the user picked on the title page. */
    fun seasonShelf(tmdbId: Int, season: Int): Map<Int, TmdbEpisode> {
        val key = apiKey()
        if (key.isBlank() || tmdbId <= 0) return emptyMap()
        return runCatching { seasonEpisodes(tmdbId, season, key) }.getOrDefault(emptyMap())
    }

    /** Animation from Japan, newest by popularity, mapped back to AniList ids. */
    fun discoverAnilistIds(limit: Int = 12): List<Int> {
        val key = apiKey()
        if (key.isBlank()) return emptyList()
        val index = AnimeListIndex(app)
        val body = get(
            api(
                "discover/tv",
                key,
                "with_genres" to "16",
                "with_origin_country" to "JP",
                "with_original_language" to "ja",
                "sort_by" to "popularity.desc",
            ),
        ) ?: return emptyList()
        val list = JSONObject(body).optJSONArray("results") ?: return emptyList()
        return buildList {
            for (i in 0 until list.length()) {
                val id = list.optJSONObject(i)?.optInt("id") ?: continue
                val anilist = index.anilistForTmdb(id, movie = false) ?: continue
                if (anilist in this) continue
                add(anilist)
                if (size >= limit) break
            }
        }
    }

    fun episodeStill(anilistId: Int, episode: Int): String? {
        val key = apiKey()
        if (key.isBlank() || anilistId <= 0 || episode <= 0) return null
        val cached = prefs.getString("still$anilistId-$episode", null)
        if (cached == "none") return null
        if (cached?.startsWith("http") == true) return cached
        val mapped = runCatching { AnimeListIndex(app).find(anilistId) }.getOrNull() ?: return null
        if (mapped.movie) return null
        val season = mapped.season ?: 1
        val number = tmdbEpisodeNumber(episode, mapped.episodeOffset)
        val body = get(api("tv/${mapped.tmdbId}/season/$season/episode/$number", key)) ?: return null
        val still = imageUrl(JSONObject(body).optString("still_path"), "w780")
        prefs.edit().putString("still$anilistId-$episode", still ?: "none").apply()
        return still
    }

    /** Logo and wide backdrop for home hero pages. Empty when there is no key. */
    fun heroArt(anilistIds: List<Int>): Map<Int, Pair<String?, String?>> {
        val key = apiKey()
        if (key.isBlank()) return emptyMap()
        val index = AnimeListIndex(app)
        return buildMap {
            anilistIds.distinct().take(5).forEach { anilistId ->
                cached(anilistId)?.let { art ->
                    val backdrop = art.backdrops.firstOrNull()
                    if (art.logoUrl != null || backdrop != null) {
                        put(anilistId, art.logoUrl to backdrop)
                        return@forEach
                    }
                }
                val mapped = runCatching { index.find(anilistId) }.getOrNull() ?: return@forEach
                val kind = if (mapped.movie) "movie" else "tv"
                val body = this@TmdbCatalog.get(
                    api("$kind/${mapped.tmdbId}/images", key, "include_image_language" to "en,ja,null"),
                ) ?: return@forEach
                val images = JSONObject(body)
                val logo = imageUrl(pickLogo(images.logos()), "w500")
                val backdrop = backdropUrls(images.optJSONArray("backdrops")).firstOrNull()
                if (logo != null || backdrop != null) put(anilistId, logo to backdrop)
            }
        }
    }

    fun collection(anilistId: Int): Pair<String, List<Int>>? {
        return runCatching { AnimeListIndex(app).collectionFor(anilistId) }.getOrNull()
    }

    fun photoFor(person: AnimePerson, art: TitleArt?): String? {
        if (!person.imageUrl.isNullOrBlank()) return person.imageUrl
        val photos = art?.castPhotos ?: return null
        val keys = listOf(person.name, person.role.orEmpty()).map { nameKey(it) }.filter { it.isNotEmpty() }
        return keys.firstNotNullOfOrNull { photos[it] }
    }

    private fun fetch(detail: AnimeSummary, key: String): TitleArt? {
        val mapped = runCatching { AnimeListIndex(app).find(detail.id) }.getOrNull()
        val movie = mapped?.movie ?: detail.format.equals("MOVIE", true)
        val id = mapped?.tmdbId
            ?: findId(detail.id, detail.searchTitles().firstOrNull() ?: detail.title, detail.seasonYear, movie)
            ?: return null
        val kind = if (movie) "movie" else "tv"
        val extra = if (movie) {
            "images,release_dates,videos,credits,keywords,recommendations"
        } else {
            "images,content_ratings,videos,credits,keywords,recommendations"
        }
        val body = get(api("$kind/$id", key, "append_to_response" to extra, "include_image_language" to "en,ja,null"))
            ?: return null
        val json = JSONObject(body)
        val images = json.optJSONObject("images")
        val logo = imageUrl(pickLogo(images.logos()), "w500")
        val rating = if (movie) movieRating(json) else pickRating(tvRatings(json))
        val runtime = if (movie) {
            json.optInt("runtime").takeIf { it > 0 }
        } else {
            json.optJSONArray("episode_run_time")?.optInt(0)?.takeIf { it > 0 }
        }
        val overview = json.optString("overview").trim().takeIf { it.isNotEmpty() }
        val clips = videoClips(json.optJSONObject("videos")?.optJSONArray("results"))
        val youtube = clips.firstOrNull()?.youtubeId
        val networks = brands(json.optJSONArray("networks")) + brands(json.optJSONArray("production_companies"))
        val cast = castPhotos(json.optJSONObject("credits")?.optJSONArray("cast"))
        val crew = crewCredits(json.optJSONObject("credits")?.optJSONArray("crew"))
        val slots = seasons(json.optJSONArray("seasons"))
        val seasonNumber = if (movie) {
            null
        } else {
            mapped?.season ?: pickSeason(slots, detail.title, detail.seasonYear)
        }
        val offset = if (mapped?.season == null || mapped.season == seasonNumber) mapped?.episodeOffset ?: 0 else 0
        val episodes = if (movie || seasonNumber == null) {
            emptyMap()
        } else {
            alignEpisodes(seasonEpisodes(id, seasonNumber, key), offset)
        }
        val backdrops = backdropUrls(images?.optJSONArray("backdrops"))
        val keywords = keywordNames(json.optJSONObject("keywords"), movie)
        val suggestions = suggestions(json.optJSONObject("recommendations"), movie, AnimeListIndex(app))
        if (
            logo == null && rating == null && overview == null && episodes.isEmpty() &&
            networks.isEmpty() && backdrops.isEmpty()
        ) {
            return null
        }
        return TitleArt(
            logoUrl = logo,
            rating = rating,
            runtimeMinutes = runtime,
            overview = overview,
            youtubeId = youtube,
            networks = networks.distinctBy { it.name.lowercase() }.take(6),
            episodes = episodes,
            castPhotos = cast,
            backdrops = backdrops,
            keywords = keywords,
            suggestions = suggestions,
            seasons = seasonChips(json.optJSONArray("seasons")),
            crew = crew,
            seasonNumber = seasonNumber,
            episodeOffset = offset,
            tmdbId = id,
            movie = movie,
            malId = mapped?.malId ?: 0,
            tvdbId = mapped?.tvdbId ?: 0,
            kitsuId = mapped?.kitsuId ?: 0,
            clips = clips,
        )
    }

    private fun seasonEpisodes(seriesId: Int, season: Int, key: String): Map<Int, TmdbEpisode> {
        val body = get(api("tv/$seriesId/season/$season", key)) ?: return emptyMap()
        val list = JSONObject(body).optJSONArray("episodes") ?: return emptyMap()
        val out = LinkedHashMap<Int, TmdbEpisode>()
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val number = item.optInt("episode_number")
            if (number <= 0) continue
            out[number] = TmdbEpisode(
                title = item.optString("name").trim(),
                stillUrl = imageUrl(item.optString("still_path"), "w780"),
                airLabel = shortAirDate(item.optString("air_date")),
                overview = item.optString("overview").trim().takeIf { it.isNotEmpty() },
                runtimeMinutes = item.optInt("runtime").takeIf { it > 0 },
            )
        }
        return out
    }

    private fun search(title: String?, year: Int?, movie: Boolean, key: String): Int? {
        val queries = listOfNotNull(title?.let(::stripSeasonWords), title)
            .map { it.trim() }
            .filter { it.length >= 2 }
            .distinct()
        if (queries.isEmpty()) return null
        val path = if (movie) "search/movie" else "search/tv"
        val yearParam = if (movie) "year" else "first_air_date_year"
        for (query in queries) {
            val withYear = if (year != null) {
                hits(get(api(path, key, "query" to query, yearParam to year.toString())), movie)
            } else {
                emptyList()
            }
            pickSearchHit(withYear, query, year)?.let { return it.id }
            val plain = hits(get(api(path, key, "query" to query)), movie)
            pickSearchHit(plain, query, year)?.let { return it.id }
        }
        return null
    }

    private fun hits(body: String?, movie: Boolean): List<TmdbSearchHit> {
        val list = body?.let { JSONObject(it).optJSONArray("results") } ?: return emptyList()
        return buildList {
            for (i in 0 until list.length().coerceAtMost(8)) {
                val item = list.optJSONObject(i) ?: continue
                val name = if (movie) item.optString("title") else item.optString("name")
                val date = if (movie) item.optString("release_date") else item.optString("first_air_date")
                add(
                    TmdbSearchHit(
                        id = item.optInt("id"),
                        name = name,
                        year = date.take(4).toIntOrNull(),
                        popularity = item.optDouble("popularity"),
                    ),
                )
            }
        }
    }

    private fun armTmdb(anilistId: Int): Int? {
        val body = get("https://arm.haglund.dev/api/v2/ids?source=anilist&id=$anilistId") ?: return null
        return JSONObject(body).opt("themoviedb")?.toString()
            ?.takeIf { it.isNotBlank() && it != "null" }
            ?.toIntOrNull()
            ?.takeIf { it > 0 }
    }

    private fun apiKey(): String {
        val entered = app.getSharedPreferences("anikitty_keys", Context.MODE_PRIVATE)
            .getString("tmdb", null)
            ?.trim()
            .orEmpty()
        return entered.ifBlank { BuildConfig.TMDB_API_KEY.trim() }
    }

    private fun cached(anilistId: Int): TitleArt? {
        val raw = prefs.getString("art2$anilistId", null) ?: return null
        val age = System.currentTimeMillis() - prefs.getLong("art2At$anilistId", 0L)
        if (age > TimeUnit.DAYS.toMillis(7)) return null
        return runCatching { decode(raw) }.getOrNull()
    }

    private fun remember(anilistId: Int, art: TitleArt) {
        prefs.edit()
            .putString("art2$anilistId", encode(art))
            .putLong("art2At$anilistId", System.currentTimeMillis())
            .apply()
    }

    private fun cachedId(anilistId: Int): Int? {
        val id = prefs.getInt("tmdb$anilistId", 0)
        if (id <= 0) return null
        val age = System.currentTimeMillis() - prefs.getLong("tmdbAt$anilistId", 0L)
        if (age > TimeUnit.DAYS.toMillis(14)) return null
        return id
    }

    private fun rememberId(anilistId: Int, tmdbId: Int) {
        prefs.edit()
            .putInt("tmdb$anilistId", tmdbId)
            .putLong("tmdbAt$anilistId", System.currentTimeMillis())
            .apply()
    }

    private fun api(path: String, key: String, vararg query: Pair<String, String>): String {
        val extra = query.joinToString("&") { (name, value) ->
            "$name=${URLEncoder.encode(value, "UTF-8")}"
        }
        val join = if (extra.isEmpty()) "" else "&$extra"
        return "https://api.themoviedb.org/3/$path?api_key=$key$join"
    }

    private fun get(url: String): String? {
        return try {
            val request = Request.Builder().url(url).header("Accept", "application/json").build()
            http.newCall(request).execute().use { response ->
                if (!response.isSuccessful) null else response.body?.string()
            }
        } catch (_: Exception) {
            null
        }
    }

    companion object {
        private const val PREFS = "anikitty_tmdb"
    }
}

private fun JSONObject?.logos(): List<TmdbImage> {
    val list = this?.optJSONArray("logos") ?: return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val path = item.optString("file_path")
            if (!path.startsWith("/")) continue
            add(
                TmdbImage(
                    path = path,
                    language = item.optString("iso_639_1").ifBlank { null },
                    vote = item.optDouble("vote_average"),
                ),
            )
        }
    }
}

private fun tvRatings(json: JSONObject): List<Pair<String, String>> {
    val list = json.optJSONObject("content_ratings")?.optJSONArray("results") ?: return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            add(item.optString("iso_3166_1") to item.optString("rating"))
        }
    }
}

private fun movieRating(json: JSONObject): String? {
    val list = json.optJSONObject("release_dates")?.optJSONArray("results") ?: return null
    val entries = buildList {
        for (i in 0 until list.length()) {
            val country = list.optJSONObject(i) ?: continue
            val code = country.optString("iso_3166_1")
            val dates = country.optJSONArray("release_dates") ?: continue
            for (j in 0 until dates.length()) {
                val rating = dates.optJSONObject(j)?.optString("certification").orEmpty()
                if (rating.isNotBlank()) add(code to rating)
            }
        }
    }
    return pickRating(entries)
}

private fun videoClips(results: JSONArray?): List<VideoClip> {
    if (results == null) return emptyList()
    val out = ArrayList<VideoClip>()
    for (i in 0 until results.length()) {
        val item = results.optJSONObject(i) ?: continue
        if (!item.optString("site").equals("YouTube", true)) continue
        val key = item.optString("key").takeIf { it.isNotBlank() } ?: continue
        val type = item.optString("type")
        if (type != "Trailer" && type != "Teaser") continue
        val name = item.optString("name").ifBlank { type }
        out += VideoClip(name, key)
        if (out.size >= 4) break
    }
    return out
}

private fun youtubeId(results: JSONArray?): String? {
    if (results == null) return null
    var teaser: String? = null
    for (i in 0 until results.length()) {
        val item = results.optJSONObject(i) ?: continue
        if (!item.optString("site").equals("YouTube", true)) continue
        val key = item.optString("key").takeIf { it.isNotBlank() } ?: continue
        when (item.optString("type")) {
            "Trailer" -> return key
            "Teaser" -> if (teaser == null) teaser = key
        }
    }
    return teaser
}

private fun brands(list: JSONArray?): List<BrandMark> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name").trim()
            if (name.isEmpty()) continue
            add(BrandMark(name, imageUrl(item.optString("logo_path"), "w154")))
        }
    }
}

private fun seasons(list: JSONArray?): List<TmdbSeasonSlot> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            add(
                TmdbSeasonSlot(
                    number = item.optInt("season_number"),
                    name = item.optString("name"),
                    airYear = item.optString("air_date").take(4).toIntOrNull(),
                ),
            )
        }
    }
}

private fun castPhotos(list: JSONArray?): Map<String, String> {
    if (list == null) return emptyMap()
    val out = LinkedHashMap<String, String>()
    for (i in 0 until list.length().coerceAtMost(24)) {
        val item = list.optJSONObject(i) ?: continue
        val url = imageUrl(item.optString("profile_path"), "w185") ?: continue
        listOf(item.optString("name"), item.optString("character")).forEach { raw ->
            val key = nameKey(raw)
            if (key.isNotEmpty()) out.putIfAbsent(key, url)
        }
    }
    return out
}

private fun alignEpisodes(raw: Map<Int, TmdbEpisode>, offset: Int): Map<Int, TmdbEpisode> {
    if (offset == 0) return raw
    return raw.mapNotNull { (number, episode) ->
        val shown = number - offset
        if (shown > 0) shown to episode else null
    }.toMap()
}

private fun backdropUrls(list: JSONArray?): List<String> {
    if (list == null) return emptyList()
    val images = buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val path = item.optString("file_path")
            if (!path.startsWith("/")) continue
            add(
                TmdbImage(
                    path = path,
                    language = item.optString("iso_639_1").takeIf { it.isNotBlank() && it != "null" },
                    vote = item.optDouble("vote_average"),
                ) to (item.optDouble("aspect_ratio") >= 1.4),
            )
        }
    }
    val wide = images.filter { it.second }.ifEmpty { images }
    val textless = wide.filter { it.first.language == null }.ifEmpty { wide }
    return textless.sortedByDescending { it.first.vote }.take(6).mapNotNull { imageUrl(it.first.path, "w1280") }
}

private fun keywordNames(keywords: JSONObject?, movie: Boolean): List<String> {
    val list = keywords?.optJSONArray(if (movie) "keywords" else "results") ?: return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val name = list.optJSONObject(i)?.optString("name")?.trim().orEmpty()
            if (name.isNotEmpty()) add(name)
            if (size >= 8) break
        }
    }
}

private fun suggestions(
    recommendations: JSONObject?,
    movie: Boolean,
    index: AnimeListIndex,
): List<Suggestion> {
    val list = recommendations?.optJSONArray("results") ?: return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val tmdbId = item.optInt("id")
            val anilist = index.anilistForTmdb(tmdbId, movie) ?: continue
            val title = if (movie) item.optString("title") else item.optString("name")
            if (title.isBlank()) continue
            add(Suggestion(anilist, title.trim(), imageUrl(item.optString("poster_path"), "w342")))
            if (size >= 12) break
        }
    }
}

private fun seasonChips(list: JSONArray?): List<SeasonChip> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val number = item.optInt("season_number")
            val count = item.optInt("episode_count")
            if (number < 0 || count <= 0) continue
            val name = item.optString("name").ifBlank { if (number == 0) "Specials" else "Season $number" }
            add(SeasonChip(number, name, count))
        }
    }.sortedBy { it.number }
}

private fun crewCredits(list: JSONArray?): List<CrewCredit> {
    if (list == null) return emptyList()
    val wanted = setOf("Director", "Writer", "Creator", "Screenplay", "Novel")
    val out = LinkedHashMap<String, CrewCredit>()
    for (i in 0 until list.length()) {
        val item = list.optJSONObject(i) ?: continue
        val job = item.optString("job")
        if (job !in wanted) continue
        val name = item.optString("name").trim()
        if (name.isEmpty() || name in out) continue
        out[name] = CrewCredit(name, job, imageUrl(item.optString("profile_path"), "w185"))
        if (out.size >= 8) break
    }
    return out.values.toList()
}

private fun encode(art: TitleArt): String {
    val episodes = JSONArray()
    art.episodes.forEach { (number, episode) ->
        episodes.put(
            JSONObject()
                .put("n", number)
                .put("title", episode.title)
                .put("still", episode.stillUrl ?: "")
                .put("air", episode.airLabel ?: "")
                .put("overview", episode.overview ?: "")
                .put("runtime", episode.runtimeMinutes ?: 0),
        )
    }
    val networks = JSONArray()
    art.networks.forEach { mark ->
        networks.put(JSONObject().put("name", mark.name).put("logo", mark.logoUrl ?: ""))
    }
    val cast = JSONArray()
    art.castPhotos.forEach { (name, url) ->
        cast.put(JSONObject().put("name", name).put("url", url))
    }
    return JSONObject()
        .put("logo", art.logoUrl ?: "")
        .put("rating", art.rating ?: "")
        .put("runtime", art.runtimeMinutes ?: 0)
        .put("overview", art.overview ?: "")
        .put("youtube", art.youtubeId ?: "")
        .put("networks", networks)
        .put("episodes", episodes)
        .put("cast", cast)
        .put("backdrops", JSONArray(art.backdrops))
        .put("keywords", JSONArray(art.keywords))
        .put("season", art.seasonNumber ?: -1)
        .put("offset", art.episodeOffset)
        .put("tmdb", art.tmdbId)
        .put("movie", art.movie)
        .put("mal", art.malId)
        .put("tvdb", art.tvdbId)
        .put("kitsu", art.kitsuId)
        .put("clips", JSONArray().apply {
            art.clips.forEach { clip ->
                put(JSONObject().put("name", clip.name).put("id", clip.youtubeId))
            }
        })
        .put("suggestions", JSONArray().apply {
            art.suggestions.forEach { item ->
                put(JSONObject().put("id", item.anilistId).put("title", item.title).put("poster", item.posterUrl ?: ""))
            }
        })
        .put("seasons", JSONArray().apply {
            art.seasons.forEach { chip ->
                put(JSONObject().put("n", chip.number).put("name", chip.name).put("eps", chip.episodes))
            }
        })
        .put("crew", JSONArray().apply {
            art.crew.forEach { person ->
                put(JSONObject().put("name", person.name).put("job", person.job).put("photo", person.photoUrl ?: ""))
            }
        })
        .toString()
}

private fun decode(raw: String): TitleArt {
    val json = JSONObject(raw)
    val episodes = LinkedHashMap<Int, TmdbEpisode>()
    val episodeList = json.optJSONArray("episodes")
    if (episodeList != null) {
        for (i in 0 until episodeList.length()) {
            val item = episodeList.optJSONObject(i) ?: continue
            val number = item.optInt("n")
            if (number <= 0) continue
            episodes[number] = TmdbEpisode(
                title = item.optString("title"),
                stillUrl = item.optString("still").takeIf { it.startsWith("http") },
                airLabel = item.optString("air").takeIf { it.isNotBlank() },
                overview = item.optString("overview").takeIf { it.isNotBlank() },
                runtimeMinutes = item.optInt("runtime").takeIf { it > 0 },
            )
        }
    }
    val networks = buildList {
        val list = json.optJSONArray("networks") ?: return@buildList
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name")
            if (name.isBlank()) continue
            add(BrandMark(name, item.optString("logo").takeIf { it.startsWith("http") }))
        }
    }
    val cast = buildMap {
        val list = json.optJSONArray("cast") ?: return@buildMap
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name")
            val url = item.optString("url")
            if (name.isNotBlank() && url.startsWith("http")) put(name, url)
        }
    }
    val backdrops = buildList {
        val list = json.optJSONArray("backdrops") ?: return@buildList
        for (i in 0 until list.length()) {
            val url = list.optString(i)
            if (url.startsWith("http")) add(url)
        }
    }
    val keywords = buildList {
        val list = json.optJSONArray("keywords") ?: return@buildList
        for (i in 0 until list.length()) {
            val name = list.optString(i)
            if (name.isNotBlank()) add(name)
        }
    }
    val suggestions = buildList {
        val list = json.optJSONArray("suggestions") ?: return@buildList
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val id = item.optInt("id")
            val title = item.optString("title")
            if (id <= 0 || title.isBlank()) continue
            add(Suggestion(id, title, item.optString("poster").takeIf { it.startsWith("http") }))
        }
    }
    val seasons = buildList {
        val list = json.optJSONArray("seasons") ?: return@buildList
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            add(SeasonChip(item.optInt("n"), item.optString("name"), item.optInt("eps")))
        }
    }
    val crew = buildList {
        val list = json.optJSONArray("crew") ?: return@buildList
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name")
            if (name.isBlank()) continue
            add(CrewCredit(name, item.optString("job"), item.optString("photo").takeIf { it.startsWith("http") }))
        }
    }
    return TitleArt(
        logoUrl = json.optString("logo").takeIf { it.startsWith("http") },
        rating = json.optString("rating").takeIf { it.isNotBlank() },
        runtimeMinutes = json.optInt("runtime").takeIf { it > 0 },
        overview = json.optString("overview").takeIf { it.isNotBlank() },
        youtubeId = json.optString("youtube").takeIf { it.isNotBlank() },
        networks = networks,
        episodes = episodes,
        castPhotos = cast,
        backdrops = backdrops,
        keywords = keywords,
        suggestions = suggestions,
        seasons = seasons,
        crew = crew,
        seasonNumber = json.optInt("season", -1).takeIf { it >= 0 },
        episodeOffset = json.optInt("offset"),
        tmdbId = json.optInt("tmdb"),
        movie = json.optBoolean("movie"),
        malId = json.optInt("mal"),
        tvdbId = json.optInt("tvdb"),
        kitsuId = json.optInt("kitsu"),
        clips = buildList {
            val list = json.optJSONArray("clips") ?: return@buildList
            for (i in 0 until list.length()) {
                val item = list.optJSONObject(i) ?: continue
                val id = item.optString("id")
                if (id.isBlank()) continue
                add(VideoClip(item.optString("name").ifBlank { "Trailer" }, id))
            }
        },
    )
}
