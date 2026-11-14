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

    /** TMDB id for a backdrop lookup. Uses the id cache, then arm, then search. */
    fun findId(anilistId: Int, title: String?, year: Int?, movie: Boolean): Int? {
        if (anilistId <= 0) return null
        val key = apiKey()
        if (key.isBlank()) return null
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

    fun photoFor(person: AnimePerson, art: TitleArt?): String? {
        if (!person.imageUrl.isNullOrBlank()) return person.imageUrl
        val photos = art?.castPhotos ?: return null
        val keys = listOf(person.name, person.role.orEmpty()).map { nameKey(it) }.filter { it.isNotEmpty() }
        return keys.firstNotNullOfOrNull { photos[it] }
    }

    private fun fetch(detail: AnimeSummary, key: String): TitleArt? {
        val movie = detail.format.equals("MOVIE", true)
        val id = findId(detail.id, detail.searchTitles().firstOrNull() ?: detail.title, detail.seasonYear, movie)
            ?: return null
        val kind = if (movie) "movie" else "tv"
        val extra = if (movie) "images,release_dates,videos,credits" else "images,content_ratings,videos,credits"
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
        val youtube = youtubeId(json.optJSONObject("videos")?.optJSONArray("results"))
        val networks = brands(json.optJSONArray("networks")) + brands(json.optJSONArray("production_companies"))
        val cast = castPhotos(json.optJSONObject("credits")?.optJSONArray("cast"))
        val episodes = if (movie) {
            emptyMap()
        } else {
            val slots = seasons(json.optJSONArray("seasons"))
            val number = pickSeason(slots, detail.title, detail.seasonYear)
            seasonEpisodes(id, number, key)
        }
        if (logo == null && rating == null && overview == null && episodes.isEmpty() && networks.isEmpty()) {
            return null
        }
        return TitleArt(
            logoUrl = logo,
            rating = rating,
            runtimeMinutes = runtime,
            overview = overview,
            youtubeId = youtube,
            networks = networks.distinctBy { it.name.lowercase() }.take(4),
            episodes = episodes,
            castPhotos = cast,
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
                stillUrl = imageUrl(item.optString("still_path"), "w300"),
                airLabel = shortAirDate(item.optString("air_date")),
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
        val raw = prefs.getString("pack$anilistId", null) ?: return null
        val age = System.currentTimeMillis() - prefs.getLong("packAt$anilistId", 0L)
        if (age > TimeUnit.DAYS.toMillis(7)) return null
        return runCatching { decode(raw) }.getOrNull()
    }

    private fun remember(anilistId: Int, art: TitleArt) {
        prefs.edit()
            .putString("pack$anilistId", encode(art))
            .putLong("packAt$anilistId", System.currentTimeMillis())
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

private fun encode(art: TitleArt): String {
    val episodes = JSONArray()
    art.episodes.forEach { (number, episode) ->
        episodes.put(
            JSONObject()
                .put("n", number)
                .put("title", episode.title)
                .put("still", episode.stillUrl ?: "")
                .put("air", episode.airLabel ?: ""),
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
    return TitleArt(
        logoUrl = json.optString("logo").takeIf { it.startsWith("http") },
        rating = json.optString("rating").takeIf { it.isNotBlank() },
        runtimeMinutes = json.optInt("runtime").takeIf { it > 0 },
        overview = json.optString("overview").takeIf { it.isNotBlank() },
        youtubeId = json.optString("youtube").takeIf { it.isNotBlank() },
        networks = networks,
        episodes = episodes,
        castPhotos = cast,
    )
}
