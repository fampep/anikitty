// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

/**
 * Providers compiled into the APK. The store may list them, but their GitHub
 * folders are source trees and have no `anikitty-extension.json`.
 */
internal val BUNDLED_EXTENSION_IDS = setOf(
    "anikoto",
    "gotaku",
    "reanime",
    "mkissa",
)

internal sealed class StoreInstall {
    data class OnDevice(val id: String) : StoreInstall()
    data class Fetch(val urls: List<String>) : StoreInstall()
}

internal fun prepareStoreInstall(
    listing: StoreListing,
    bundledIds: Set<String> = BUNDLED_EXTENSION_IDS,
): StoreInstall {
    if (listing.id in bundledIds) return StoreInstall.OnDevice(listing.id)
    return StoreInstall.Fetch(manifestUrls(listing.github, listing.manifestPath))
}

/** Raw manifest URLs for a store listing. `manifestPath` wins over the tree folder. */
internal fun manifestUrls(github: String, manifestPath: String?): List<String> {
    val target = GitHubExtensionLocator.parse(github)
    val path = manifestPath?.trim()?.trimStart('/')?.takeIf { it.isNotEmpty() }
    if (path == null) return target.rawCandidates
    val refs = linkedSetOf(target.ref, "main", "master")
    return refs.map { ref ->
        "https://raw.githubusercontent.com/${target.owner}/${target.repo}/$ref/$path"
    }
}

/**
 * A sentence a person can act on. Install used to surface `HTTP 404 fetching …`
 * or a blank line when the exception had no message.
 */
internal fun explainInstallFailure(error: Throwable?): String {
    val fetch = generateSequence(error) { it?.cause }
        .filterIsInstance<ExtensionFetchException>()
        .firstOrNull()
    if (fetch != null) {
        val bundled = bundledIdForManifestUrl(fetch.url)
        return when (fetch.code) {
            404 -> if (bundled != null) {
                "$bundled ships with AniKitty. There is no anikitty-extension.json to install."
            } else {
                "That repo has no anikitty-extension.json, so it cannot be installed."
            }
            401, 403 ->
                "GitHub refused the download (HTTP ${fetch.code}). Wait a moment and try again."
            else -> "Could not download the extension (HTTP ${fetch.code})."
        }
    }
    val msg = error?.message?.trim().orEmpty()
    if (msg.isEmpty()) return "Could not install this extension."
    val lower = msg.lowercase()
    return when {
        "timeout" in lower || "timed out" in lower ||
            "failed to connect" in lower || "unable to resolve" in lower ||
            "connection reset" in lower ->
            "Could not download the extension. Check the connection and try again."
        "invalid extension id" in lower ->
            "Could not install. The extension id must look like site.name.provider."
        "manifest not found" in lower || "anikitty-extension.json not found" in lower ->
            "That repo has no anikitty-extension.json, so it cannot be installed."
        else -> msg.take(180)
    }
}

internal fun bundledIdForManifestUrl(url: String): String? {
    val path = url.substringBefore("?").substringAfter("githubusercontent.com/")
    val parts = path.split("/").filter { it.isNotEmpty() }
    if (parts.size < 5 || parts.last() != "anikitty-extension.json") return null
    val dir = parts[parts.size - 2]
    return dir.takeIf { it in BUNDLED_EXTENSION_IDS }
}
