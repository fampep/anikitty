// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.banner

import android.content.Context
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.tmdb.TmdbCatalog
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Landscape backdrop lookup. Keyed hosts are skipped when no key is set.
 * Chosen URLs are cached for two weeks. Poster rails never call this.
 */
class BannerRepository(context: Context) {
    private val app = context.applicationContext
    private val prefs = app.getSharedPreferences("anikitty_banners", Context.MODE_PRIVATE)
    private val http = OkHttpClient.Builder()
        .callTimeout(6, TimeUnit.SECONDS)
        .build()
    private val memory = ConcurrentHashMap<Int, BannerChoice>()

    fun resolve(
        anilistId: Int,
        anilistBanner: String?,
        cover: String?,
        title: String? = null,
        year: Int? = null,
        movie: Boolean = false,
    ): BannerChoice? {
        if (anilistId <= 0) return local(anilistBanner, cover)
        memory[anilistId]?.let { return it }
        cached(anilistId)?.let {
            memory[anilistId] = it
            return it
        }
        val choice = runCatching { fetch(anilistId, anilistBanner, cover, title, year, movie) }.getOrNull()
            ?: local(anilistBanner, cover)
            ?: return null
        memory[anilistId] = choice
        prefs.edit()
            .putString("u$anilistId", choice.url)
            .putBoolean("b$anilistId", choice.blur)
            .putString("s$anilistId", choice.source)
            .putLong("t$anilistId", System.currentTimeMillis())
            .apply()
        return choice
    }

    private fun cached(id: Int): BannerChoice? {
        val url = prefs.getString("u$id", null) ?: return null
        val age = System.currentTimeMillis() - prefs.getLong("t$id", 0L)
        if (age > TimeUnit.DAYS.toMillis(14)) return null
        return BannerChoice(url, prefs.getBoolean("b$id", false), prefs.getString("s$id", "") ?: "")
    }

    private fun fetch(
        id: Int,
        anilistBanner: String?,
        cover: String?,
        title: String?,
        year: Int?,
        movie: Boolean,
    ): BannerChoice? {
        val tmdbKey = key("tmdb", BuildConfig.TMDB_API_KEY)
        val fanartKey = key("fanart", BuildConfig.FANART_API_KEY)
        val mapped = if (tmdbKey.isNotBlank() || fanartKey.isNotBlank()) {
            runCatching { site.anikitty.app.data.tmdb.AnimeListIndex.get(app).find(id) }.getOrNull()
        } else {
            null
        }
        val ids = if (mapped != null) {
            Ids(
                mapped.tmdbId.toString(),
                mapped.tvdbId.takeIf { it > 0 }?.toString(),
                mapped.kitsuId.takeIf { it > 0 }?.toString(),
            )
        } else {
            arm(id)
        }
        val tmdbId = ids?.tmdb ?: TmdbCatalog.shared(app).findId(id, title, year, movie)?.toString()
        val tmdbPath = tmdbId?.let { tmdbBackdrop(it, tmdbKey) }
        val fanart = ids?.tvdb?.let { fanartBackground(it, fanartKey) }
        val kitsu = ids?.kitsu?.let { kitsuLarge(it) }
        return bannerChoices(
            tmdbKeyPresent = tmdbKey.isNotBlank(),
            fanartKeyPresent = fanartKey.isNotBlank(),
            tmdbPath = tmdbPath,
            fanartUrl = fanart,
            kitsuLarge = kitsu,
            anilistBanner = anilistBanner,
            coverExtraLarge = cover,
        ).firstOrNull()
    }

    private fun local(banner: String?, cover: String?): BannerChoice? = bannerChoices(
        tmdbKeyPresent = false,
        fanartKeyPresent = false,
        tmdbPath = null,
        fanartUrl = null,
        kitsuLarge = null,
        anilistBanner = banner,
        coverExtraLarge = cover,
    ).firstOrNull()

    private fun key(name: String, builtIn: String): String {
        val entered = app.getSharedPreferences("anikitty_keys", Context.MODE_PRIVATE)
            .getString(name, null)
            ?.trim()
            .orEmpty()
        return entered.ifBlank { builtIn.trim() }
    }

    private data class Ids(val tmdb: String?, val tvdb: String?, val kitsu: String?)

    private fun arm(id: Int): Ids? {
        val body = get("https://arm.haglund.dev/api/v2/ids?source=anilist&id=$id") ?: return null
        val json = JSONObject(body)
        fun text(name: String) = json.opt(name)?.toString()?.takeIf { it.isNotBlank() && it != "null" }
        return Ids(text("themoviedb"), text("thetvdb"), text("kitsu"))
    }

    private fun tmdbBackdrop(tmdbId: String, apiKey: String): String? {
        if (apiKey.isBlank()) return null
        val tv = get("https://api.themoviedb.org/3/tv/$tmdbId?append_to_response=images&api_key=$apiKey")
        val movie = tv ?: get("https://api.themoviedb.org/3/movie/$tmdbId?append_to_response=images&api_key=$apiKey")
        val images = movie?.let { JSONObject(it).optJSONObject("images") } ?: return null
        val list = images.optJSONArray("backdrops") ?: return null
        val parsed = buildList {
            for (i in 0 until list.length()) {
                val item = list.optJSONObject(i) ?: continue
                val path = item.optString("file_path")
                if (path.isBlank()) continue
                add(
                    TmdbBackdrop(
                        path = path,
                        language = item.optString("iso_639_1").ifBlank { null },
                        aspect = item.optDouble("aspect_ratio", 0.0),
                        vote = item.optDouble("vote_average", 0.0),
                    ),
                )
            }
        }
        return pickTmdbPath(parsed)
    }

    private fun fanartBackground(tvdbId: String, apiKey: String): String? {
        if (apiKey.isBlank()) return null
        val body = get("https://webservice.fanart.tv/v3/tv/$tvdbId?api_key=$apiKey") ?: return null
        val json = JSONObject(body)
        return firstUrl(json, "show4kbackground") ?: firstUrl(json, "showbackground")
    }

    private fun firstUrl(json: JSONObject, name: String): String? {
        val list = json.optJSONArray(name) ?: return null
        var best: String? = null
        var likes = -1
        for (i in 0 until list.length()) {
            val item = list.optJSONObject(i) ?: continue
            val url = item.optString("url")
            if (url.isBlank()) continue
            val score = item.optString("likes").toIntOrNull() ?: 0
            if (score >= likes) {
                likes = score
                best = url
            }
        }
        return best
    }

    private fun kitsuLarge(kitsuId: String): String? {
        val body = get("https://kitsu.app/api/edge/anime/$kitsuId?fields%5Banime%5D=coverImage") ?: return null
        return JSONObject(body).optJSONObject("data")
            ?.optJSONObject("attributes")
            ?.optJSONObject("coverImage")
            ?.optString("large")
            ?.takeIf { it.startsWith("http") }
    }

    private fun get(url: String): String? {
        val request = Request.Builder().url(url).header("Accept", "application/json").build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return null
            return response.body?.string()
        }
    }
}
