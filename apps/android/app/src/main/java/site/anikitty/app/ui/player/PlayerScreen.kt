package site.anikitty.app.ui.player

import android.app.Activity
import android.content.pm.ActivityInfo
import android.view.ViewGroup
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.Forward10
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Replay10
import androidx.compose.material.icons.rounded.SkipNext
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.media3.common.C
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.PlayerChrome
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

/**
 * Full-bleed anime player with custom chrome (tap to toggle):
 * back + title, ±10s skip, paper play disc, scrubber.
 */
@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    title: String,
    episode: Int,
    sources: List<PlayableSource>,
    onClose: () -> Unit,
    onNextEpisode: (() -> Unit)? = null,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    var error by remember { mutableStateOf<String?>(null) }
    var ready by remember { mutableStateOf(false) }
    var playing by remember { mutableStateOf(true) }
    var controlsVisible by remember { mutableStateOf(true) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var scrubbing by remember { mutableStateOf(false) }
    var scrubValue by remember { mutableFloatStateOf(0f) }
    var sourceIndex by remember(sources) { mutableStateOf(0) }
    val source = sources.getOrNull(sourceIndex)
    val stripBytes = remember { AtomicInteger(SegmentStripDataSource.DEFAULT_STRIP_BYTES) }

    BackHandler(onBack = onClose)

    DisposableEffect(Unit) {
        val previous = activity?.requestedOrientation
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        onDispose {
            activity?.requestedOrientation =
                previous ?: ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
        }
    }

    val player = remember(source?.url) {
        if (source == null) return@remember null
        val httpFactory = DefaultHttpDataSource.Factory()
            .setUserAgent(source.headers["User-Agent"] ?: DEFAULT_UA)
            .setDefaultRequestProperties(source.headers)
            .setAllowCrossProtocolRedirects(true)
            .setConnectTimeoutMs(12_000)
            .setReadTimeoutMs(20_000)
        stripBytes.set(
            source.stripBytes.takeIf { it > 0 } ?: SegmentStripDataSource.DEFAULT_STRIP_BYTES,
        )
        // Unwrap MegaPlay PNG-disguised HLS segments (strip leading fake PNG bytes).
        val factory = SegmentStripDataSource.Factory(httpFactory, stripBytes = stripBytes)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(2_500, 40_000, 1_500, 2_000)
            .build()
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(factory))
            .setLoadControl(loadControl)
            .build()
            .apply {
                val itemBuilder = MediaItem.Builder().setUri(source.url)
                if (source.url.contains(".m3u8", ignoreCase = true)) {
                    itemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                }
                setMediaItem(itemBuilder.build())
                playWhenReady = true
                videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
                prepare()
            }
    }

    DisposableEffect(player) {
        ready = false
        error = null
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                ready = playbackState == Player.STATE_READY || playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) {
                    durationMs = player?.duration?.coerceAtLeast(0L) ?: 0L
                    error = null
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                playing = isPlaying
            }

            override fun onPlayerError(e: PlaybackException) {
                if (sourceIndex + 1 < sources.size) {
                    sourceIndex += 1
                } else {
                    val cause = e.cause?.message?.takeIf { it.isNotBlank() }
                    error = listOfNotNull(e.message, cause).joinToString(" — ")
                        .ifBlank { "Playback failed" }
                }
            }
        }
        player?.addListener(listener)
        onDispose {
            player?.removeListener(listener)
            player?.release()
        }
    }

    LaunchedEffect(sources) {
        sourceIndex = 0
        if (sources.isEmpty()) error = "No playable source"
    }

    LaunchedEffect(player, scrubbing) {
        while (player != null) {
            if (!scrubbing) {
                positionMs = player.currentPosition.coerceAtLeast(0L)
                val d = player.duration
                if (d > 0) durationMs = d
            }
            delay(250)
        }
    }

    LaunchedEffect(controlsVisible, playing, scrubbing) {
        if (controlsVisible && playing && !scrubbing) {
            delay(3_200)
            controlsVisible = false
        }
    }

    fun seekBy(deltaMs: Long) {
        val p = player ?: return
        val target = (p.currentPosition + deltaMs).coerceIn(0L, p.duration.coerceAtLeast(0L))
        p.seekTo(target)
        positionMs = target
        controlsVisible = true
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyInk)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = { controlsVisible = !controlsVisible },
                    onDoubleTap = { offset ->
                        if (offset.x < size.width / 2f) seekBy(-10_000) else seekBy(10_000)
                    },
                )
            },
    ) {
        if (player != null && error == null) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        resizeMode = AspectRatioFrameLayout.RESIZE_MODE_FIT
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                        this.player = player
                    }
                },
                update = { it.player = player },
                modifier = Modifier.fillMaxSize(),
            )
        }

        if (!ready && error == null) {
            CircularProgressIndicator(
                modifier = Modifier.align(Alignment.Center),
                color = PlayerChrome.Paper,
            )
        }

        if (error != null) {
            Text(
                error!!,
                color = PlayerChrome.Paper,
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(24.dp),
            )
        }

        AnimatedVisibility(
            visible = controlsVisible || error != null,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
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
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.82f)),
                            ),
                        ),
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(WindowInsets.statusBars)
                        .padding(horizontal = 12.dp, vertical = 8.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    ChromeDisc(onClick = onClose) {
                        Icon(
                            Icons.AutoMirrored.Rounded.ArrowBack,
                            contentDescription = "Back",
                            tint = PlayerChrome.Paper,
                        )
                    }
                    Spacer(modifier = Modifier.width(12.dp))
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            "EPISODE $episode",
                            color = PlayerChrome.Accent,
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Bold,
                            letterSpacing = 0.8.sp,
                        )
                        Text(
                            title,
                            color = PlayerChrome.Paper,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    if (onNextEpisode != null) {
                        ChromeDisc(onClick = onNextEpisode) {
                            Icon(
                                Icons.Rounded.SkipNext,
                                contentDescription = "Next episode",
                                tint = PlayerChrome.Paper,
                            )
                        }
                    }
                }

                Row(
                    modifier = Modifier.align(Alignment.Center),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(28.dp),
                ) {
                    ChromeDisc(onClick = { seekBy(-10_000) }, size = 48.dp) {
                        Icon(Icons.Rounded.Replay10, null, tint = PlayerChrome.Paper)
                    }
                    Box(
                        modifier = Modifier
                            .size(68.dp)
                            .clip(CircleShape)
                            .background(PlayerChrome.Paper)
                            .clickable {
                                player?.let {
                                    if (it.isPlaying) it.pause() else it.play()
                                }
                                controlsVisible = true
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            if (playing) Icons.Rounded.Pause else Icons.Rounded.PlayArrow,
                            contentDescription = if (playing) "Pause" else "Play",
                            tint = PlayerChrome.Ink,
                            modifier = Modifier.size(36.dp),
                        )
                    }
                    ChromeDisc(onClick = { seekBy(10_000) }, size = 48.dp) {
                        Icon(Icons.Rounded.Forward10, null, tint = PlayerChrome.Paper)
                    }
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 18.dp, vertical = 18.dp),
                ) {
                    val dur = durationMs.coerceAtLeast(1L).toFloat()
                    val progress = if (scrubbing) scrubValue else (positionMs / dur).coerceIn(0f, 1f)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                    ) {
                        Text(formatClock(positionMs), color = PlayerChrome.Graphite, fontSize = 12.sp)
                        Text(
                            "−${formatClock((durationMs - positionMs).coerceAtLeast(0L))}",
                            color = PlayerChrome.Graphite,
                            fontSize = 12.sp,
                        )
                    }
                    Slider(
                        value = progress,
                        onValueChange = {
                            scrubbing = true
                            scrubValue = it
                            controlsVisible = true
                        },
                        onValueChangeFinished = {
                            player?.seekTo((scrubValue * durationMs).toLong())
                            positionMs = (scrubValue * durationMs).toLong()
                            scrubbing = false
                        },
                        colors = SliderDefaults.colors(
                            thumbColor = PlayerChrome.Paper,
                            activeTrackColor = PlayerChrome.Paper,
                            inactiveTrackColor = PlayerChrome.Faint,
                        ),
                        modifier = Modifier.fillMaxWidth(),
                    )
                    if (sources.size > 1) {
                        Text(
                            sources.first().label,
                            color = PlayerChrome.Faint,
                            fontSize = 11.sp,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun ChromeDisc(
    onClick: () -> Unit,
    size: androidx.compose.ui.unit.Dp = 40.dp,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(size)
            .clip(CircleShape)
            .background(PlayerChrome.Disc)
            .border(1.dp, PlayerChrome.DiscStroke, CircleShape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
        content = { content() },
    )
}

private fun formatClock(ms: Long): String {
    val total = TimeUnit.MILLISECONDS.toSeconds(ms.coerceAtLeast(0L))
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) {
        String.format(Locale.US, "%d:%02d:%02d", h, m, s)
    } else {
        String.format(Locale.US, "%d:%02d", m, s)
    }
}

private const val DEFAULT_UA =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
