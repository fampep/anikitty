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
        mergeIndexes(loaded)
    }

    /**
     * Newer `updatedAt` wins on the same id. A tie prefers anikitty-extensions.
     * Listings that exist on only one index are kept.
     */
    private fun mergeIndexes(loaded: List<StoreIndex>): StoreIndex {
        val ranked = loaded.sortedWith(
            compareByDescending<StoreIndex> { it.updatedAt.orEmpty() }
                .thenByDescending { it.sourceUrl?.contains("anikitty-extensions") == true },
        )
        val byId = LinkedHashMap<String, StoreListing>()
        for (index in ranked) {
            for (ext in index.extensions) {
                if (ext.id !in byId) byId[ext.id] = ext
            }
        }
        val urls = buildList {
            val extensions = loaded.mapNotNull { it.sourceUrl }
                .filter { it.contains("anikitty-extensions") }
            val rest = loaded.mapNotNull { it.sourceUrl }
                .filter { !it.contains("anikitty-extensions") }
            addAll(extensions)
            addAll(rest)
        }
        return StoreIndex(
            apiVersion = ranked.first().apiVersion,
            updatedAt = ranked.first().updatedAt,
            extensions = byId.values.toList(),
            sourceUrl = urls.firstOrNull(),
            sourceUrls = urls,
        )
    }

    private fun parseIndex(raw: String, sourceUrl: String): StoreIndex {
        val o = JSONObject(raw)
        val arr = o.getJSONArray("extensions")
        val list = buildList {
            for (i in 0 until arr.length()) {
                val e = arr.getJSONObject(i)
                add(
                    StoreListing(
                        id = e.getString("id"),
                        name = e.getString("name"),
                        description = e.optString("description", ""),
                        github = e.getString("github"),
                        author = e.optString("author", ""),
                        featured = e.optBoolean("featured", false),
                        manifestPath = e.optString("manifestPath")
                            .takeIf { it.isNotBlank() },
                        iconUrl = e.optString("iconUrl").takeIf { it.isNotBlank() },
                        siteUrl = e.optString("siteUrl").takeIf { it.isNotBlank() },
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
         * The extensions repo is the store the app talks to. The monorepo copy
         * fills any listing the mirror does not have yet.
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
