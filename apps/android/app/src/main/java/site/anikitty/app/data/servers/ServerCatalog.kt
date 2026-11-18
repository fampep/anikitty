// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import android.content.Context
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import site.anikitty.app.data.extensions.ExtensionInstaller
import site.anikitty.app.data.extensions.ExtensionManifest
import site.anikitty.app.data.extensions.ExtensionRepository
import site.anikitty.app.data.extensions.ExtensionStoreClient
import site.anikitty.app.data.extensions.HttpExtensionResolver
import site.anikitty.app.data.extensions.isRetiredExtension
import site.anikitty.app.data.skip.AniSkipClient
import site.anikitty.app.data.skip.AniSkipStamp
import site.anikitty.app.data.skip.SkipTimes
import site.anikitty.app.data.extensions.StoreIndex
import site.anikitty.app.data.extensions.StoreInstall
import site.anikitty.app.data.extensions.StoreListing
import site.anikitty.app.data.extensions.prepareStoreInstall

/**
 * Stream sources = optional bundled resolver + user-installed HTTP extensions.
 * Auth VPS and Media3 playback stay first-party; scrapers move to extensions.
 */
class ServerCatalog(context: Context) {
    private val prefs = context.getSharedPreferences("anikitty_servers", Context.MODE_PRIVATE)
    private val resolveCache = ResolveCache(context)
    private val megaPlayCrypto = MegaPlayCrypto(context)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)

    private val aniSkip = AniSkipClient()
    val extensions = ExtensionRepository(context)
    val installer = ExtensionInstaller(extensions)
    val storeClient = ExtensionStoreClient()

    private val bundled: List<StreamResolver> = listOf(
        AnikotoServer(cache = resolveCache, crypto = megaPlayCrypto),
        GotakuServer(cache = resolveCache),
        ReanimeServer(cache = resolveCache),
        MkissaServer(cache = resolveCache),
        KaaServer(cache = resolveCache),
        AnimexServer(cache = resolveCache),
        XanimeServer(cache = resolveCache),
        AniNzServer(cache = resolveCache),
        GogoAnimeServer(cache = resolveCache),
    )
    val bundledIds: Set<String> = bundled.map { it.server.id }.toSet()

    private val _resolvers = MutableStateFlow(buildResolvers(extensions.installed.value))
    val resolvers: StateFlow<List<StreamResolver>> = _resolvers.asStateFlow()

    private val _selectedId = MutableStateFlow(readSelectedId())
    val selectedId: StateFlow<String> = _selectedId.asStateFlow()

    val servers: List<StreamServer> get() = _resolvers.value.map { it.server }

    init {
        scope.launch {
            extensions.installed.collect { installed ->
                _resolvers.value = buildResolvers(installed)
                ensureSelectionValid()
            }
        }
    }

    fun select(id: String) {
        if (_resolvers.value.none { it.server.id == id }) return
        prefs.edit().putString(KEY_SELECTED, id).apply()
        _selectedId.update { id }
    }

    /**
     * AniSkip openings and endings for this MAL episode. The player lines
     * them up with the stream that is playing.
     */
    suspend fun aniSkipStamps(malId: Int, episode: Int): List<AniSkipStamp> =
        aniSkip.load(malId, episode)

    /**
     * Intro and credits published on Anikoto's own episode page.
     */
    suspend fun anikotoSkipTimes(
        anilistId: Int,
        episode: Int,
        titleHint: String?,
    ): SkipTimes {
        val anikoto = bundled.filterIsInstance<AnikotoServer>().firstOrNull()
            ?: return SkipTimes()
        return anikoto.loadSkipTimes(anilistId, episode, titleHint)
    }

    /** Latest Sub/Dub cards scraped from Anikoto's home widgets. */
    suspend fun anikotoLatestUpdates(kind: String = "all"): List<AnikotoLatestItem> {
        val anikoto = bundled.filterIsInstance<AnikotoServer>().firstOrNull()
            ?: return emptyList()
        return anikoto.latestUpdates(kind)
    }

    /** True Sub/Dub episode counts hosted on Anikoto for one title. */
    suspend fun anikotoAudioAvailability(
        anilistId: Int,
        titleHint: String?,
    ): AnikotoAudioAvailability? {
        val anikoto = bundled.filterIsInstance<AnikotoServer>().firstOrNull()
            ?: return null
        return anikoto.audioAvailability(anilistId, titleHint)
    }

    fun selectedResolver(): StreamResolver {
        val list = _resolvers.value
        return list.firstOrNull { it.server.id == _selectedId.value }
            ?: list.firstOrNull()
            ?: error("No stream extensions installed")
    }

    /**
     * Resolve using the selected installed provider first, then automatically
     * try every other **installed** provider until one returns sources.
     * A fallback plays this episode only. The provider the user picked stays selected.
     */
    suspend fun resolveWithFailover(
        anilistId: Int,
        episode: Int,
        audio: String = "sub",
        titleHint: String? = null,
        onAttempt: ((serverName: String, index: Int, total: Int) -> Unit)? = null,
    ): ResolveFailoverResult {
        val list = _resolvers.value
        if (list.isEmpty()) error("No stream extensions installed")
        val preferredId = _selectedId.value
        val ordered = buildList {
            list.firstOrNull { it.server.id == preferredId }?.let { add(it) }
            list.filterNot { it.server.id == preferredId }.forEach { add(it) }
        }
        val errors = ArrayList<String>()
        for ((index, resolver) in ordered.withIndex()) {
            onAttempt?.invoke(resolver.server.name, index, ordered.size)
            val sources = runCatching {
                resolver.resolve(anilistId, episode, audio, titleHint)
            }.getOrElse { err ->
                val msg = err.message?.takeIf { it.isNotBlank() } ?: err::class.java.simpleName
                errors += "${resolver.server.name}: $msg"
                null
            }
            if (sources != null && sources.isNotEmpty()) {
                val usedFallback = resolver.server.id != preferredId
                return ResolveFailoverResult(
                    sources = playbackAudioLanguage(sources, audio),
                    server = resolver.server,
                    usedFallback = usedFallback,
                    attempted = errors + "${resolver.server.name}: ok",
                )
            }
            if (sources != null) {
                errors += "${resolver.server.name}: empty sources"
            }
        }
        error(
            buildString {
                append("All installed providers failed")
                if (errors.isNotEmpty()) {
                    append(" — ")
                    append(errors.joinToString(" · "))
                }
            },
        )
    }

    fun uninstallExtension(id: String) {
        if (bundled.any { it.server.id == id }) return
        extensions.remove(id)
        ensureSelectionValid()
    }

    suspend fun installFromGithub(url: String): ExtensionManifest =
        installer.installFromGithub(url)

    suspend fun installStoreListing(listing: StoreListing): ExtensionManifest {
        return when (val plan = prepareStoreInstall(listing, bundledIds)) {
            is StoreInstall.OnDevice ->
                error("${listing.name} ships with AniKitty. It is already on this phone.")
            is StoreInstall.Fetch -> installer.installFromUrls(plan.urls, listing.github)
        }
    }

    suspend fun fetchStore(): StoreIndex = storeClient.fetchIndex()

    /** Newer versions of installed community extensions, id → version. */
    suspend fun extensionUpdates(): Map<String, String> = installer.availableUpdates()

    suspend fun updateExtension(id: String): ExtensionManifest = installer.update(id)

    private fun buildResolvers(installed: List<ExtensionManifest>): List<StreamResolver> {
        val fromExt = installed.map { HttpExtensionResolver(it) }
        val extras = fromExt.filterNot {
            it.server.id in bundledIds || isRetiredExtension(it.server.id, it.server.name)
        }
        return bundled + extras
    }

    private fun readSelectedId(): String {
        val raw = prefs.getString(KEY_SELECTED, AnikotoServer.ID) ?: AnikotoServer.ID
        val migrated = FlixCrypto.migrateServerId(raw) ?: AnikotoServer.ID
        if (migrated != raw) prefs.edit().putString(KEY_SELECTED, migrated).apply()
        return migrated
    }

    private fun ensureSelectionValid() {
        val list = _resolvers.value
        if (list.isEmpty()) return
        if (list.none { it.server.id == _selectedId.value }) {
            select(list.first().server.id)
        }
    }

    private companion object {
        const val KEY_SELECTED = "selected_server_id"
    }
}
