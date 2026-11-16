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

/** Still, then backdrop and logo, for one Continue watching card. */
data class EpisodeFrame(
    val stillUrl: String?,
    val episodeTitle: String?,
    val season: Int?,
    val backdropUrl: String?,
    val logoUrl: String?,
)

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
        val mapped = runCatching { AnimeListIndex.get(app).find(anilistId) }.getOrNull()
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
        val index = AnimeListIndex.get(app)
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
        val stillKey = "still$anilistId-$episode"
        val cached = freshString(stillKey, WEEK_MS)
        if (cached == "none") return null
        if (cached?.startsWith("http") == true) return cached
        val mapped = runCatching { AnimeListIndex.get(app).find(anilistId) }.getOrNull() ?: return null
        if (mapped.movie) return null
        val season = mapped.season ?: 1
        val number = tmdbEpisodeNumber(episode, mapped.episodeOffset)
        val body = get(api("tv/${mapped.tmdbId}/season/$season/episode/$number", key)) ?: return null
        val still = imageUrl(JSONObject(body).optString("still_path"), "w780")
        rememberTimed("still$anilistId-$episode", still ?: "none")
        return still
    }

    /**
     * Episode still, title, and season, with a backdrop and logo when the still is missing.
     * Cached per series and episode. A failed lookup is not cached.
     */
    fun episodeFrame(anilistId: Int, episode: Int): EpisodeFrame {
        val blank = EpisodeFrame(null, null, null, null, null)
        val apiKey = apiKey()
        if (apiKey.isBlank() || anilistId <= 0 || episode <= 0) return blank
        val cacheKey = "frame3$anilistId-$episode"
        freshString(cacheKey, WEEK_MS)?.let { raw ->
            val parts = raw.split("\t")
            if (parts.size >= 5) {
                return EpisodeFrame(
                    stillUrl = parts[1].takeIf { it.startsWith("http") },
                    episodeTitle = parts[0].takeIf { it.isNotBlank() && it != "-" },
                    season = parts[4].toIntOrNull(),
                    backdropUrl = parts[2].takeIf { it.startsWith("http") },
                    logoUrl = parts[3].takeIf { it.startsWith("http") },
                )
            }
        }
        val mapped = runCatching { AnimeListIndex.get(app).find(anilistId) }.getOrNull() ?: return blank
        val art = cached(anilistId)
        val season = mapped.season ?: art?.seasonNumber
        var still: String? = null
        var title: String? = null
        var lookedUp = mapped.movie
        if (!mapped.movie) {
            val number = tmdbEpisodeNumber(episode, mapped.episodeOffset)
            val seasonNumber = season ?: 1
            val body = get(api("tv/${mapped.tmdbId}/season/$seasonNumber/episode/$number", apiKey))
            lookedUp = body != null
            if (body != null) {
                val obj = JSONObject(body)
                title = obj.optString("name").takeIf { it.isNotBlank() }
                still = imageUrl(obj.optString("still_path"), "w780")
            }
        }
        var backdrop = art?.backdrops?.firstOrNull()
        var logo = art?.logoUrl
        if (backdrop == null || logo == null) {
            val kind = if (mapped.movie) "movie" else "tv"
            val body = get(
                api(
                    "$kind/${mapped.tmdbId}/images",
                    apiKey,
                    "include_image_language" to "en,null,ja",
                ),
            )
            if (body != null) {
                lookedUp = true
                val json = JSONObject(body)
                if (backdrop == null) {
                    val path = json.optJSONArray("backdrops")?.optJSONObject(0)?.optString("file_path")
                    backdrop = imageUrl(path, "w780")
                }
                if (logo == null) {
                    logo = imageUrl(logoPath(json.optJSONArray("logos")), "w500")
                }
            }
        }
        if (lookedUp) {
            val packed = listOf(
                title ?: "-",
                still.orEmpty(),
                backdrop.orEmpty(),
                logo.orEmpty(),
                season?.toString().orEmpty(),
            ).joinToString("\t")
            rememberTimed(cacheKey, packed)
        }
        if (still != null) {
            rememberTimed("still$anilistId-$episode", still)
        }
        return EpisodeFrame(still, title, season, backdrop, logo)
    }

    private fun logoPath(logos: JSONArray?): String? {
        if (logos == null || logos.length() == 0) return null
        val images = buildList {
            for (i in 0 until logos.length()) {
                val obj = logos.optJSONObject(i) ?: continue
                val path = obj.optString("file_path")
                if (!path.startsWith("/")) continue
                val language = obj.optString("iso_639_1").takeIf { it.isNotBlank() }
                add(TmdbImage(path, language, obj.optDouble("vote_average", 0.0)))
            }
        }
        return pickLogo(images)
    }

    /** Logo and wide backdrop for home hero pages. Empty when there is no key. */
    fun heroArt(anilistIds: List<Int>): Map<Int, Pair<String?, String?>> {
        val key = apiKey()
        if (key.isBlank()) return emptyMap()
        val index = AnimeListIndex.get(app)
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
        return runCatching { AnimeListIndex.get(app).collectionFor(anilistId) }.getOrNull()
    }

    /** Shows that have not premiered yet, with the TMDB date. */
    fun upcomingTitles(limit: Int = 12): List<DatedTitle> {
        val today = java.time.LocalDate.now().toString()
        return mappedDiscover(
            movie = false,
            query = listOf(
                "with_genres" to "16",
                "with_origin_country" to "JP",
                "with_original_language" to "ja",
                "sort_by" to "first_air_date.asc",
                "first_air_date.gte" to today,
            ),
            limit = limit,
        ).map { (id, item) ->
            DatedTitle(id, shortAirDate(item.optString("first_air_date")) ?: "Soon")
        }
    }

    /** Recent Japanese animation with enough votes, not the all-time classics. */
    fun topRatedIds(limit: Int = 12): List<Int> {
        val since = java.time.LocalDate.now().minusMonths(18).toString()
        return mappedDiscover(
            movie = false,
            query = listOf(
                "with_genres" to "16",
                "with_origin_country" to "JP",
                "with_original_language" to "ja",
                "sort_by" to "vote_average.desc",
                "vote_count.gte" to "40",
                "first_air_date.gte" to since,
            ),
            limit = limit,
        ).map { it.first }
    }

    fun becauseYouWatched(anilistId: Int, limit: Int = 12): List<Int> {
        val key = apiKey()
        if (key.isBlank() || anilistId <= 0) return emptyList()
        val mapped = runCatching { AnimeListIndex.get(app).find(anilistId) }.getOrNull() ?: return emptyList()
        val kind = if (mapped.movie) "movie" else "tv"
        val body = get(api("$kind/${mapped.tmdbId}/recommendations", key)) ?: return emptyList()
        return suggestionIds(JSONObject(body), mapped.movie, AnimeListIndex.get(app), limit)
            .filter { it != anilistId }
    }

    fun networkShelf(anilistId: Int): NetworkShelf? {
        val key = apiKey()
        if (key.isBlank() || anilistId <= 0) return null
        val mapped = runCatching { AnimeListIndex.get(app).find(anilistId) }.getOrNull() ?: return null
        if (mapped.movie) return null
        val body = get(api("tv/${mapped.tmdbId}", key)) ?: return null
        val networks = JSONObject(body).optJSONArray("networks") ?: return null
        val network = (0 until networks.length()).firstNotNullOfOrNull { index ->
            networks.optJSONObject(index)?.takeIf { it.optInt("id") > 0 && it.optString("name").isNotBlank() }
        } ?: return null
        val ids = mappedDiscover(
            movie = false,
            query = listOf(
                "with_networks" to network.optInt("id").toString(),
                "with_genres" to "16",
                "sort_by" to "popularity.desc",
                "first_air_date.gte" to java.time.LocalDate.now().minusYears(3).toString(),
            ),
            limit = 12,
        ).map { it.first }.filter { it != anilistId }
        if (ids.isEmpty()) return null
        return NetworkShelf(
            name = network.optString("name"),
            logoUrl = imageUrl(network.optString("logo_path"), "w154"),
            anilistIds = ids,
        )
    }

    fun episodeDetail(tmdbId: Int, season: Int, episode: Int): EpisodeDetail? {
        val key = apiKey()
        if (key.isBlank() || tmdbId <= 0 || episode <= 0) return null
        val cacheKey = "ep$tmdbId-$season-$episode"
        prefs.getString(cacheKey, null)?.let { raw ->
            decodeEpisode(raw)?.let { return it }
        }
        val body = get(api("tv/$tmdbId/season/$season/episode/$episode", key)) ?: return null
        val item = JSONObject(body)
        val detail = EpisodeDetail(
            number = item.optInt("episode_number"),
            title = item.optString("name").trim(),
            stillUrl = imageUrl(item.optString("still_path"), "w780"),
            airLabel = shortAirDate(item.optString("air_date")),
            overview = item.optString("overview").trim().takeIf { it.isNotEmpty() },
            runtimeMinutes = item.optInt("runtime").takeIf { it > 0 },
            guests = castCredits(item.optJSONArray("guest_stars")).take(6),
            crew = crewCredits(item.optJSONArray("crew")).take(4),
        )
        prefs.edit().putString(cacheKey, encodeEpisode(detail)).apply()
        return detail
    }

    fun person(id: Int): PersonProfile? {
        val key = apiKey()
        if (key.isBlank() || id <= 0) return null
        val cacheKey = "person$id"
        prefs.getString(cacheKey, null)?.let { raw ->
            decodePerson(raw)?.let { return it }
        }
        val body = get(api("person/$id", key, "append_to_response" to "combined_credits")) ?: return null
        val json = JSONObject(body)
        val name = json.optString("name").trim()
        if (name.isEmpty()) return null
        val profile = PersonProfile(
            id = id,
            name = name,
            bio = json.optString("biography").trim().take(700).takeIf { it.isNotEmpty() },
            photoUrl = imageUrl(json.optString("profile_path"), "w185"),
            knownFor = knownFor(json.optJSONObject("combined_credits"), AnimeListIndex.get(app)),
        )
        prefs.edit().putString(cacheKey, encodePerson(profile)).apply()
        return profile
    }

    private fun mappedDiscover(
        movie: Boolean,
        query: List<Pair<String, String>>,
        limit: Int,
    ): List<Pair<Int, JSONObject>> {
        val key = apiKey()
        if (key.isBlank()) return emptyList()
        val index = AnimeListIndex.get(app)
        val path = if (movie) "discover/movie" else "discover/tv"
        val body = get(api(path, key, *query.toTypedArray())) ?: return emptyList()
        val list = JSONObject(body).optJSONArray("results") ?: return emptyList()
        return buildList {
            for (i in 0 until list.length()) {
                val item = list.optJSONObject(i) ?: continue
                val anilist = index.anilistForTmdb(item.optInt("id"), movie) ?: continue
                if (any { it.first == anilist }) continue
                add(anilist to item)
                if (size >= limit) break
            }
        }
    }

    fun photoFor(person: AnimePerson, art: TitleArt?): String? {
        if (!person.imageUrl.isNullOrBlank()) return person.imageUrl
        val photos = art?.castPhotos ?: return null
        val keys = listOf(person.name, person.role.orEmpty()).map { nameKey(it) }.filter { it.isNotEmpty() }
        return keys.firstNotNullOfOrNull { photos[it] }
    }

    private fun fetch(detail: AnimeSummary, key: String): TitleArt? {
        val mapped = runCatching { AnimeListIndex.get(app).find(detail.id) }.getOrNull()
        val movie = mapped?.movie ?: detail.format.equals("MOVIE", true)
        val id = mapped?.tmdbId
            ?: findId(detail.id, detail.searchTitles().firstOrNull() ?: detail.title, detail.seasonYear, movie)
            ?: return null
        val kind = if (movie) "movie" else "tv"
        val extra = if (movie) {
            "images,release_dates,videos,credits,keywords,recommendations,watch/providers"
        } else {
            "images,content_ratings,videos,credits,keywords,recommendations,watch/providers"
        }
        val body = get(api("$kind/$id", key, "append_to_response" to extra, "include_image_language" to "en,ja,null"))
            ?: return null
        val json = JSONObject(body)
        val images = json.optJSONObject("images")
        val logoGallery = gallery(images?.optJSONArray("logos"), "w500", 4, pngOnly = true)
        val logo = logoGallery.firstOrNull()
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
        val index = AnimeListIndex.get(app)
        val suggestions = suggestions(json.optJSONObject("recommendations"), movie, index)
        val posters = gallery(images?.optJSONArray("posters"), "w342", 8)
        val offers = watchOffers(json.optJSONObject("watch/providers"))
        val collection = if (movie) {
            val owned = json.optJSONObject("belongs_to_collection")
            val collectionId = owned?.optInt("id") ?: 0
            val collectionBody = if (collectionId > 0) get(api("collection/$collectionId", key)) else null
            movieCollection(owned, collectionBody, index)
        } else {
            null
        }
        val next = json.optJSONObject("next_episode_to_air")
        val nextAir = next?.let { episode ->
            listOfNotNull(
                shortAirDate(episode.optString("air_date")),
                episode.optString("name").trim().takeIf { it.isNotEmpty() },
            ).joinToString(" · ").takeIf { it.isNotEmpty() }
        }
        val countryCode = if (movie) {
            json.optJSONArray("production_countries")?.optJSONObject(0)?.optString("iso_3166_1")
        } else {
            json.optJSONArray("origin_country")?.optString(0)
        }
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
            tagline = json.optString("tagline").trim().takeIf { it.isNotEmpty() },
            originalLanguage = languageLabel(json.optString("original_language")),
            originCountry = countryLabel(countryCode),
            status = json.optString("status").trim().takeIf { it.isNotEmpty() },
            firstAir = shortAirDate(if (movie) json.optString("release_date") else json.optString("first_air_date")),
            lastAir = if (movie) null else shortAirDate(json.optString("last_air_date")),
            nextAir = nextAir,
            posters = posters,
            logoGallery = logoGallery,
            providers = offers.first,
            providerLink = offers.second,
            castList = castCredits(json.optJSONObject("credits")?.optJSONArray("cast")),
            collectionName = collection?.first,
            collectionItems = collection?.second.orEmpty(),
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
        val raw = freshString("art4$anilistId", WEEK_MS) ?: return null
        return runCatching { decode(raw) }.getOrNull()
    }

    private fun remember(anilistId: Int, art: TitleArt) {
        prefs.edit()
            .putString("art4$anilistId", encode(art))
            .putLong("art4At$anilistId", System.currentTimeMillis())
            .apply()
    }

    private fun cachedId(anilistId: Int): Int? {
        val at = prefs.getLong("tmdbAt$anilistId", 0L)
        val id = prefs.getInt("tmdb$anilistId", 0)
        if (id <= 0) return null
        if (at == 0L || System.currentTimeMillis() - at > TWO_WEEKS_MS) {
            prefs.edit().remove("tmdb$anilistId").remove("tmdbAt$anilistId").apply()
            return null
        }
        return id
    }

    private fun stampKey(key: String): String = when {
        key.startsWith("art4") -> "art4At${key.removePrefix("art4")}"
        key.startsWith("tmdb") -> "tmdbAt${key.removePrefix("tmdb")}"
        else -> "${key}At"
    }

    private fun freshString(key: String, maxAgeMs: Long): String? {
        val raw = prefs.getString(key, null) ?: return null
        val stamp = stampKey(key)
        val at = prefs.getLong(stamp, 0L)
        if (at == 0L || System.currentTimeMillis() - at > maxAgeMs) {
            prefs.edit().remove(key).remove(stamp).apply()
            return null
        }
        return raw
    }

    private fun rememberTimed(key: String, value: String) {
        prefs.edit()
            .putString(key, value)
            .putLong(stampKey(key), System.currentTimeMillis())
            .apply()
    }

    private fun pruneExpired() {
        val now = System.currentTimeMillis()
        val editor = prefs.edit()
        var changed = false
        prefs.all.keys.toList().forEach { key ->
            if (key.startsWith("art4At") || key.startsWith("tmdbAt") || key.endsWith("At")) return@forEach
            val maxAge = if (key.startsWith("tmdb")) TWO_WEEKS_MS else WEEK_MS
            val tracked = key.startsWith("art4") || key.startsWith("frame3") ||
                key.startsWith("still") || key.startsWith("tmdb")
            if (!tracked) return@forEach
            val stamp = stampKey(key)
            val at = prefs.getLong(stamp, 0L)
            if (at == 0L || now - at > maxAge) {
                editor.remove(key).remove(stamp)
                changed = true
            }
        }
        if (changed) editor.apply()
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
        @Volatile private var sharedCatalog: TmdbCatalog? = null

        fun shared(context: Context): TmdbCatalog {
            sharedCatalog?.let { return it }
            return synchronized(this) {
                sharedCatalog ?: TmdbCatalog(context.applicationContext).also {
                    it.pruneExpired()
                    sharedCatalog = it
                }
            }
        }

        private const val PREFS = "anikitty_tmdb"
        private val WEEK_MS = TimeUnit.DAYS.toMillis(7)
        private val TWO_WEEKS_MS = TimeUnit.DAYS.toMillis(14)
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
        val name = item.optString("name").ifBlank { type }
        val kind = when {
            Regex("""(?i)\bPV\b""").containsMatchIn(name) -> "PV"
            type == "Trailer" -> "Trailer"
            type == "Teaser" -> "Teaser"
            else -> null
        } ?: continue
        out += VideoClip(name, key, kind)
        if (out.size >= 8) break
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
            add(BrandMark(name, imageUrl(item.optString("logo_path"), "w154"), item.optInt("id")))
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
        out[name] = CrewCredit(name, job, imageUrl(item.optString("profile_path"), "w185"), item.optInt("id"))
        if (out.size >= 8) break
    }
    return out.values.toList()
}

private fun gallery(list: JSONArray?, size: String, limit: Int, pngOnly: Boolean = false): List<String> {
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
                ),
            )
        }
    }
    val usable = if (pngOnly) images.filter { it.path.endsWith(".png", ignoreCase = true) } else images
    return rankImages(usable).take(limit).mapNotNull { imageUrl(it.path, size) }
}

private fun watchOffers(providers: JSONObject?): Pair<List<WatchOffer>, String?> {
    val results = providers?.optJSONObject("results") ?: return emptyList<WatchOffer>() to null
    val region = java.util.Locale.getDefault().country.uppercase()
    if (region.isBlank()) return emptyList<WatchOffer>() to null
    val block = results.optJSONObject(region) ?: return emptyList<WatchOffer>() to null
    val link = block.optString("link").takeIf { it.startsWith("http") }
    val seen = HashSet<String>()
    val offers = buildList {
        for (bucket in listOf("flatrate", "free", "ads", "rent", "buy")) {
            val list = block.optJSONArray(bucket) ?: continue
            val kind = when (bucket) {
                "rent" -> "Rent"
                "buy" -> "Buy"
                else -> null
            }
            for (i in 0 until list.length()) {
                val item = list.optJSONObject(i) ?: continue
                val provider = item.optString("provider_name").trim()
                if (provider.isEmpty()) continue
                val name = if (kind == null) provider else "$provider · $kind"
                if (!seen.add(name.lowercase())) continue
                add(WatchOffer(name, imageUrl(item.optString("logo_path"), "w92")))
                if (size >= 8) return@buildList
            }
        }
    }
    return offers to link
}

private fun movieCollection(
    collection: JSONObject?,
    body: String?,
    index: AnimeListIndex,
): Pair<String, List<Suggestion>>? {
    if (collection == null) return null
    val name = collection.optString("name").trim()
    if (collection.optInt("id") <= 0 || name.isEmpty()) return null
    if (body == null) return name to emptyList()
    val parts = JSONObject(body).optJSONArray("parts") ?: return name to emptyList()
    val items = buildList {
        for (i in 0 until parts.length()) {
            val item = parts.optJSONObject(i) ?: continue
            val anilist = index.anilistForTmdb(item.optInt("id"), movie = true) ?: continue
            val title = item.optString("title").ifBlank { item.optString("name") }.trim()
            if (title.isEmpty()) continue
            add(Suggestion(anilist, title, imageUrl(item.optString("poster_path"), "w342")))
            if (size >= 12) break
        }
    }
    return name to items
}

private fun suggestionIds(body: JSONObject, movie: Boolean, index: AnimeListIndex, limit: Int): List<Int> {
    val list = body.optJSONArray("results") ?: return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val anilist = index.anilistForTmdb(item.optInt("id"), movie) ?: continue
            if (anilist in this) continue
            add(anilist)
            if (size >= limit) break
        }
    }
}

private fun knownFor(credits: JSONObject?, index: AnimeListIndex): List<Suggestion> {
    val cast = credits?.optJSONArray("cast") ?: return emptyList()
    val ranked = buildList {
        for (i in 0 until cast.length().coerceAtMost(40)) {
            cast.optJSONObject(i)?.let { add(it) }
        }
    }.sortedByDescending { it.optDouble("popularity") }
    return buildList {
        for (item in ranked) {
            val movie = item.optString("media_type") == "movie"
            val anilist = index.anilistForTmdb(item.optInt("id"), movie) ?: continue
            val title = (if (movie) item.optString("title") else item.optString("name")).trim()
            if (title.isEmpty() || any { it.anilistId == anilist }) continue
            add(Suggestion(anilist, title, imageUrl(item.optString("poster_path"), "w185")))
            if (size >= 8) break
        }
    }
}

private fun castCredits(list: JSONArray?): List<CastCredit> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name").trim()
            if (name.isEmpty()) continue
            val role = item.optString("character").ifBlank { item.optString("job") }
            add(CastCredit(item.optInt("id"), name, role, imageUrl(item.optString("profile_path"), "w185")))
            if (size >= 16) break
        }
    }
}

private fun languageLabel(code: String?): String? = when (code?.lowercase()) {
    "ja" -> "Japanese"
    "en" -> "English"
    "ko" -> "Korean"
    "zh" -> "Chinese"
    "fr" -> "French"
    null, "" -> null
    else -> code.uppercase()
}

private fun countryLabel(code: String?): String? = when (code?.uppercase()) {
    "JP" -> "Japan"
    "US" -> "United States"
    "KR" -> "Korea"
    "CN" -> "China"
    "GB" -> "United Kingdom"
    "FR" -> "France"
    null, "" -> null
    else -> code.uppercase()
}

private fun encodeEpisode(detail: EpisodeDetail): String {
    return JSONObject()
        .put("n", detail.number)
        .put("title", detail.title)
        .put("still", detail.stillUrl ?: "")
        .put("air", detail.airLabel ?: "")
        .put("overview", detail.overview ?: "")
        .put("runtime", detail.runtimeMinutes ?: 0)
        .put("guests", JSONArray().apply {
            detail.guests.forEach { person ->
                put(JSONObject().put("id", person.personId).put("name", person.name).put("role", person.role).put("photo", person.photoUrl ?: ""))
            }
        })
        .put("crew", JSONArray().apply {
            detail.crew.forEach { person ->
                put(JSONObject().put("id", person.personId).put("name", person.name).put("job", person.job).put("photo", person.photoUrl ?: ""))
            }
        })
        .toString()
}

private fun decodeEpisode(raw: String): EpisodeDetail? {
    val json = runCatching { JSONObject(raw) }.getOrNull() ?: return null
    return EpisodeDetail(
        number = json.optInt("n"),
        title = json.optString("title"),
        stillUrl = json.optString("still").takeIf { it.startsWith("http") },
        airLabel = json.optString("air").takeIf { it.isNotBlank() },
        overview = json.optString("overview").takeIf { it.isNotBlank() },
        runtimeMinutes = json.optInt("runtime").takeIf { it > 0 },
        guests = castFrom(json.optJSONArray("guests")),
        crew = crewFrom(json.optJSONArray("crew")),
    )
}

private fun encodePerson(profile: PersonProfile): String {
    return JSONObject()
        .put("id", profile.id)
        .put("name", profile.name)
        .put("bio", profile.bio ?: "")
        .put("photo", profile.photoUrl ?: "")
        .put("known", JSONArray().apply {
            profile.knownFor.forEach { item ->
                put(JSONObject().put("id", item.anilistId).put("title", item.title).put("poster", item.posterUrl ?: ""))
            }
        })
        .toString()
}

private fun decodePerson(raw: String): PersonProfile? {
    val json = runCatching { JSONObject(raw) }.getOrNull() ?: return null
    val name = json.optString("name")
    if (name.isBlank()) return null
    return PersonProfile(
        id = json.optInt("id"),
        name = name,
        bio = json.optString("bio").takeIf { it.isNotBlank() },
        photoUrl = json.optString("photo").takeIf { it.startsWith("http") },
        knownFor = suggestionsFrom(json.optJSONArray("known")),
    )
}

private fun castFrom(list: JSONArray?): List<CastCredit> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name")
            if (name.isBlank()) continue
            add(CastCredit(item.optInt("id"), name, item.optString("role"), item.optString("photo").takeIf { it.startsWith("http") }))
        }
    }
}

private fun crewFrom(list: JSONArray?): List<CrewCredit> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val name = item.optString("name")
            if (name.isBlank()) continue
            add(CrewCredit(name, item.optString("job"), item.optString("photo").takeIf { it.startsWith("http") }, item.optInt("id")))
        }
    }
}

private fun suggestionsFrom(list: JSONArray?): List<Suggestion> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val title = item.optString("title")
            if (title.isBlank()) continue
            add(Suggestion(item.optInt("id"), title, item.optString("poster").takeIf { it.startsWith("http") }))
        }
    }
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
                put(JSONObject().put("name", clip.name).put("id", clip.youtubeId).put("type", clip.type))
            }
        })
        .put("tagline", art.tagline ?: "")
        .put("language", art.originalLanguage ?: "")
        .put("country", art.originCountry ?: "")
        .put("statusLabel", art.status ?: "")
        .put("firstAir", art.firstAir ?: "")
        .put("lastAir", art.lastAir ?: "")
        .put("nextAir", art.nextAir ?: "")
        .put("posters", JSONArray(art.posters))
        .put("logoGallery", JSONArray(art.logoGallery))
        .put("providerLink", art.providerLink ?: "")
        .put("collection", art.collectionName ?: "")
        .put("providers", JSONArray().apply {
            art.providers.forEach { offer ->
                put(JSONObject().put("name", offer.name).put("logo", offer.logoUrl ?: ""))
            }
        })
        .put("castList", JSONArray().apply {
            art.castList.forEach { person ->
                put(JSONObject().put("id", person.personId).put("name", person.name).put("role", person.role).put("photo", person.photoUrl ?: ""))
            }
        })
        .put("collectionItems", JSONArray().apply {
            art.collectionItems.forEach { item ->
                put(JSONObject().put("id", item.anilistId).put("title", item.title).put("poster", item.posterUrl ?: ""))
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
                put(JSONObject().put("id", person.personId).put("name", person.name).put("job", person.job).put("photo", person.photoUrl ?: ""))
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
            add(CrewCredit(name, item.optString("job"), item.optString("photo").takeIf { it.startsWith("http") }, item.optInt("id")))
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
                add(
                    VideoClip(
                        item.optString("name").ifBlank { "Trailer" },
                        id,
                        item.optString("type").ifBlank { "Trailer" },
                    ),
                )
            }
        },
        tagline = json.optString("tagline").takeIf { it.isNotBlank() },
        originalLanguage = json.optString("language").takeIf { it.isNotBlank() },
        originCountry = json.optString("country").takeIf { it.isNotBlank() },
        status = json.optString("statusLabel").takeIf { it.isNotBlank() },
        firstAir = json.optString("firstAir").takeIf { it.isNotBlank() },
        lastAir = json.optString("lastAir").takeIf { it.isNotBlank() },
        nextAir = json.optString("nextAir").takeIf { it.isNotBlank() },
        posters = stringList(json.optJSONArray("posters")),
        logoGallery = stringList(json.optJSONArray("logoGallery")),
        providers = buildList {
            val list = json.optJSONArray("providers") ?: return@buildList
            for (i in 0 until list.length()) {
                val item = list.optJSONObject(i) ?: continue
                val name = item.optString("name")
                if (name.isBlank()) continue
                add(WatchOffer(name, item.optString("logo").takeIf { it.startsWith("http") }))
            }
        },
        providerLink = json.optString("providerLink").takeIf { it.startsWith("http") },
        castList = castFrom(json.optJSONArray("castList")),
        collectionName = json.optString("collection").takeIf { it.isNotBlank() },
        collectionItems = suggestionsFrom(json.optJSONArray("collectionItems")),
    )
}

private fun stringList(list: JSONArray?): List<String> {
    if (list == null) return emptyList()
    return buildList {
        for (i in 0 until list.length()) {
            val url = list.optString(i)
            if (url.startsWith("http")) add(url)
        }
    }
}
