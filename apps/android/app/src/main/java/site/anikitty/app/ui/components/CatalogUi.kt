package site.anikitty.app.ui.components

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.RepeatMode
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.interaction.collectIsPressedAsState
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
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import site.anikitty.app.data.anilist.AnimeSummary
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAccentGlow
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyGlass
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutline
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText
import site.anikitty.app.ui.theme.PlayerChrome
import site.anikitty.app.ui.theme.kittyGlass
import site.anikitty.app.ui.theme.kittyGlassSoft

@Composable
fun KittyPageHeader(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    trailing: (@Composable () -> Unit)? = null,
) {
    Row(
        modifier = modifier.fillMaxWidth(),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.headlineSmall,
                fontWeight = FontWeight.Black,
                color = KittyText,
                letterSpacing = (-0.5).sp,
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = KittyMuted,
                )
            }
        }
        if (trailing != null) {
            Spacer(modifier = Modifier.width(10.dp))
            trailing()
        }
    }
}

@Composable
fun KittyEmptyState(
    title: String,
    body: String,
    modifier: Modifier = Modifier,
    actionLabel: String? = null,
    onAction: (() -> Unit)? = null,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .kittyGlass(KittyGlassShape)
            .padding(horizontal = 18.dp, vertical = 26.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text(
            title,
            color = KittyText,
            fontWeight = FontWeight.Bold,
            style = MaterialTheme.typography.titleSmall,
            textAlign = TextAlign.Center,
        )
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            body,
            color = KittyMuted,
            style = MaterialTheme.typography.bodySmall,
            textAlign = TextAlign.Center,
        )
        if (!actionLabel.isNullOrBlank() && onAction != null) {
            Spacer(modifier = Modifier.height(14.dp))
            Button(
                onClick = onAction,
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittyAccent,
                    contentColor = KittyOnAccent,
                ),
                shape = RoundedCornerShape(12.dp),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
            ) {
                Text(actionLabel, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
fun KittyShimmerBox(
    modifier: Modifier = Modifier,
    shape: RoundedCornerShape = RoundedCornerShape(14.dp),
) {
    val transition = rememberInfiniteTransition(label = "shimmer")
    val shift by transition.animateFloat(
        initialValue = 0f,
        targetValue = 1f,
        animationSpec = infiniteRepeatable(
            animation = tween(1100, easing = FastOutSlowInEasing),
            repeatMode = RepeatMode.Restart,
        ),
        label = "shimmerShift",
    )
    Box(
        modifier = modifier
            .clip(shape)
            .background(Color.White.copy(alpha = 0.06f))
            .background(
                Brush.horizontalGradient(
                    0f to Color.Transparent,
                    (shift - 0.25f).coerceIn(0f, 1f) to Color.Transparent,
                    shift to Color.White.copy(alpha = 0.12f),
                    (shift + 0.25f).coerceIn(0f, 1f) to Color.Transparent,
                    1f to Color.Transparent,
                ),
            ),
    )
}

@Composable
fun KittySectionHeading(
    title: String,
    subtitle: String? = null,
    modifier: Modifier = Modifier,
    padded: Boolean = true,
) {
    Column(
        modifier = modifier
            .fillMaxWidth()
            .then(if (padded) Modifier.padding(horizontal = 16.dp) else Modifier),
    ) {
        Text(
            title,
            style = MaterialTheme.typography.titleMedium,
            fontWeight = FontWeight.Bold,
            color = KittyText,
            letterSpacing = (-0.3).sp,
        )
        if (!subtitle.isNullOrBlank()) {
            Spacer(modifier = Modifier.height(3.dp))
            Text(
                subtitle,
                style = MaterialTheme.typography.labelMedium,
                color = KittyFaint,
            )
        }
    }
}

@Composable
fun KittyPosterCard(
    anime: AnimeSummary,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    width: Dp = 128.dp,
    subtitle: String? = null,
) {
    val shape = RoundedCornerShape(16.dp)
    val interaction = remember { MutableInteractionSource() }
    val pressed by interaction.collectIsPressedAsState()
    val scale by animateFloatAsState(
        targetValue = if (pressed) 0.96f else 1f,
        animationSpec = tween(140, easing = FastOutSlowInEasing),
        label = "posterPress",
    )
    Column(
        modifier = modifier
            .width(width)
            .scale(scale)
            .clickable(
                interactionSource = interaction,
                indication = null,
                onClick = onClick,
            ),
    ) {
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .aspectRatio(2f / 3f)
                .clip(shape)
                .background(KittySurface)
                .border(1.dp, KittyOutlineSoft, shape),
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
                            0.65f to Color.Transparent,
                            1f to Color.Black.copy(alpha = 0.7f),
                        ),
                    ),
            )
            anime.averageScore?.let { score ->
                Text(
                    String.format("%.1f", score / 10f),
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(KittyGlass)
                        .border(1.dp, KittyOutlineSoft, RoundedCornerShape(8.dp))
                        .padding(horizontal = 6.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyText,
                    fontWeight = FontWeight.Bold,
                )
            }
        }
        Text(
            anime.title,
            modifier = Modifier.padding(top = 8.dp),
            maxLines = 2,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelLarge,
            color = KittyText,
            fontWeight = FontWeight.SemiBold,
            lineHeight = 16.sp,
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
            anime.format?.let { format ->
                Text(
                    format,
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
    Column(modifier = Modifier.padding(top = 24.dp)) {
        KittySectionHeading(title = title, subtitle = "Loading titles…")
        Spacer(modifier = Modifier.height(14.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 16.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(6) {
                Column(modifier = Modifier.width(118.dp)) {
                    KittyShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth()
                            .aspectRatio(2f / 3f),
                        shape = RoundedCornerShape(14.dp),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    KittyShimmerBox(
                        modifier = Modifier
                            .fillMaxWidth(0.88f)
                            .height(10.dp),
                        shape = RoundedCornerShape(4.dp),
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
        Spacer(modifier = Modifier.height(10.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 14.dp),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
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

@Composable
fun KittyHero(
    anime: AnimeSummary,
    eyebrow: String = "Featured",
    cta: String = "Play",
    onOpen: () -> Unit,
    onMoreInfo: (() -> Unit)? = null,
    topOverlay: (@Composable () -> Unit)? = null,
) {
    // Cinematic first viewport — denser art plane, soft edge dissolve into the page.
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .height(540.dp),
    ) {
        AsyncImage(
            model = anime.bannerImageUrl ?: anime.coverImageUrl,
            contentDescription = anime.title,
            modifier = Modifier
                .fillMaxSize()
                .clickable(onClick = onOpen),
            contentScale = ContentScale.Crop,
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to KittyInk.copy(alpha = 0.42f),
                        0.18f to Color.Transparent,
                        0.48f to KittyInk.copy(alpha = 0.28f),
                        0.78f to KittyInk.copy(alpha = 0.88f),
                        1f to KittyInk,
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.horizontalGradient(
                        0f to KittyInk.copy(alpha = 0.62f),
                        0.42f to KittyInk.copy(alpha = 0.18f),
                        0.78f to Color.Transparent,
                    ),
                ),
        )
        // Soft ice glow at the bottom for glass depth.
        Box(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .height(180.dp)
                .background(
                    Brush.verticalGradient(
                        listOf(
                            Color.Transparent,
                            KittyAccentGlow.copy(alpha = 0.12f),
                        ),
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
                .fillMaxWidth(0.96f)
                .padding(horizontal = 18.dp, vertical = 26.dp),
        ) {
            Text(
                eyebrow.uppercase(),
                style = MaterialTheme.typography.labelMedium,
                color = KittyAccentGlow,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.8.sp,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                anime.title,
                style = MaterialTheme.typography.displaySmall.copy(fontSize = 34.sp, lineHeight = 38.sp),
                fontWeight = FontWeight.Black,
                color = KittyText,
                maxLines = 2,
                overflow = TextOverflow.Ellipsis,
            )
            val meta = listOfNotNull(
                anime.averageScore?.let { "★ ${String.format("%.1f", it / 10f)}" },
                anime.format,
                anime.episodes?.let { "$it eps" },
            )
            if (meta.isNotEmpty()) {
                Spacer(modifier = Modifier.height(10.dp))
                KittyMetaChips(items = meta)
            }
            val blurb = anime.description?.trim()?.takeIf { it.isNotEmpty() }
            if (!blurb.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(10.dp))
                Text(
                    blurb,
                    style = MaterialTheme.typography.bodyMedium,
                    color = KittyMuted,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    lineHeight = 19.sp,
                )
            }
            Spacer(modifier = Modifier.height(16.dp))
            Row(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Button(
                    onClick = onOpen,
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KittyAccent,
                        contentColor = KittyOnAccent,
                    ),
                    shape = RoundedCornerShape(999.dp),
                    contentPadding = PaddingValues(horizontal = 26.dp, vertical = 14.dp),
                ) {
                    Icon(Icons.Filled.PlayArrow, contentDescription = null, modifier = Modifier.size(22.dp))
                    Spacer(modifier = Modifier.width(6.dp))
                    Text(cta, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                }
                if (onMoreInfo != null) {
                    OutlinedButton(
                        onClick = onMoreInfo,
                        shape = CircleShape,
                        border = BorderStroke(1.dp, KittyOutline),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = KittyText),
                        modifier = Modifier
                            .size(48.dp)
                            .kittyGlassSoft(CircleShape),
                        contentPadding = PaddingValues(0.dp),
                    ) {
                        Icon(Icons.Outlined.Info, contentDescription = "Info", modifier = Modifier.size(20.dp))
                    }
                }
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
    val shape = RoundedCornerShape(14.dp)
    if (wide) {
        Box(
            modifier = Modifier
                .width(256.dp)
                .aspectRatio(16f / 9f)
                .clip(shape)
                .border(1.dp, KittyOutlineSoft, shape)
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
                            0.45f to Color.Black.copy(alpha = 0.2f),
                            1f to Color.Black.copy(alpha = 0.88f),
                        ),
                    ),
            )
            if (!badge.isNullOrBlank()) {
                Text(
                    badge.uppercase(),
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(8.dp)
                        .clip(RoundedCornerShape(8.dp))
                        .background(KittyGlass)
                        .border(1.dp, KittyOutlineSoft, RoundedCornerShape(8.dp))
                        .padding(horizontal = 7.dp, vertical = 3.dp),
                    style = MaterialTheme.typography.labelSmall,
                    color = KittyText,
                    fontWeight = FontWeight.Bold,
                    letterSpacing = 0.6.sp,
                    maxLines = 1,
                )
            }
            Box(
                modifier = Modifier
                    .align(Alignment.Center)
                    .size(48.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(KittyGlass)
                    .border(1.dp, KittyOutline, RoundedCornerShape(999.dp)),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = KittyText,
                    modifier = Modifier.size(24.dp),
                )
            }
            Column(
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .fillMaxWidth()
                    .padding(horizontal = 12.dp, vertical = 10.dp),
            ) {
                Text(
                    title,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleSmall,
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                )
                Row(
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        "Episode $episode",
                        style = MaterialTheme.typography.labelSmall,
                        color = Color.White.copy(alpha = 0.72f),
                    )
                    if (durationMs > 0L) {
                        Text(
                            "${(progress * 100f).toInt()}%",
                            style = MaterialTheme.typography.labelSmall,
                            color = KittyAccentGlow,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
                Spacer(modifier = Modifier.height(7.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(PlayerChrome.TrackGlass),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .height(3.dp)
                            .clip(RoundedCornerShape(999.dp))
                            .background(PlayerChrome.Progress),
                    )
                }
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .kittyGlassSoft(RoundedCornerShape(14.dp))
                .clickable(onClick = onClick)
                .padding(10.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(96.dp)
                    .aspectRatio(16f / 9f)
                    .clip(RoundedCornerShape(10.dp)),
            ) {
                AsyncImage(
                    model = coverUrl,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
            }
            Spacer(modifier = Modifier.width(12.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(
                    title,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                    style = MaterialTheme.typography.titleSmall,
                    color = KittyText,
                    fontWeight = FontWeight.SemiBold,
                )
                KittyMetaChips(
                    items = listOfNotNull(
                        badge?.takeIf { it.isNotBlank() },
                        "Ep $episode",
                        if (durationMs > 0L) "${(progress * 100f).toInt()}%" else null,
                    ),
                )
            }
            Box(
                modifier = Modifier
                    .size(36.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(KittyAccent),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    Icons.Filled.PlayArrow,
                    contentDescription = null,
                    tint = KittyOnAccent,
                    modifier = Modifier.size(20.dp),
                )
            }
        }
    }
}
