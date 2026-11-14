// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.components

import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateDpAsState
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
import androidx.compose.foundation.layout.fillMaxHeight
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
import androidx.compose.foundation.pager.HorizontalPager
import androidx.compose.foundation.pager.rememberPagerState
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.outlined.Info
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import kotlinx.coroutines.delay
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.scale
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.graphicsLayer
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
import site.anikitty.app.ui.app.spacePress
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
                fontWeight = FontWeight.SemiBold,
                color = KittyText,
                letterSpacing = (-0.4).sp,
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.bodyMedium,
                    color = KittyMuted,
                    fontWeight = FontWeight.Medium,
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
            .clip(RoundedCornerShape(12.dp))
            .background(Color(0xFF0C0C10))
            .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
            .padding(horizontal = 18.dp, vertical = 26.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        KittyFace(
            modifier = Modifier.size(72.dp),
            waving = true,
            contentDescription = title,
        )
        Spacer(modifier = Modifier.height(12.dp))
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
                shape = RoundedCornerShape(16.dp),
                contentPadding = PaddingValues(horizontal = 18.dp, vertical = 10.dp),
            ) {
                Text(actionLabel, fontWeight = FontWeight.SemiBold, color = Color.Black)
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
            .background(KittySurface)
            .background(
                Brush.horizontalGradient(
                    0f to Color.Transparent,
                    (shift - 0.25f).coerceIn(0f, 1f) to Color.Transparent,
                    shift to KittyAccent.copy(alpha = 0.18f),
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
    onMore: (() -> Unit)? = null,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .then(if (padded) Modifier.padding(horizontal = 16.dp) else Modifier),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Column(modifier = Modifier.weight(1f)) {
            Text(
                title,
                style = MaterialTheme.typography.titleMedium,
                fontWeight = FontWeight.SemiBold,
                color = Color.White,
                letterSpacing = (-0.3).sp,
            )
            if (!subtitle.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(2.dp))
                Text(
                    subtitle,
                    style = MaterialTheme.typography.labelMedium,
                    color = Color.White.copy(alpha = 0.45f),
                    fontWeight = FontWeight.Medium,
                )
            }
        }
        if (onMore != null) {
            Text(
                "See all",
                color = Color.White.copy(alpha = 0.7f),
                style = MaterialTheme.typography.labelMedium,
                fontWeight = FontWeight.SemiBold,
                modifier = Modifier.spacePress(onMore).padding(horizontal = 4.dp, vertical = 6.dp),
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
    val shape = RoundedCornerShape(12.dp)
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
                .background(KittySurface),
        ) {
            AsyncImage(
                model = anime.coverImageUrl,
                contentDescription = anime.title,
                modifier = Modifier.fillMaxSize(),
                contentScale = ContentScale.Crop,
            )
            anime.scoreLabel()?.let { score ->
                Row(
                    modifier = Modifier
                        .align(Alignment.TopEnd)
                        .padding(6.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Black.copy(alpha = 0.65f))
                        .border(1.dp, Color.White.copy(alpha = 0.15f), RoundedCornerShape(6.dp))
                        .padding(horizontal = 4.dp, vertical = 2.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Text(
                        score,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 8.sp,
                    )
                }
            }
        }
        Text(
            anime.title,
            modifier = Modifier.padding(top = 6.dp, start = 2.dp, end = 2.dp),
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
            style = MaterialTheme.typography.labelMedium,
            color = KittyText,
            fontWeight = FontWeight.Bold,
            fontSize = 11.sp,
            lineHeight = 14.sp,
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
fun KittyTopTenRow(
    title: String,
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
    subtitle: String? = "Most watched right now",
) {
    val ranked = items.take(10)
    if (ranked.isEmpty()) return
    Column(modifier = Modifier.padding(top = 26.dp)) {
        KittySectionHeading(title = title, subtitle = subtitle)
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            items(ranked.size) { index ->
                val anime = ranked[index]
                Row(verticalAlignment = Alignment.Bottom) {
                    Text(
                        "${index + 1}",
                        color = Color.White.copy(alpha = 0.92f),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 36.sp,
                        letterSpacing = (-1.2).sp,
                        modifier = Modifier.padding(end = 2.dp, bottom = 28.dp),
                    )
                    KittyPosterCard(
                        anime = anime,
                        onClick = { onOpen(anime) },
                        width = 108.dp,
                    )
                }
            }
        }
    }
}

@Composable
fun KittyGlassHeroPager(
    items: List<AnimeSummary>,
    onOpen: (AnimeSummary) -> Unit,
) {
    val pages = items.take(5)
    if (pages.isEmpty()) return
    val pagerState = rememberPagerState(pageCount = { pages.size })
    LaunchedEffect(pages.size) {
        if (pages.size < 2) return@LaunchedEffect
        while (true) {
            delay(5000)
            if (!pagerState.isScrollInProgress) {
                val next = (pagerState.currentPage + 1) % pages.size
                pagerState.animateScrollToPage(next)
            }
        }
    }
    Column(
        modifier = Modifier.fillMaxWidth(),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        HorizontalPager(
            state = pagerState,
            modifier = Modifier
                .fillMaxWidth()
                .height(300.dp),
        ) { page ->
            val anime = pages[page]
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .spacePress { onOpen(anime) },
            ) {
                AsyncImage(
                    model = anime.bannerImageUrl ?: anime.coverImageUrl,
                    contentDescription = null,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize(),
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                0f to Color.Black.copy(alpha = 0.15f),
                                0.35f to Color.Transparent,
                                0.62f to Color.Black.copy(alpha = 0.55f),
                                1f to Color.Black,
                            ),
                        ),
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(start = 20.dp, end = 20.dp, bottom = 16.dp)
                        .fillMaxWidth(),
                ) {
                    Text(
                        (anime.format ?: "SERIES").uppercase(),
                        color = Color.White.copy(alpha = 0.7f),
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 11.sp,
                        letterSpacing = 1.sp,
                    )
                    Spacer(modifier = Modifier.height(6.dp))
                    Text(
                        anime.title,
                        color = Color.White,
                        fontWeight = FontWeight.SemiBold,
                        fontSize = 26.sp,
                        lineHeight = 30.sp,
                        letterSpacing = (-0.4).sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                    )
                    if (anime.genres.isNotEmpty()) {
                        Spacer(modifier = Modifier.height(4.dp))
                        Text(
                            anime.genres.take(3).joinToString("  ·  "),
                            color = Color.White.copy(alpha = 0.55f),
                            fontSize = 12.sp,
                            maxLines = 1,
                        )
                    }
                    Spacer(modifier = Modifier.height(12.dp))
                    Row(
                        modifier = Modifier
                            .clip(RoundedCornerShape(16.dp))
                            .background(Color.White)
                            .padding(horizontal = 14.dp, vertical = 8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Icon(
                            Icons.Filled.PlayArrow,
                            contentDescription = null,
                            tint = Color.Black,
                            modifier = Modifier.size(16.dp),
                        )
                        Spacer(modifier = Modifier.width(6.dp))
                        Text("Play", color = Color.Black, fontWeight = FontWeight.SemiBold, fontSize = 13.sp)
                    }
                }
            }
        }
        Row(horizontalArrangement = Arrangement.spacedBy(5.dp)) {
            repeat(pages.size) { index ->
                val selected = pagerState.currentPage == index
                val width by animateDpAsState(if (selected) 18.dp else 5.dp, tween(180), label = "dot")
                Box(
                    modifier = Modifier
                        .height(4.dp)
                        .width(width)
                        .clip(CircleShape)
                        .background(if (selected) Color.White else Color.White.copy(alpha = 0.28f)),
                )
            }
        }
    }
}

@Composable
fun KittyGenreTiles(
    genres: List<Pair<String, String?>>,
    selected: String?,
    onSelect: (String) -> Unit,
) {
    if (genres.isEmpty()) return
    Column(modifier = Modifier.padding(top = 22.dp)) {
        Text(
            "Genres",
            color = Color.White,
            fontWeight = FontWeight.SemiBold,
            fontSize = 16.sp,
            letterSpacing = (-0.3).sp,
            modifier = Modifier.padding(horizontal = 20.dp),
        )
        Text(
            "Jump into a genre",
            color = Color.White.copy(alpha = 0.45f),
            fontWeight = FontWeight.Medium,
            fontSize = 12.sp,
            modifier = Modifier.padding(horizontal = 20.dp, vertical = 2.dp),
        )
        LazyRow(
            contentPadding = PaddingValues(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(6.dp),
        ) {
            items(genres.size) { index ->
                val (name, image) = genres[index]
                val shape = RoundedCornerShape(12.dp)
                val picked = selected == name
                val stroke by animateColorAsState(
                    if (picked) Color.White else Color.White.copy(alpha = 0.08f),
                    tween(180),
                    label = "genreStroke",
                )
                Box(
                    modifier = Modifier
                        .width(136.dp)
                        .aspectRatio(16f / 9f)
                        .spacePress { onSelect(name) }
                        .clip(shape)
                        .background(Color(0xFF0C0C10))
                        .border(if (picked) 1.5.dp else 0.5.dp, stroke, shape),
                ) {
                    if (!image.isNullOrBlank()) {
                        AsyncImage(
                            model = image,
                            contentDescription = name,
                            contentScale = ContentScale.Crop,
                            modifier = Modifier.fillMaxSize(),
                        )
                    }
                    Box(
                        modifier = Modifier
                            .fillMaxSize()
                            .background(
                                Brush.verticalGradient(
                                    listOf(Color.Black.copy(alpha = 0.15f), Color.Black.copy(alpha = 0.75f)),
                                ),
                            ),
                    )
                    Text(
                        name,
                        color = Color.White,
                        fontWeight = FontWeight.Bold,
                        fontSize = 13.sp,
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
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
    onMore: (() -> Unit)? = null,
) {
    if (items.isEmpty()) return
    Column(modifier = Modifier.padding(top = 26.dp)) {
        KittySectionHeading(title = title, subtitle = subtitle, onMore = onMore)
        Spacer(modifier = Modifier.height(16.dp))
        LazyRow(
            contentPadding = PaddingValues(horizontal = 12.dp),
            horizontalArrangement = Arrangement.spacedBy(10.dp),
        ) {
            items(items, key = { it.id }) { anime ->
                KittyPosterCard(
                    anime = anime,
                    onClick = { onOpen(anime) },
                    width = 118.dp,
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
                color = KittyAccent,
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
                        border = BorderStroke(1.dp, KittyAccent.copy(alpha = 0.4f)),
                        colors = ButtonDefaults.outlinedButtonColors(contentColor = KittyText),
                        modifier = Modifier
                            .size(48.dp)
                            .clip(CircleShape)
                            .background(KittySurface)
                            .border(1.dp, KittyAccent.copy(alpha = 0.35f), CircleShape),
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
        0f
    }
    val shape = RoundedCornerShape(12.dp)
    if (wide) {
        Row(
            modifier = Modifier
                .width(280.dp)
                .height(108.dp)
                .spacePress(onClick)
                .clip(shape)
                .background(Color(0xFF0C0C10))
                .border(0.5.dp, Color.White.copy(alpha = 0.08f), shape),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxHeight()
                    .width(96.dp),
            ) {
                AsyncImage(
                    model = coverUrl,
                    contentDescription = title,
                    modifier = Modifier.fillMaxSize(),
                    contentScale = ContentScale.Crop,
                )
                Text(
                    "EP $episode",
                    modifier = Modifier
                        .align(Alignment.TopStart)
                        .padding(7.dp)
                        .clip(RoundedCornerShape(6.dp))
                        .background(Color.Black.copy(alpha = 0.65f))
                        .padding(horizontal = 6.dp, vertical = 2.dp),
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 9.sp,
                )
            }
            Column(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxHeight()
                    .padding(horizontal = 12.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.SpaceBetween,
            ) {
                Column {
                    Text(
                        title,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis,
                        style = MaterialTheme.typography.titleSmall,
                        color = KittyText,
                        fontWeight = FontWeight.Bold,
                        lineHeight = 18.sp,
                    )
                    if (!badge.isNullOrBlank()) {
                        Text(
                            badge,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                            style = MaterialTheme.typography.labelSmall,
                            color = KittyFaint,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    } else {
                        Text(
                            "Episode $episode",
                            maxLines = 1,
                            style = MaterialTheme.typography.labelSmall,
                            color = KittyFaint,
                            modifier = Modifier.padding(top = 3.dp),
                        )
                    }
                }
                if (durationMs > 0L) {
                    Column {
                        Text(
                            "${(progress * 100f).toInt()}% watched",
                            style = MaterialTheme.typography.labelSmall,
                            color = Color.White.copy(alpha = 0.45f),
                            fontWeight = FontWeight.Medium,
                        )
                        Spacer(modifier = Modifier.height(6.dp))
                        Box(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(2.dp)
                                .clip(RoundedCornerShape(999.dp))
                                .background(Color.White.copy(alpha = 0.12f)),
                        ) {
                            Box(
                                modifier = Modifier
                                    .fillMaxWidth(progress)
                                    .height(2.dp)
                                    .background(Color.White),
                            )
                        }
                    }
                }
            }
        }
    } else {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clip(RoundedCornerShape(12.dp))
                .background(Color(0xFF0C0C10))
                .border(0.5.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(12.dp))
                .clickable(onClick = onClick)
                .padding(8.dp),
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Box(
                modifier = Modifier
                    .width(56.dp)
                    .aspectRatio(2f / 3f)
                    .clip(RoundedCornerShape(8.dp)),
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
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    color = Color.White,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                )
                Text(
                    listOfNotNull(badge?.takeIf { it.isNotBlank() }, "Episode $episode").joinToString(" · "),
                    maxLines = 1,
                    color = KittyMuted,
                    fontSize = 11.sp,
                    modifier = Modifier.padding(top = 3.dp),
                )
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(3.dp)
                        .clip(RoundedCornerShape(999.dp))
                        .background(KittyOutlineSoft),
                ) {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth(progress)
                            .fillMaxHeight()
                            .background(KittyAccent),
                    )
                }
            }
        }
    }
}
