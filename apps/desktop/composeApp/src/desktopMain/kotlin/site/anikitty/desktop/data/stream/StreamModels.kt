package site.anikitty.desktop.data.stream

data class PlayableSource(
    val url: String,
    val headers: Map<String, String> = emptyMap(),
    val label: String = "Stream",
)

data class SubtitleTrack(
    val url: String,
    val label: String,
    val language: String? = null,
)
