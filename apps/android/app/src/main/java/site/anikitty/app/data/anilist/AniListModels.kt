package site.anikitty.app.data.anilist

data class AnimeSummary(
    val id: Int,
    val title: String,
    val coverImageUrl: String?,
    val episodes: Int?,
    val format: String?,
    val averageScore: Int?,
)
