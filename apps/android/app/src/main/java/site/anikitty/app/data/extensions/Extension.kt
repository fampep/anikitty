package site.anikitty.app.data.extensions

/**
 * Pluggable source for streams / scrapers.
 * Local-first APK: users enable extensions on-device; no website account.
 *
 * Playback wiring (Media3 + real scrapers) lands in a later milestone.
 */
interface AnimeExtension {
    val id: String
    val name: String
    val version: String
    val description: String
    val enabledByDefault: Boolean

    /** Resolve playable sources for an AniList id + episode. Empty until a real extension lands. */
    suspend fun resolveStreams(anilistId: Int, episode: Int): List<StreamSource>
}

data class StreamSource(
    val label: String,
    val url: String,
    val headers: Map<String, String> = emptyMap(),
)
