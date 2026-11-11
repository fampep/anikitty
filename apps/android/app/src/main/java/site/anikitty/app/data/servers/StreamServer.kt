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

data class SubtitleTrack(
    val url: String,
    val label: String,
    val language: String? = null,
    val mimeType: String? = null,
)

data class PlayableSource(
    val url: String,
    val headers: Map<String, String> = emptyMap(),
    val label: String = "Stream",
    /** MegaPlay PNG-disguise unwrap size for HLS segments (0 = none). */
    val stripBytes: Int = SegmentStripDataSource.DEFAULT_STRIP_BYTES,
    val subtitles: List<SubtitleTrack> = emptyList(),
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
