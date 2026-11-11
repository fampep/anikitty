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
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.KittySurface

/** Web `HomeSectionLink` — left zinc gradient bar + bold title. */
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
                .height(if (subtitle == null) 20.dp else 28.dp)
                .clip(RoundedCornerShape(999.dp))
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color(0xFFD4D4D8),
                            Color(0xFF71717A),
                            Color(0xFF3F3F46).copy(alpha = 0.30f),
                        ),
                    ),
                ),
        )
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.Bold,
                color = Color.White,
            )
            if (!subtitle.isNullOrBlank()) {
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White.copy(alpha = 0.40f),
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
    width: androidx.compose.ui.unit.Dp = 120.dp,
    subtitle: String? = null,
) {
    Column(
        modifier = modifier
            .width(width)
            .clickable(onClick = onClick),
    ) {
        AsyncImage(
            model = anime.coverImageUrl,
            contentDescription = anime.title,
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3.05f)
                .clip(RoundedCornerShape(10.dp))
                .background(KittySurface),
            contentScale = ContentScale.Crop,
        )
        Text(
            anime.title,
            modifier = Modifier.padding(top = 7.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.bodySmall,
            color = Color.White,
            fontWeight = FontWeight.Medium,
        )
        if (!subtitle.isNullOrBlank()) {
            Text(
                subtitle,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.labelSmall,
                color = Color.White.copy(alpha = 0.40f),
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
                    color = Color.White.copy(alpha = 0.40f),
                )
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

/** Full-bleed cinema hero — mirrors web spotlight (edge-to-edge media + ink gradient). */
@Composable
fun KittyHero(
    anime: AnimeSummary,
    eyebrow: String = "Spotlight",
    cta: String = "Watch now",
    onOpen: () -> Unit,
) {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(320.dp)
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
                        0f to Color.Transparent,
                        0.35f to KittyInk.copy(alpha = 0.25f),
                        0.72f to KittyInk.copy(alpha = 0.78f),
                        1f to KittyInk,
                    ),
                ),
        )
        // Soft side fade like theatre letterbox
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        0f to KittyInk.copy(alpha = 0.45f),
                        0.35f to Color.Transparent,
                        1f to Color.Transparent,
                    ),
                ),
        )
        Column(
            modifier = Modifier
                .align(Alignment.BottomStart)
                .padding(horizontal = 20.dp, vertical = 22.dp),
        ) {
            Text(
                eyebrow.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = Color.White.copy(alpha = 0.72f),
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.2.sp,
            )
            Spacer(modifier = Modifier.height(6.dp))
            Text(
                anime.title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Bold,
                color = Color.White,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val meta = listOfNotNull(
                anime.format,
                anime.episodes?.let { "$it eps" },
                anime.averageScore?.let { "★ $it" },
            ).joinToString(" · ")
            if (meta.isNotBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    meta,
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White.copy(alpha = 0.55f),
                )
            }
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onOpen,
                colors = ButtonDefaults.buttonColors(
                    containerColor = Color.White,
                    contentColor = Color.Black,
                ),
                shape = RoundedCornerShape(12.dp),
            ) {
                Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(18.dp))
                Spacer(modifier = Modifier.width(4.dp))
                Text(cta, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun KittyContinueCard(
    title: String,
    coverUrl: String?,
    episode: Int,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .width(268.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(KittySurface)
            .clickable(onClick = onClick)
            .padding(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        AsyncImage(
            model = coverUrl,
            contentDescription = title,
            modifier = Modifier
                .width(52.dp)
                .aspectRatio(2f / 3f)
                .clip(RoundedCornerShape(6.dp)),
            contentScale = ContentScale.Crop,
        )
        Spacer(modifier = Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
                style = MaterialTheme.typography.titleSmall,
                color = Color.White,
            )
            Text(
                "Continue · Ep $episode",
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
