package site.anikitty.app.data.fribb

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import site.anikitty.app.BuildConfig
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.TimeUnit

/**
 * Optional TMDB stills / posters. Requires [BuildConfig.TMDB_API_KEY] (gradle
 * `tmdbApiKey` or env `TMDB_API_KEY`). Without a key every call returns empty
 * and the UI keeps AniList streaming thumbs / cover fallbacks.
 */
class TmdbImageClient(
    private val apiKey: String = BuildConfig.TMDB_API_KEY,
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(10, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .callTimeout(18, TimeUnit.SECONDS)
        .build(),
) {
    private val seasonCache = ConcurrentHashMap<String, Map<Int, String>>()
    private val imdbResolveCache = ConcurrentHashMap<String, Pair<Int?, Int?>>()
    private val moviePosterCache = ConcurrentHashMap<Int, String?>()

    val isConfigured: Boolean get() = apiKey.isNotBlank()

    suspend fun episodeStills(
        mapping: FribbMapping,
        episodeNumbers: Collection<Int>,
    ): Map<Int, String> = withContext(Dispatchers.IO) {
        if (!isConfigured || episodeNumbers.isEmpty()) return@withContext emptyMap()

        var tvId = mapping.tmdbTvId
        var movieId = mapping.tmdbMovieId
        if (tvId == null && movieId == null && !mapping.imdbId.isNullOrBlank()) {
            val resolved = resolveImdb(mapping.imdbId)
            tvId = resolved.first
            movieId = resolved.second
        }

        when {
            tvId != null -> tvEpisodeStills(tvId, mapping, episodeNumbers)
            movieId != null -> {
                val poster = movieImage(movieId) ?: return@withContext emptyMap()
                episodeNumbers.associateWith { poster }
            }
            else -> emptyMap()
        }
    }

    private fun tvEpisodeStills(
        tvId: Int,
        mapping: FribbMapping,
        episodeNumbers: Collection<Int>,
    ): Map<Int, String> {
        val season = mapping.resolvedSeason()
        val byTmdbEp = loadSeasonStills(tvId, season)
        if (byTmdbEp.isEmpty()) return emptyMap()
        val out = LinkedHashMap<Int, String>()
        episodeNumbers.forEach { anilistEp ->
            val tmdbEp = mapping.tmdbEpisodeNumber(anilistEp)
            byTmdbEp[tmdbEp]?.let { out[anilistEp] = it }
        }
        return out
    }

    private fun loadSeasonStills(tvId: Int, season: Int): Map<Int, String> {
        val key = "$tvId:$season"
        seasonCache[key]?.let { return it }
        val url = "https://api.themoviedb.org/3/tv/$tvId/season/$season".toHttpUrl()
            .newBuilder()
            .addQueryParameter("api_key", apiKey)
            .build()
        val body = get(url.toString()) ?: return emptyMap()
        val parsed = runCatching {
            val eps = JSONObject(body).optJSONArray("episodes") ?: return@runCatching emptyMap()
            buildMap {
                for (i in 0 until eps.length()) {
                    val ep = eps.optJSONObject(i) ?: continue
                    val num = ep.optInt("episode_number", -1)
                    val still = ep.optString("still_path").takeIf { it.isNotBlank() } ?: continue
                    if (num > 0) put(num, imageUrl(still, width = "w300"))
                }
            }
        }.getOrDefault(emptyMap())
        seasonCache[key] = parsed
        return parsed
    }

    private fun movieImage(movieId: Int): String? {
        moviePosterCache[movieId]?.let { return it }
        val url = "https://api.themoviedb.org/3/movie/$movieId".toHttpUrl()
            .newBuilder()
            .addQueryParameter("api_key", apiKey)
            .build()
        val body = get(url.toString()) ?: return null
        val path = runCatching {
            val o = JSONObject(body)
            o.optString("backdrop_path").takeIf { it.isNotBlank() }
                ?: o.optString("poster_path").takeIf { it.isNotBlank() }
        }.getOrNull()
        val img = path?.let { imageUrl(it, width = "w500") }
        moviePosterCache[movieId] = img
        return img
    }

    private fun resolveImdb(imdbId: String): Pair<Int?, Int?> {
        imdbResolveCache[imdbId]?.let { return it }
        val url = "https://api.themoviedb.org/3/find/$imdbId".toHttpUrl()
            .newBuilder()
            .addQueryParameter("api_key", apiKey)
            .addQueryParameter("external_source", "imdb_id")
            .build()
        val body = get(url.toString()) ?: return (null to null).also { imdbResolveCache[imdbId] = it }
        val pair = runCatching {
            val o = JSONObject(body)
            val tv = o.optJSONArray("tv_results")?.optJSONObject(0)?.optInt("id")
                ?.takeIf { it > 0 }
            val movie = o.optJSONArray("movie_results")?.optJSONObject(0)?.optInt("id")
                ?.takeIf { it > 0 }
            tv to movie
        }.getOrDefault(null to null)
        imdbResolveCache[imdbId] = pair
        return pair
    }

    private fun get(url: String): String? {
        val req = Request.Builder()
            .url(url)
            .header("Accept", "application/json")
            .get()
            .build()
        return runCatching {
            http.newCall(req).execute().use { res ->
                val text = res.body?.string().orEmpty()
                if (!res.isSuccessful) null else text
            }
        }.getOrNull()
    }

    companion object {
        fun imageUrl(path: String, width: String = "w300"): String {
            val p = if (path.startsWith("/")) path else "/$path"
            return "https://image.tmdb.org/t/p/$width$p"
        }
    }
}
