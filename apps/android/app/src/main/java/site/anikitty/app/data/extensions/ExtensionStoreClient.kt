// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject

class ExtensionStoreClient(
    private val indexUrls: List<String> = DEFAULT_INDEX_URLS,
) {
    suspend fun fetchIndex(): StoreIndex = withContext(Dispatchers.IO) {
        val loaded = ArrayList<StoreIndex>()
        var last: String? = null
        for (url in indexUrls) {
            val result = runCatching {
                parseIndex(ExtensionHttp.getString(url), sourceUrl = url)
            }
            if (result.isSuccess) loaded += result.getOrThrow()
            else last = result.exceptionOrNull()?.message
        }
        if (loaded.isEmpty()) error(last ?: "Could not load extension store")
        mergeStoreIndexes(loaded)
    }

    private fun parseIndex(raw: String, sourceUrl: String): StoreIndex {
        val o = JSONObject(raw)
        val protocol = o.optString("protocol").takeIf { it.isNotBlank() } ?: "1.1"
        val arr = o.getJSONArray("extensions")
        val list = buildList {
            for (i in 0 until arr.length()) {
                val e = arr.getJSONObject(i)
                val id = e.getString("id")
                val name = e.getString("name")
                if (isRetiredExtension(id, name)) continue
                add(
                    StoreListing(
                        id = id,
                        name = name,
                        description = e.optString("description", ""),
                        github = e.getString("github"),
                        author = e.optString("author", ""),
                        featured = e.optBoolean("featured", false),
                        manifestPath = e.optString("manifestPath")
                            .takeIf { it.isNotBlank() },
                        iconUrl = e.optString("iconUrl").takeIf { it.isNotBlank() },
                        siteUrl = e.optString("siteUrl").takeIf { it.isNotBlank() },
                        version = e.optString("version").takeIf { it.isNotBlank() },
                        protocol = e.optString("protocol").takeIf { it.isNotBlank() }
                            ?: protocol,
                    ),
                )
            }
        }
        return StoreIndex(
            apiVersion = o.optInt("apiVersion", 1),
            updatedAt = o.optString("updatedAt", null)?.takeIf { it.isNotBlank() },
            extensions = list,
            sourceUrl = sourceUrl,
            sourceUrls = listOf(sourceUrl),
        )
    }

    companion object {
        /**
         * Store of record: anikitty-extensions `main` (currently the reanime
         * index). The monorepo `main` copy is only a fallback.
         */
        val DEFAULT_INDEX_URLS = listOf(
            "https://raw.githubusercontent.com/fampep/anikitty-extensions/main/store/index.json",
            "https://raw.githubusercontent.com/fampep/anikitty/main/extensions/store/index.json",
        )

        /**
         * Main store submission — opens GitHub issue form on the extensions repo
         * (falls back to anikitty issues until that public repo exists).
         */
        const val SUBMIT_URL =
            "https://github.com/fampep/anikitty-extensions/issues/new?template=extension_submit.yml"

        const val SUBMIT_FALLBACK_URL =
            "https://github.com/fampep/anikitty/issues/new?template=extension_submit.yml"
    }
}

/**
 * anikitty-extensions/main is the catalog. A newer or same-day monorepo copy can
 * add a listing the mirror does not have yet. An older copy cannot put a removed
 * listing back. The same id keeps the newer row; a tie keeps the mirror.
 * Ani.pm / Settlar / Yozora are dropped in either index.
 */
internal fun mergeStoreIndexes(loaded: List<StoreIndex>): StoreIndex {
    val clean = loaded.map { index ->
        index.copy(
            extensions = index.extensions.filterNot { isRetiredExtension(it.id, it.name) },
        )
    }
    val mirror = clean.firstOrNull { it.sourceUrl?.contains("anikitty-extensions") == true }
    val others = clean.filter { it !== mirror }
    val base = mirror ?: clean.maxBy { it.updatedAt.orEmpty() }
    val byId = LinkedHashMap<String, StoreListing>()
    for (ext in base.extensions) byId[ext.id] = ext
    val baseAt = base.updatedAt.orEmpty()
    for (index in others) {
        val at = index.updatedAt.orEmpty()
        val newer = at > baseAt
        val sameDay = mirror != null && at.isNotEmpty() && at == baseAt
        for (ext in index.extensions) {
            val existing = byId[ext.id]
            when {
                existing == null && (mirror == null || newer || sameDay) -> byId[ext.id] = ext
                existing != null && newer -> byId[ext.id] = ext
            }
        }
    }
    val urls = buildList {
        val extensions = clean.mapNotNull { it.sourceUrl }
            .filter { it.contains("anikitty-extensions") }
        val rest = clean.mapNotNull { it.sourceUrl }
            .filter { !it.contains("anikitty-extensions") }
        addAll(extensions)
        addAll(rest)
    }
    val newestAt = clean.maxOf { it.updatedAt.orEmpty() }.takeIf { it.isNotEmpty() }
    return StoreIndex(
        apiVersion = base.apiVersion,
        updatedAt = newestAt,
        extensions = byId.values.toList(),
        sourceUrl = urls.firstOrNull(),
        sourceUrls = urls,
    )
}
