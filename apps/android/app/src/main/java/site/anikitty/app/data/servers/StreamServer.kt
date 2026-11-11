package site.anikitty.app.data.servers

/**
 * Built-in watch servers users pick in the app (not third-party installs).
 *
 * Phone scrapes only enough to obtain a playable **request URL** (+ headers).
 * HLS download / bandwidth / playback stay on-device (Media3). The dedicated
 * Go auth server never carries stream bytes.
 */
data class StreamServer(
    val id: String,
    val name: String,
    val description: String,
)

data class PlayableSource(
    val url: String,
    val headers: Map<String, String> = emptyMap(),
    val label: String = "Stream",
)

interface StreamResolver {
    val server: StreamServer

    /**
     * Resolve a direct playable URL on-device.
     * @param titleHint AniList / display title to help map the watch page.
     */
    suspend fun resolve(
        anilistId: Int,
        episode: Int,
        audio: String = "sub",
        titleHint: String? = null,
    ): List<PlayableSource>
}
