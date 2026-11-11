package site.anikitty.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText

/** Web `HomeSectionLink` — left paper gradient bar + bold title. */
@Composable
fun KittySectionHeading(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    padded: Boolean = true,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (padded) Modifier.padding(horizontal = 16.dp) else Modifier),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(10.dp),
    ) {
        Box(
            modifier = Modifier
                .width(2.dp)
                .height(if (subtitle == null) 22.dp else 30.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.White.copy(alpha = 0.90f),
                            Color.White.copy(alpha = 0.35f),
                            Color.White.copy(alpha = 0.08f),
                        ),
                    ),
                ),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = KittyText,
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelMedium,
                    color = KittyFaint,
                )
            }
        }
    }
}

@Composable
fun KittyPosterCard(
    anime: AnimeSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 120.dp,
    subtitle: String? = null,
) {
    Column(
        modifier = modifier
            .width(width)
            .clickable(onClick = onClick),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3.05f)
                .clip(RoundedCornerShape(12.dp))
                .background(KittySurface),
        ) {
            AsyncImage(
                model = anime.coverImageUrl,
                contentDescription = anime.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            0.55f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.72f),
                        ),
                    ),
            )
            anime.averageScore?.let { score ->
                Text(
                    "★ $score",
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(7.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(Color.White)
                        .padding(horizontal = 6.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyInk,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Text(
            anime.title,
            modifier = Modifier.padding(top = 8.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.bodySmall,
            color = KittyText,
            fontWeight = FontWeight.Medium,
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                subtitle,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelSmall,
                color = KittyFaint,
            )
        } else {
            val meta = listOfNotNull(
                anime.format,
                anime.averageScore?.let { "★ $it" },
            ).joinToString(" · ")
            if (meta.isNotBlank()) {
                Text(
                    meta,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyFaint,
                )
            }
        }
    }
}

@Composable
fun KittyPosterSkeletonRow(title: String = "Loading") {
    Column(modifier = Modifier.padding(top = 22.dp)) {
        KittySectionHeading(title = title, subtitle = "Fetching the catalog…")
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(6) {
                Column(modifier = Modifier.width(120.dp)) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(2f / 3.05f)
                            .clip(RoundedCornerShape(12.dp))
                            .background(KittySurface),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.85f)
                            .height(10.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.White.copy(alpha = 0.10f)),
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(0.45f)
                            .height(8.dp)
                            .clip(RoundedCornerShape(4.dp))
                            .background(Color.White.copy(alpha = 0.06f)),
                    )
                }
            }
        }
    }
}

@Composable
fun KittyPosterRow(
    title: String,
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
    subtitle: String? = null,
    subtitleFor: ((AnimeSummary) -> String?)? = null,
) {
    if (items.isEmpty()) return
    Column(modifier = Modifier.padding(top = 22.dp)) {
        KittySectionHeading(title = title, subtitle = subtitle)
        Spacer(modifier = Modifier.height(12.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            items(items, key = { it.id }) { anime ->
                KittyPosterCard(
                    anime = anime,
                    onClick = { onOpen(anime) },
                    subtitle = subtitleFor?.invoke(anime),
                )
            }
        }
    }
}

/** Full-bleed cinema hero — edge-to-edge media + ink gradient. */
@Composable
fun KittyHero(
    anime: AnimeSummary,
    eyebrow: String = "Spotlight",
    cta: String = "Watch now",
    onOpen: () -> Unit,
    topOverlay: (@Composable () -> Unit)? = null,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(300.dp)
            .clickable(onClick = onOpen),
    ) {
        AsyncImage(
            model = anime.bannerImageUrl ?: anime.coverImageUrl,
            contentDescription = anime.title,
            modifier = Modifier.fillMaxSize(),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to KittyInk.copy(alpha = 0.42f),
                        0.38f to KittyInk.copy(alpha = 0.12f),
                        0.70f to KittyInk.copy(alpha = 0.82f),
                        1f to KittyInk,
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        0f to KittyInk.copy(alpha = 0.45f),
                        0.42f to Color.Transparent,
                        1f to Color.Transparent,
                    ),
                ),
        )
        if (topOverlay != null) {
            Box(modifier = Modifier.align(Alignment.TopStart)) {
                topOverlay()
            }
        }
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 18.dp, vertical = 20.dp),
        ) {
            Text(
                eyebrow.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = KittyMuted,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.4.sp,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                anime.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = KittyText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val meta = listOfNotNull(
                anime.format,
                anime.episodes?.let { "$it eps" },
                anime.averageScore?.let { "★ $it" },
            ).joinToString(" · ")
            if (meta.isNotBlank()) {
                Spacer(modifier = Modifier.height(5.dp))
                Text(
                    meta,
                    style = MaterialTheme.typography.labelMedium,
                    color = KittyMuted,
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onOpen,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black,
                ),
                shape = RoundedCornerShape(14.dp),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(6.dp))
                Text(cta, fontWeight = FontWeight.Bold)
            }
        }
    }
}

/**
 * Cinema continue card — landscape still with progress rail.
 * Inspired by anime streaming continue rails, kept monochrome.
 */
@Composable
fun KittyContinueCard(
    title: String,
    coverUrl: String?,
    episode: Int,
    onClick: () -> Unit,
    positionMs: Long = 0L,
    durationMs: Long = 0L,
    wide: Boolean = true,
    badge: String? = null,
) {
    val progress = if (durationMs > 0L) {
        (positionMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0.08f
    }
    if (wide) {
        Box(
            modifier = Modifier
                .width(220.dp)
                .aspectRatio(16f / 10f)
                .clip(RoundedCornerShape(14.dp))
                .clickable(onClick = onClick),
        ) {
            AsyncImage(
                model = coverUrl,
                contentDescription = title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(
                        Brush.verticalGradient(
                            0f to Color.Transparent,
                            0.45f to Color.Black.copy(alpha = 0.25f),
                            1f to Color.Black.copy(alpha = 0.88f),
                        ),
                    ),
            )
            if (!badge.isNullOrBlank()) {
                Text(
                    badge,
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(7.dp))
                        .background(Color.White.copy(alpha = 0.92f))
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyInk,
                    fontWeight = FontWeight.Bold,
                    maxLines = 1,
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .padding(8.dp)
                    .size(30.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = Color.Black,
                    modifier = Modifier.size(18.dp),
                )
            }
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(10.dp),
            ) {
                Text(
                    title,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
                Text(
                    buildString {
                        append("Ep $episode")
                        if (durationMs > 0L) {
                            append(" · ${(progress * 100f).toInt()}%")
                        }
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.70f),
                )
                Spacer(modifier = Modifier.height(7.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(2.5.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(Color.White.copy(alpha = 0.18f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .height(2.5.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(Color.White),
                    )
                }
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(14.dp))
                .background(KittySurface)
                .clickable(onClick = onClick)
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(88.dp)
                    .aspectRatio(16f / 10f)
                    .clip(RoundedCornerShape(8.dp)),
            ) {
                AsyncImage(
                    model = coverUrl,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                Box(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .fillMaxWidth()
                        .height(3.dp)
                        .background(Color.White.copy(alpha = 0.18f)),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .height(3.dp)
                            .background(Color.White),
                    )
                }
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                )
                Text(
                    buildString {
                        if (!badge.isNullOrBlank()) {
                            append(badge)
                            append(" · ")
                        }
                        append("Ep $episode")
                        if (durationMs > 0L) {
                            append(" · ${(progress * 100f).toInt()}%")
                        }
                    },
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White.copy(alpha = 0.55f),
                )
            }
            Box(
                modifier = Modifier
                    .size(34.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = Color.Black,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
