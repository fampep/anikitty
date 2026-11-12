package site.anikitty.desktop.ui.player


import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.desktop.data.stream.PlayableSource
import site.anikitty.desktop.ui.theme.KittyAccent
import site.anikitty.desktop.ui.theme.KittyAccentGlow
import site.anikitty.desktop.ui.theme.KittyFaint
import site.anikitty.desktop.ui.theme.KittyInk
import site.anikitty.desktop.ui.theme.KittyMuted
import site.anikitty.desktop.ui.theme.KittyOnAccent
import site.anikitty.desktop.ui.theme.KittyText
import site.anikitty.desktop.ui.theme.PlayerChrome


/**
 * AniKitty glass player — desktop port of the Android custom player chrome.
 * Decode via system FFmpeg (not VLC).
 */
@Composable
fun DesktopPlayerScreen(
    title: String,
    episode: Int,
    sources: List<PlayableSource>,
    onClose: () -> Unit,
    onNextEpisode: (() -> Unit)? = null,
) {
    val scope = rememberCoroutineScope()
    val engine = remember { FfmpegPlaybackEngine(scope) }
    var sourceIndex by remember(sources) { mutableStateOf(0) }
    var scrubbing by remember { mutableStateOf(false) }
    var scrubValue by remember { mutableStateOf(0f) }
    var controlsVisible by remember { mutableStateOf(true) }

    val source = sources.getOrNull(sourceIndex)

    LaunchedEffect(source?.url, source?.headers) {
        if (source != null) engine.play(source)
    }

    DisposableEffect(Unit) {
        onDispose { engine.stop() }
    }

    val progress = when {
        scrubbing -> scrubValue
        engine.durationMs > 0 -> (engine.positionMs.toFloat() / engine.durationMs).coerceIn(0f, 1f)
        else -> 0f
    }

    Box(
        modifier = Mod
            .fillMaxSize()
            .background(KittyInk)
            .clickable { controlsVisible = !controlsVisible },
    ) {
        val bmp = engine.frame
        if (bmp != null) {
            Image(
                bitmap = bmp,
                contentDescription = null,
                contentScale = ContentScale.Fit,
                modifier = Mod.fillMaxSize(),
            )
        } else if (engine.error == null) {
            Box(Mod.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = KittyAccentGlow)
            }
        }

        // Top / bottom glass washes
        Box(
            modifier = Mod
                .fillMaxWidth()
                .height(120.dp)
                .align(Alignment.TopCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Black.copy(alpha = 0.72f), Color.Transparent),
                    ),
                ),
        )
        Box(
            modifier = Mod
                .fillMaxWidth()
                .height(160.dp)
                .align(Alignment.BottomCenter)
                .background(
                    Brush.verticalGradient(
                        listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                    ),
                ),
        )

        if (controlsVisible) {
            Row(
                modifier = Mod
                    .align(Alignment.TopStart)
                    .padding(18.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GlassDisc(onClick = onClose) {
                    Icon(Icons.Rounded.Close, contentDescription = "Close", tint = KittyText)
                }
                Spacer(Mod.width(14.dp))
                Column {
                    Text(
                        text = title,
                        color = KittyText,
                        fontWeight = FontWeight.Bold,
                        fontSize = 18.sp,
                    )
                    Text(
                        text = "Episode $episode · ${source?.label ?: "Ani.pm"}",
                        color = KittyFaint,
                        fontSize = 12.sp,
                    )
                }
            }

            Row(
                modifier = Mod.align(Alignment.Center),
                horizontalArrangement = Arrangement.spacedBy(22.dp),
                verticalAlignment = Alignment.CenterVertically,
            ) {
                GlassDisc(large = true, onClick = { engine.togglePlayPause() }) {
                    Icon(
                        if (engine.playing) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                        contentDescription = "Play/Pause",
                        tint = KittyOnAccent,
                        modifier = Mod.size(36.dp),
                    )
                }
                if (onNextEpisode != null) {
                    GlassDisc(onClick = onNextEpisode) {
                        Icon(Icons.Rounded.SkipNext, contentDescription = "Next", tint = KittyText)
                    }
                }
            }

            Column(
                modifier = Mod
                    .align(Alignment.BottomCenter)
                    .fillMaxWidth()
                    .padding(horizontal = 24.dp, vertical = 18.dp),
            ) {
                if (sources.size > 1) {
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        sources.forEachIndexed { i, s ->
                            val selected = i == sourceIndex
                            Text(
                                text = s.label,
                                color = if (selected) KittyOnAccent else KittyText,
                                fontWeight = FontWeight.SemiBold,
                                fontSize = 12.sp,
                                modifier = Mod
                                    .clip(RoundedCornerShape(10.dp))
                                    .background(if (selected) KittyAccent else Color.White.copy(alpha = 0.12f))
                                    .clickable { sourceIndex = i }
                                    .padding(horizontal = 10.dp, vertical = 6.dp),
                            )
                        }
                    }
                    Spacer(Mod.height(10.dp))
                }
                DesktopGlassScrubber(
                    progress = progress,
                    durationMs = engine.durationMs,
                    scrubbing = scrubbing,
                    onScrub = {
                        scrubbing = true
                        scrubValue = it
                    },
                    onScrubFinished = {
                        scrubbing = false
                        if (engine.durationMs > 0) {
                            engine.seekTo((scrubValue * engine.durationMs).toLong())
                        }
                    },
                    formatClock = ::formatClock,
                )
                Row(
                    modifier = Mod.fillMaxWidth().padding(top = 6.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                ) {
                    Text(
                        text = formatClock(
                            if (scrubbing) (scrubValue * engine.durationMs).toLong()
                            else engine.positionMs,
                        ),
                        color = KittyMuted,
                        fontSize = 12.sp,
                    )
                    Text(
                        text = formatClock(engine.durationMs),
                        color = KittyMuted,
                        fontSize = 12.sp,
                    )
                }
            }
        }

        engine.error?.let { msg ->
            Text(
                text = msg,
                color = Color(0xFFFF8A95),
                modifier = Mod
                    .align(Alignment.Center)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.Black.copy(alpha = 0.75f))
                    .padding(16.dp),
            )
        }
    }
}

@Composable
private fun GlassDisc(
    large: Boolean = false,
    onClick: () -> Unit,
    content: @Composable () -> Unit,
) {
    val size = if (large) 72.dp else 44.dp
    Box(
        modifier = Mod
            .size(size)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = if (large) 0.92f else 0.14f))
            .border(1.dp, PlayerChrome.DiscStroke, RoundedCornerShape(999.dp))
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}

private fun formatClock(ms: Long): String {
    if (ms <= 0L) return "0:00"
    val total = (ms / 1000).toInt()
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) "%d:%02d:%02d".format(h, m, s) else "%d:%02d".format(m, s)
}
