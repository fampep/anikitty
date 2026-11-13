package site.anikitty.app.data.extensions

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.withContext

class ExtensionInstaller(
    private val repository: ExtensionRepository,
) {
    /**
     * Paste a GitHub repo / tree / blob URL (or `owner/repo`) and install the
     * first reachable `anikitty-extension.json`.
     */
    suspend fun installFromGithub(input: String): ExtensionManifest = withContext(Dispatchers.IO) {
        val target = GitHubExtensionLocator.parse(input)
        var lastError: String? = null
        for (rawUrl in target.rawCandidates) {
            val result = runCatching {
                val body = ExtensionHttp.getString(rawUrl)
                val manifest = ExtensionManifestParser.parse(
                    raw = body,
                    sourceGithub = target.githubWebUrl,
                    manifestUrl = rawUrl,
                )
                repository.upsert(manifest)
                manifest
            }
            if (result.isSuccess) return@withContext result.getOrThrow()
            lastError = result.exceptionOrNull()?.message
        }
        val hint = lastError.orEmpty()
        when {
            hint.contains("iconUrl", ignoreCase = true) ->
                error("$hint — add the scraped site’s favicon as iconUrl in anikitty-extension.json")
            hint.isNotBlank() ->
                error(hint)
            else ->
                error("anikitty-extension.json not found on that GitHub repo")
        }
    }

    /**
     * Installed extensions whose published manifest is a newer version.
     * Keys are extension ids, values are the newer version string.
     */
    suspend fun availableUpdates(): Map<String, String> = withContext(Dispatchers.IO) {
        coroutineScope {
            repository.installed.value.map { installed ->
                async {
                    val remote = runCatching { fetchPublished(installed) }.getOrNull()
                        ?: return@async null
                    if (remote.id == installed.id && isNewerVersion(remote.version, installed.version)) {
                        installed.id to remote.version
                    } else {
                        null
                    }
                }
            }.awaitAll().filterNotNull().toMap()
        }
    }

    suspend fun update(id: String): ExtensionManifest = withContext(Dispatchers.IO) {
        val installed = repository.get(id) ?: error("Extension is not installed")
        val remote = fetchPublished(installed)
        require(remote.id == installed.id) { "Update published a different id" }
        repository.upsert(remote)
        remote
    }

    private fun fetchPublished(installed: ExtensionManifest): ExtensionManifest {
        val direct = installed.manifestUrl?.takeIf { it.startsWith("http") }
        if (direct != null) {
            val body = ExtensionHttp.getString(direct)
            return ExtensionManifestParser.parse(
                raw = body,
                sourceGithub = installed.sourceGithub,
                manifestUrl = direct,
            )
        }
        val github = installed.sourceGithub?.takeIf { it.isNotBlank() }
            ?: error("No manifest URL")
        val target = GitHubExtensionLocator.parse(github)
        var last: Exception? = null
        for (rawUrl in target.rawCandidates) {
            val parsed = runCatching {
                val body = ExtensionHttp.getString(rawUrl)
                ExtensionManifestParser.parse(
                    raw = body,
                    sourceGithub = target.githubWebUrl,
                    manifestUrl = rawUrl,
                )
            }
            parsed.getOrNull()?.let { return it }
            last = parsed.exceptionOrNull() as? Exception
        }
        throw last ?: IllegalStateException("Manifest not found")
    }

    suspend fun installFromManifestUrl(
        manifestUrl: String,
        github: String? = null,
    ): ExtensionManifest = withContext(Dispatchers.IO) {
        val body = ExtensionHttp.getString(manifestUrl)
        val manifest = ExtensionManifestParser.parse(
            raw = body,
            sourceGithub = github,
            manifestUrl = manifestUrl,
        )
        repository.upsert(manifest)
        manifest
    }
}
