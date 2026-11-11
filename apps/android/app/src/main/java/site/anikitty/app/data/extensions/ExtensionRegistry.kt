package site.anikitty.app.data.extensions

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

class ExtensionRegistry(context: Context) {
    private val prefs = context.getSharedPreferences("anikitty_extensions", Context.MODE_PRIVATE)

    private val builtins: List<AnimeExtension> = listOf(
        StubDemoExtension(),
        PlaceholderKittyExtension(),
    )

    private val _entries = MutableStateFlow(builtins.map { it.toEntry() })
    val entries: StateFlow<List<ExtensionEntry>> = _entries.asStateFlow()

    fun setEnabled(id: String, enabled: Boolean) {
        prefs.edit().putBoolean(prefKey(id), enabled).apply()
        _entries.update { list ->
            list.map { if (it.extension.id == id) it.copy(enabled = enabled) else it }
        }
    }

    fun enabledExtensions(): List<AnimeExtension> =
        _entries.value.filter { it.enabled }.map { it.extension }

    private fun AnimeExtension.toEntry(): ExtensionEntry {
        val stored = prefs.contains(prefKey(id))
        val enabled = if (stored) prefs.getBoolean(prefKey(id), enabledByDefault) else enabledByDefault
        return ExtensionEntry(extension = this, enabled = enabled)
    }

    private fun prefKey(id: String) = "ext_enabled_$id"
}

data class ExtensionEntry(
    val extension: AnimeExtension,
    val enabled: Boolean,
)

/** Demo extension so the Extensions tab is usable before real scrapers ship. */
private class StubDemoExtension : AnimeExtension {
    override val id = "demo.local"
    override val name = "Demo (local)"
    override val version = "0.1.0"
    override val description = "Placeholder extension. Does not fetch real streams yet."
    override val enabledByDefault = true

    override suspend fun resolveStreams(anilistId: Int, episode: Int): List<StreamSource> = emptyList()
}

/**
 * Reserved slot for a future Kitty / community provider package.
 * Kept disabled until a real implementation exists.
 */
private class PlaceholderKittyExtension : AnimeExtension {
    override val id = "kitty.placeholder"
    override val name = "Kitty providers (coming soon)"
    override val version = "0.0.0"
    override val description =
        "Future home for on-device provider packs so playback does not need anikitty.site login."
    override val enabledByDefault = false

    override suspend fun resolveStreams(anilistId: Int, episode: Int): List<StreamSource> = emptyList()
}
