// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.tmdb

import android.content.Context
import android.util.JsonReader
import android.util.JsonToken
import okhttp3.OkHttpClient
import okhttp3.Request
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.TimeUnit

/**
 * AniList to TMDB ids from Fribb's anime-lists. The JSON is downloaded, trimmed
 * to the fields we use, and cached on the phone. It is not shipped in the APK.
 * Refresh is about once a week, sooner when the server ETag changes.
 */
class AnimeListIndex(context: Context) {
    private val app = context.applicationContext
    private val prefs = app.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build()

    @Volatile private var byAnilist: Map<Int, MappedShow>? = null
    @Volatile private var byTmdb: Map<String, Int>? = null

    fun find(anilistId: Int): MappedShow? {
        if (anilistId <= 0) return null
        ensure()
        return byAnilist?.get(anilistId)
    }

    fun anilistForTmdb(tmdbId: Int, movie: Boolean): Int? {
        if (tmdbId <= 0) return null
        ensure()
        return byTmdb?.get(key(tmdbId, movie))
    }

    fun collectionFor(anilistId: Int): Pair<String, List<Int>>? {
        if (anilistId <= 0) return null
        ensureCollections()
        val raw = prefs.getString("col$anilistId", null) ?: return null
        val split = raw.indexOf('\t')
        if (split <= 0) return null
        val name = raw.substring(0, split)
        val ids = raw.substring(split + 1).split(',').mapNotNull { it.toIntOrNull() }.filter { it != anilistId }
        if (ids.isEmpty()) return null
        return name to ids.take(18)
    }

    private fun ensure() {
        if (byAnilist != null) return
        synchronized(this) {
            if (byAnilist != null) return
            val file = File(app.cacheDir, FILE)
            val stale = System.currentTimeMillis() - prefs.getLong(FETCHED, 0L) > WEEK
            if (!file.exists() || stale) {
                runCatching { refresh(file) }
            }
            if (file.exists()) load(file)
        }
    }

    private fun ensureCollections() {
        val file = File(app.cacheDir, COLLECTION_FILE)
        val stale = System.currentTimeMillis() - prefs.getLong(COLLECTION_AT, 0L) > WEEK
        if (file.exists() && !stale && prefs.contains("colready")) return
        synchronized(this) {
            if (file.exists() && !stale && prefs.contains("colready")) return
            runCatching { refreshCollections(file) }
        }
    }

    private fun refresh(file: File) {
        val etag = prefs.getString(ETAG, null)
        val request = Request.Builder()
            .url(LIST_URL)
            .header("Accept", "application/json")
            .header("User-Agent", "AniKitty")
            .apply { if (!etag.isNullOrBlank()) header("If-None-Match", etag) }
            .build()
        http.newCall(request).execute().use { response ->
            if (response.code == 304 && file.exists()) {
                prefs.edit().putLong(FETCHED, System.currentTimeMillis()).apply()
                return
            }
            if (!response.isSuccessful) return
            val body = response.body ?: return
            val tmp = File(app.cacheDir, "$FILE.tmp")
            body.byteStream().use { input ->
                JsonReader(InputStreamReader(input, Charsets.UTF_8)).use { reader ->
                    tmp.bufferedWriter().use { out ->
                        reader.beginArray()
                        while (reader.hasNext()) {
                            readShow(reader)?.let { out.append(writeMapped(it)).append('\n') }
                        }
                        reader.endArray()
                    }
                }
            }
            if (tmp.length() > 0L) {
                if (file.exists()) file.delete()
                tmp.renameTo(file)
            } else {
                tmp.delete()
            }
            prefs.edit()
                .putString(ETAG, response.header("ETag"))
                .putLong(FETCHED, System.currentTimeMillis())
                .apply()
        }
    }

    private fun refreshCollections(file: File) {
        val request = Request.Builder()
            .url(COLLECTION_URL)
            .header("Accept", "application/json")
            .header("User-Agent", "AniKitty")
            .build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) return
            val text = response.body?.string().orEmpty()
            if (text.isBlank()) return
            file.writeText(text)
            val editor = prefs.edit()
            val array = org.json.JSONArray(text)
            for (i in 0 until array.length()) {
                val item = array.optJSONObject(i) ?: continue
                val name = item.optString("name").trim()
                val ids = item.optJSONArray("ids") ?: continue
                if (name.isEmpty() || ids.length() < 2) continue
                val numbers = buildList {
                    for (n in 0 until ids.length()) {
                        val id = ids.optInt(n)
                        if (id > 0) add(id)
                    }
                }
                val packed = name.replace('\t', ' ') + "\t" + numbers.joinToString(",")
                numbers.forEach { id -> editor.putString("col$id", packed) }
            }
            editor.putBoolean("colready", true).putLong(COLLECTION_AT, System.currentTimeMillis()).apply()
        }
    }

    private fun load(file: File) {
        val forward = HashMap<Int, MappedShow>(20_000)
        val reverse = HashMap<String, Int>(20_000)
        file.bufferedReader().useLines { lines ->
            lines.forEach { line ->
                val show = readMapped(line) ?: return@forEach
                forward.putIfAbsent(show.anilistId, show)
                reverse.putIfAbsent(key(show.tmdbId, show.movie), show.anilistId)
            }
        }
        byAnilist = forward
        byTmdb = reverse
    }

    private fun readShow(reader: JsonReader): MappedShow? {
        var anilist = 0
        var mal = 0
        var tvdb = 0
        var kitsu = 0
        var tmdb = 0
        var movie = false
        var season: Int? = null
        var offset = 0
        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "anilist_id" -> anilist = readInt(reader)
                "mal_id" -> mal = readInt(reader)
                "tvdb_id" -> tvdb = readInt(reader)
                "kitsu_id" -> kitsu = readInt(reader)
                "themoviedb_id" -> {
                    val parsed = readTmdb(reader)
                    if (parsed != null) {
                        tmdb = parsed.first
                        movie = parsed.second
                    }
                }
                "season" -> season = readNamedInt(reader, "tmdb")
                "episode_offset" -> offset = readNamedInt(reader, "tmdb") ?: 0
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        if (anilist <= 0 || tmdb <= 0) return null
        return MappedShow(anilist, tmdb, movie, season, offset, mal, tvdb, kitsu)
    }

    private fun readTmdb(reader: JsonReader): Pair<Int, Boolean>? {
        if (reader.peek() != JsonToken.BEGIN_OBJECT) {
            reader.skipValue()
            return null
        }
        var tv = 0
        var film = 0
        reader.beginObject()
        while (reader.hasNext()) {
            when (reader.nextName()) {
                "tv" -> tv = readInt(reader)
                "movie" -> film = readMovie(reader)
                else -> reader.skipValue()
            }
        }
        reader.endObject()
        return when {
            tv > 0 -> tv to false
            film > 0 -> film to true
            else -> null
        }
    }

    private fun readMovie(reader: JsonReader): Int {
        if (reader.peek() == JsonToken.BEGIN_ARRAY) {
            reader.beginArray()
            var first = 0
            while (reader.hasNext()) {
                val n = readInt(reader)
                if (first == 0) first = n
            }
            reader.endArray()
            return first
        }
        return readInt(reader)
    }

    private fun readNamedInt(reader: JsonReader, name: String): Int? {
        if (reader.peek() != JsonToken.BEGIN_OBJECT) {
            reader.skipValue()
            return null
        }
        var found: Int? = null
        reader.beginObject()
        while (reader.hasNext()) {
            if (reader.nextName() == name) found = readInt(reader) else reader.skipValue()
        }
        reader.endObject()
        return found
    }

    private fun readInt(reader: JsonReader): Int {
        return when (reader.peek()) {
            JsonToken.NUMBER -> reader.nextInt()
            JsonToken.STRING -> reader.nextString().toIntOrNull() ?: 0
            JsonToken.NULL -> {
                reader.nextNull()
                0
            }
            else -> {
                reader.skipValue()
                0
            }
        }
    }

    private fun key(tmdbId: Int, movie: Boolean) = if (movie) "m$tmdbId" else "t$tmdbId"

    private companion object {
        const val PREFS = "anikitty_animemap"
        const val FILE = "anilist-tmdb.tsv"
        const val COLLECTION_FILE = "anilist-collections.json"
        const val ETAG = "etag"
        const val FETCHED = "fetchedAt"
        const val COLLECTION_AT = "collectionsAt"
        const val WEEK = 7L * 24 * 60 * 60 * 1000
        const val LIST_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/anime-list-mini.json"
        const val COLLECTION_URL = "https://raw.githubusercontent.com/Fribb/anime-lists/master/collections/anilist_collection.json"
    }
}
