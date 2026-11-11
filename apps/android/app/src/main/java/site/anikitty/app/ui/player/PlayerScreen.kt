package site.anikitty.app.ui.player

import android.app.Activity
import android.content.pm.ActivityInfo
import android.graphics.Color as AndroidColor
import android.graphics.Typeface
import android.view.ViewGroup
import android.view.WindowManager
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
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.offset
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.ClosedCaption
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.FullscreenExit
import androidx.compose.material.icons.rounded.Forward10
import androidx.compose.material.icons.rounded.Hd
import androidx.compose.material.icons.rounded.Pause
import androidx.compose.material.icons.rounded.PlayArrow
import androidx.compose.material.icons.rounded.Replay10
import androidx.compose.material.icons.rounded.Settings
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
import androidx.compose.runtime.mutableIntStateOf
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
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.view.WindowCompat
import androidx.core.view.WindowInsetsCompat
import androidx.core.view.WindowInsetsControllerCompat
import androidx.media3.common.C
import androidx.media3.common.Format
import androidx.media3.common.MediaItem
import androidx.media3.common.MimeTypes
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.common.TrackGroup
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.text.Cue
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultHttpDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import site.anikitty.app.data.servers.SubtitleTrack
import site.anikitty.app.data.skip.SkipTimes
import site.anikitty.app.data.skip.SkipTimesClient
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.theme.PlayerChrome
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private enum class Panel { None, Quality, Subs, Style, Display }

/**
 * Caption look. [sizeFraction] is a share of the player viewport height so
 * text scales with screen size (phones stay readable without eating the frame).
 */
private data class SubStyle(
    val sizeFraction: Float = DEFAULT_SUB_SIZE_FRACTION,
    val bottomPad: Float = DEFAULT_SUB_BOTTOM_PAD,
    val color: Int = AndroidColor.WHITE,
    val background: Boolean = true,
    val edgeType: Int = CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW,
)

private data class TextOption(
    val id: String,
    val label: String,
    /** null = off/auto (no hard override) */
    val mediaGroup: TrackGroup? = null,
    val trackIndex: Int = 0,
)

/**
 * Full-bleed anime player with custom chrome:
 * immersive fullscreen, quality + subtitle pickers, caption style, skip chips.
 */
@OptIn(UnstableApi::class)
@Composable
fun PlayerScreen(
    title: String,
    episode: Int,
    sources: List<PlayableSource>,
    anilistId: Int = 0,
    malId: Int? = null,
    startPositionMs: Long = 0L,
    onClose: () -> Unit,
    onNextEpisode: (() -> Unit)? = null,
    onProgress: ((positionMs: Long, durationMs: Long) -> Unit)? = null,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val view = LocalView.current
    var error by remember { mutableStateOf<String?>(null) }
    var ready by remember { mutableStateOf(false) }
    var playing by remember { mutableStateOf(true) }
    var controlsVisible by remember { mutableStateOf(true) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var scrubbing by remember { mutableStateOf(false) }
    var scrubValue by remember { mutableFloatStateOf(0f) }
    var sourceIndex by remember(sources) { mutableIntStateOf(0) }
    var skipTimes by remember { mutableStateOf(SkipTimes()) }
    var autoSkippedRecap by remember { mutableStateOf(false) }
    var didSeekStart by remember { mutableStateOf(false) }
    var resumeAtMs by remember { mutableLongStateOf(startPositionMs) }
    var panel by remember { mutableStateOf(Panel.None) }
    var immersive by remember { mutableStateOf(true) }
    var resizeMode by remember { mutableIntStateOf(AspectRatioFrameLayout.RESIZE_MODE_FIT) }
    var subStyle by remember {
        mutableStateOf(
            loadSubStyle(context.getSharedPreferences("anikitty_player", 0)),
        )
    }
    var subsEnabled by remember { mutableStateOf(true) }
    var selectedTextId by remember { mutableStateOf("auto") }
    var textOptions by remember { mutableStateOf<List<TextOption>>(emptyList()) }
    var playerViewRef by remember { mutableStateOf<PlayerView?>(null) }

    val source = sources.getOrNull(sourceIndex)
    val stripBytes = remember { AtomicInteger(SegmentStripDataSource.DEFAULT_STRIP_BYTES) }
    val skipClient = remember { SkipTimesClient() }
    val trackSelector = remember {
        DefaultTrackSelector(context).apply {
            parameters = buildUponParameters()
                .setPreferredTextLanguage("en")
                .build()
        }
    }

    fun closePanelOrExit() {
        if (panel != Panel.None) {
            panel = Panel.None
        } else {
            onClose()
        }
    }

    BackHandler(onBack = { closePanelOrExit() })

    DisposableEffect(Unit) {
        val previous = activity?.requestedOrientation
        activity?.requestedOrientation = ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        activity?.window?.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        onDispose {
            activity?.requestedOrientation =
                previous ?: ActivityInfo.SCREEN_ORIENTATION_UNSPECIFIED
            activity?.window?.clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        }
    }

    DisposableEffect(immersive, activity, view) {
        val window = activity?.window
        if (window == null) {
            onDispose { }
        } else {
            WindowCompat.setDecorFitsSystemWindows(window, false)
            val controller = WindowInsetsControllerCompat(window, view)
            if (immersive) {
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
            onDispose {
                controller.show(WindowInsetsCompat.Type.systemBars())
                WindowCompat.setDecorFitsSystemWindows(window, true)
            }
        }
    }

    val player = remember(source?.url, source?.subtitles) {
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
        val factory = SegmentStripDataSource.Factory(httpFactory, stripBytes = stripBytes)
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(2_500, 40_000, 1_500, 2_000)
            .build()
        ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(factory))
            .setLoadControl(loadControl)
            .setTrackSelector(trackSelector)
            .build()
            .apply {
                val itemBuilder = MediaItem.Builder().setUri(source.url)
                if (source.url.contains(".m3u8", ignoreCase = true)) {
                    itemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                }
                val configs = source.subtitles.mapNotNull { track ->
                    subtitleConfig(track)
                }
                if (configs.isNotEmpty()) {
                    itemBuilder.setSubtitleConfigurations(configs)
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
        textOptions = emptyList()
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                ready = playbackState == Player.STATE_READY || playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) {
                    durationMs = player?.duration?.coerceAtLeast(0L) ?: 0L
                    error = null
                    if (resumeAtMs > 1_500L && durationMs > resumeAtMs) {
                        player?.seekTo(resumeAtMs.coerceAtMost(durationMs - 1_000L))
                        positionMs = resumeAtMs
                        resumeAtMs = 0L
                        didSeekStart = true
                    }
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                playing = isPlaying
            }

            override fun onTracksChanged(tracks: Tracks) {
                textOptions = buildTextOptions(tracks, source?.subtitles.orEmpty())
                applyTextSelection(trackSelector, selectedTextId, textOptions, subsEnabled)
            }

            override fun onPlayerError(e: PlaybackException) {
                if (sourceIndex + 1 < sources.size) {
                    resumeAtMs = player?.currentPosition?.coerceAtLeast(0L) ?: positionMs
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

    LaunchedEffect(subsEnabled, selectedTextId, textOptions) {
        applyTextSelection(trackSelector, selectedTextId, textOptions, subsEnabled)
    }

    LaunchedEffect(subStyle, playerViewRef) {
        applyCaptionStyle(playerViewRef, subStyle)
        context.getSharedPreferences("anikitty_player", 0).edit()
            .putFloat("sub_size_frac", subStyle.sizeFraction)
            .putFloat("sub_bottom", subStyle.bottomPad)
            .putInt("sub_color", subStyle.color)
            .putBoolean("sub_bg", subStyle.background)
            .putInt("sub_edge", subStyle.edgeType)
            .apply()
    }

    LaunchedEffect(player, scrubbing) {
        var ticks = 0
        while (player != null) {
            if (!scrubbing) {
                positionMs = player.currentPosition.coerceAtLeast(0L)
                val d = player.duration
                if (d > 0) durationMs = d
                if (!didSeekStart && ready && startPositionMs > 2_000L && durationMs > startPositionMs) {
                    player.seekTo(startPositionMs.coerceAtMost(durationMs - 1_000L))
                    didSeekStart = true
                    positionMs = startPositionMs
                }
                val active = skipTimes.activeAt(positionMs)
                if (active != null) {
                    val (kind, iv) = active
                    if (kind == "recap" && !autoSkippedRecap) {
                        autoSkippedRecap = true
                        player.seekTo(iv.endMs)
                        positionMs = iv.endMs
                    }
                }
                ticks++
                if (ticks % 8 == 0) {
                    onProgress?.invoke(positionMs, durationMs)
                }
            }
            delay(250)
        }
    }

    LaunchedEffect(anilistId, episode, malId, durationMs) {
        if (anilistId <= 0 || episode <= 0) return@LaunchedEffect
        val lengthSec = if (durationMs > 0) durationMs / 1000.0 else 1420.0
        skipTimes = runCatching {
            skipClient.load(anilistId, episode, malId, lengthSec)
        }.getOrDefault(SkipTimes())
        autoSkippedRecap = false
    }

    DisposableEffect(Unit) {
        onDispose {
            onProgress?.invoke(positionMs, durationMs)
        }
    }

    LaunchedEffect(controlsVisible, playing, scrubbing, panel) {
        if (controlsVisible && playing && !scrubbing && panel == Panel.None) {
            delay(3_600)
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

    fun skipTo(endMs: Long) {
        val p = player ?: return
        p.seekTo(endMs.coerceIn(0L, p.duration.coerceAtLeast(0L)))
        positionMs = endMs
        controlsVisible = true
    }

    fun pickQuality(index: Int) {
        if (index == sourceIndex || index !in sources.indices) return
        resumeAtMs = player?.currentPosition?.coerceAtLeast(0L) ?: positionMs
        didSeekStart = true
        sourceIndex = index
        panel = Panel.None
        controlsVisible = true
    }

    val activeSkip = skipTimes.activeAt(positionMs)
    val qualityLabel = source?.label ?: "Quality"
    val subLabel = when {
        !subsEnabled -> "Off"
        selectedTextId == "auto" -> "Auto"
        else -> textOptions.firstOrNull { it.id == selectedTextId }?.label ?: "Subs"
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyInk)
            .pointerInput(Unit) {
                detectTapGestures(
                    onTap = {
                        if (panel != Panel.None) {
                            panel = Panel.None
                        } else {
                            controlsVisible = !controlsVisible
                        }
                    },
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
                        this.resizeMode = resizeMode
                        layoutParams = FrameLayout.LayoutParams(
                            ViewGroup.LayoutParams.MATCH_PARENT,
                            ViewGroup.LayoutParams.MATCH_PARENT,
                        )
                        this.player = player
                        subtitleView?.setApplyEmbeddedStyles(false)
                        applyCaptionStyle(this, subStyle)
                        playerViewRef = this
                    }
                },
                update = {
                    it.player = player
                    it.resizeMode = resizeMode
                    applyCaptionStyle(it, subStyle)
                    playerViewRef = it
                },
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
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(
                    "Couldn't play this source",
                    color = PlayerChrome.Paper,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    error!!,
                    color = PlayerChrome.Graphite,
                    fontSize = 13.sp,
                )
            }
        }

        AnimatedVisibility(
            visible = controlsVisible || error != null || panel != Panel.None,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(132.dp)
                        .align(Alignment.TopCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Black.copy(alpha = 0.78f), Color.Transparent),
                            ),
                        ),
                )
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(188.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.88f)),
                            ),
                        ),
                )

                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .windowInsetsPadding(WindowInsets.statusBars)
                        .padding(horizontal = 12.dp, vertical = 10.dp),
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
                            letterSpacing = 0.9.sp,
                        )
                        Text(
                            title,
                            color = PlayerChrome.Paper,
                            fontWeight = FontWeight.SemiBold,
                            maxLines = 1,
                            overflow = TextOverflow.Ellipsis,
                        )
                    }
                    ChromeDisc(onClick = {
                        immersive = !immersive
                        controlsVisible = true
                    }) {
                        Icon(
                            if (immersive) Icons.Rounded.FullscreenExit else Icons.Rounded.Fullscreen,
                            contentDescription = if (immersive) "Exit immersive" else "Fullscreen",
                            tint = PlayerChrome.Paper,
                        )
                    }
                    if (onNextEpisode != null) {
                        Spacer(modifier = Modifier.width(8.dp))
                        ChromeDisc(onClick = onNextEpisode) {
                            Icon(
                                Icons.Rounded.SkipNext,
                                contentDescription = "Next episode",
                                tint = PlayerChrome.Paper,
                            )
                        }
                    }
                }

                if (panel == Panel.None) {
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
                                .size(72.dp)
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
                                modifier = Modifier.size(38.dp),
                            )
                        }
                        ChromeDisc(onClick = { seekBy(10_000) }, size = 48.dp) {
                            Icon(Icons.Rounded.Forward10, null, tint = PlayerChrome.Paper)
                        }
                    }
                }

                if (activeSkip != null && panel == Panel.None) {
                    val (kind, iv) = activeSkip
                    val label = when (kind) {
                        "intro" -> "Skip intro"
                        "credits" -> "Skip credits"
                        "recap" -> "Skip recap"
                        "preview" -> "Skip preview"
                        else -> "Skip"
                    }
                    val remaining = ((iv.endMs - positionMs) / 1000L).coerceAtLeast(0L)
                    Box(
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .padding(end = 20.dp)
                            .clip(RoundedCornerShape(14.dp))
                            .background(Color.Black.copy(alpha = 0.72f))
                            .border(1.dp, Color.White.copy(alpha = 0.14f), RoundedCornerShape(14.dp))
                            .clickable { skipTo(iv.endMs) }
                            .padding(horizontal = 14.dp, vertical = 12.dp),
                    ) {
                        Column {
                            Text(
                                kind.uppercase(),
                                color = Color.White.copy(alpha = 0.45f),
                                fontSize = 10.sp,
                                fontWeight = FontWeight.Bold,
                                letterSpacing = 1.sp,
                            )
                            Text(label, color = PlayerChrome.Paper, fontWeight = FontWeight.SemiBold)
                            Text(
                                "${remaining}s",
                                color = Color.White.copy(alpha = 0.55f),
                                fontSize = 11.sp,
                            )
                        }
                    }
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp, vertical = 14.dp),
                ) {
                    val dur = durationMs.coerceAtLeast(1L).toFloat()
                    val progress = if (scrubbing) scrubValue else (positionMs / dur).coerceIn(0f, 1f)
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(formatClock(positionMs), color = PlayerChrome.Graphite, fontSize = 12.sp)
                        Text(
                            "−${formatClock((durationMs - positionMs).coerceAtLeast(0L))}",
                            color = PlayerChrome.Graphite,
                            fontSize = 12.sp,
                        )
                    }
                    Box(modifier = Modifier.fillMaxWidth()) {
                        if (durationMs > 0 && !skipTimes.isEmpty) {
                            SkipMarkers(skipTimes = skipTimes, durationMs = durationMs)
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
                    }
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        ToolChip(
                            icon = Icons.Rounded.Hd,
                            label = shortQuality(qualityLabel),
                            active = panel == Panel.Quality,
                            onClick = {
                                panel = if (panel == Panel.Quality) Panel.None else Panel.Quality
                                controlsVisible = true
                            },
                        )
                        ToolChip(
                            icon = Icons.Rounded.ClosedCaption,
                            label = subLabel,
                            active = panel == Panel.Subs || panel == Panel.Style,
                            onClick = {
                                panel = if (panel == Panel.Subs || panel == Panel.Style) {
                                    Panel.None
                                } else {
                                    Panel.Subs
                                }
                                controlsVisible = true
                            },
                        )
                        ToolChip(
                            icon = Icons.Rounded.Settings,
                            label = resizeLabel(resizeMode),
                            active = panel == Panel.Display,
                            onClick = {
                                panel = if (panel == Panel.Display) Panel.None else Panel.Display
                                controlsVisible = true
                            },
                        )
                        Spacer(modifier = Modifier.weight(1f))
                        if (!skipTimes.isEmpty) {
                            Text("Timestamps", color = PlayerChrome.Faint, fontSize = 11.sp)
                        }
                    }
                }

                if (panel != Panel.None) {
                    PlayerSheet(
                        modifier = Modifier
                            .align(Alignment.CenterEnd)
                            .fillMaxHeight()
                            .widthIn(max = 320.dp)
                            .padding(vertical = 12.dp, horizontal = 10.dp),
                        onDismiss = { panel = Panel.None },
                    ) {
                        when (panel) {
                            Panel.Quality -> QualitySheet(
                                sources = sources,
                                selected = sourceIndex,
                                onPick = ::pickQuality,
                            )
                            Panel.Subs -> SubsSheet(
                                enabled = subsEnabled,
                                options = textOptions,
                                selectedId = selectedTextId,
                                onToggle = {
                                    subsEnabled = it
                                    if (!it) selectedTextId = "off"
                                    else if (selectedTextId == "off") selectedTextId = "auto"
                                },
                                onPick = {
                                    selectedTextId = it
                                    subsEnabled = it != "off"
                                },
                                onOpenStyle = { panel = Panel.Style },
                            )
                            Panel.Style -> StyleSheet(
                                style = subStyle,
                                onChange = { subStyle = it },
                                onBack = { panel = Panel.Subs },
                            )
                            Panel.Display -> DisplaySheet(
                                resizeMode = resizeMode,
                                immersive = immersive,
                                onResize = { resizeMode = it },
                                onImmersive = { immersive = it },
                            )
                            Panel.None -> Unit
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun PlayerSheet(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit,
    content: @Composable () -> Unit,
) {
    Box(
        modifier = modifier
            .clip(RoundedCornerShape(18.dp))
            .background(Color(0xF0121212))
            .border(1.dp, Color.White.copy(alpha = 0.12f), RoundedCornerShape(18.dp))
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = { /* absorb */ },
            )
            .padding(16.dp),
    ) {
        Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
            content()
        }
    }
}

@Composable
private fun QualitySheet(
    sources: List<PlayableSource>,
    selected: Int,
    onPick: (Int) -> Unit,
) {
    SheetTitle("Quality")
    Spacer(modifier = Modifier.height(10.dp))
    if (sources.isEmpty()) {
        Text("No sources", color = PlayerChrome.Graphite, fontSize = 13.sp)
        return
    }
    sources.forEachIndexed { index, src ->
        SheetRow(
            label = src.label,
            selected = index == selected,
            onClick = { onPick(index) },
        )
    }
}

@Composable
private fun SubsSheet(
    enabled: Boolean,
    options: List<TextOption>,
    selectedId: String,
    onToggle: (Boolean) -> Unit,
    onPick: (String) -> Unit,
    onOpenStyle: () -> Unit,
) {
    SheetTitle("Subtitles")
    Spacer(modifier = Modifier.height(10.dp))
    SheetRow(
        label = "Off",
        selected = !enabled || selectedId == "off",
        onClick = { onToggle(false) },
    )
    SheetRow(
        label = "Auto",
        selected = enabled && selectedId == "auto",
        onClick = {
            onToggle(true)
            onPick("auto")
        },
    )
    options.filter { it.id != "off" && it.id != "auto" }.forEach { opt ->
        SheetRow(
            label = opt.label,
            selected = enabled && selectedId == opt.id,
            onClick = {
                onToggle(true)
                onPick(opt.id)
            },
        )
    }
    if (options.none { it.id != "off" && it.id != "auto" }) {
        Text(
            "No external caption files on this stream — Auto uses embedded tracks when available.",
            color = PlayerChrome.Faint,
            fontSize = 12.sp,
            modifier = Modifier.padding(vertical = 8.dp),
        )
    }
    Spacer(modifier = Modifier.height(8.dp))
    SheetRow(label = "Customize appearance…", selected = false, onClick = onOpenStyle)
}

@Composable
private fun StyleSheet(
    style: SubStyle,
    onChange: (SubStyle) -> Unit,
    onBack: () -> Unit,
) {
    val previewSp = (11f + (style.sizeFraction - SUB_SIZE_MIN) /
        (SUB_SIZE_MAX - SUB_SIZE_MIN) * 14f).coerceIn(11f, 26f)
    SheetTitle("Caption style")
    Text(
        "Back to tracks",
        color = PlayerChrome.Accent,
        fontSize = 12.sp,
        modifier = Modifier
            .padding(top = 4.dp, bottom = 10.dp)
            .clickable(onClick = onBack),
    )
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Size", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(
            "${(style.sizeFraction * 100f).toInt()}% of frame",
            color = PlayerChrome.Faint,
            fontSize = 11.sp,
        )
    }
    Spacer(modifier = Modifier.height(4.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(
            0.028f to "XS",
            0.036f to "S",
            DEFAULT_SUB_SIZE_FRACTION to "M",
            0.055f to "L",
            0.068f to "XL",
        ).forEach { (frac, label) ->
            ChoicePill(
                label = label,
                selected = kotlin.math.abs(style.sizeFraction - frac) < 0.002f,
                onClick = { onChange(style.copy(sizeFraction = frac)) },
            )
        }
    }
    Slider(
        value = style.sizeFraction,
        onValueChange = { onChange(style.copy(sizeFraction = it)) },
        valueRange = SUB_SIZE_MIN..SUB_SIZE_MAX,
        colors = SliderDefaults.colors(
            thumbColor = PlayerChrome.Paper,
            activeTrackColor = PlayerChrome.Paper,
            inactiveTrackColor = PlayerChrome.Faint,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(modifier = Modifier.height(6.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Position", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(
            if (style.bottomPad <= 0.05f) "Lower" else if (style.bottomPad >= 0.14f) "Higher" else "Mid",
            color = PlayerChrome.Faint,
            fontSize = 11.sp,
        )
    }
    Slider(
        value = style.bottomPad,
        onValueChange = { onChange(style.copy(bottomPad = it)) },
        valueRange = SUB_BOTTOM_MIN..SUB_BOTTOM_MAX,
        colors = SliderDefaults.colors(
            thumbColor = PlayerChrome.Paper,
            activeTrackColor = PlayerChrome.Paper,
            inactiveTrackColor = PlayerChrome.Faint,
        ),
        modifier = Modifier.fillMaxWidth(),
    )
    Spacer(modifier = Modifier.height(10.dp))
    Text("Color", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    Spacer(modifier = Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(
            AndroidColor.WHITE to "White",
            AndroidColor.YELLOW to "Yellow",
            AndroidColor.CYAN to "Cyan",
            AndroidColor.rgb(255, 200, 120) to "Warm",
        ).forEach { (c, label) ->
            ChoicePill(
                label = label,
                selected = style.color == c,
                onClick = { onChange(style.copy(color = c)) },
            )
        }
    }
    Spacer(modifier = Modifier.height(14.dp))
    Text("Background", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    Spacer(modifier = Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ChoicePill(
            label = "On",
            selected = style.background,
            onClick = { onChange(style.copy(background = true)) },
        )
        ChoicePill(
            label = "Off",
            selected = !style.background,
            onClick = { onChange(style.copy(background = false)) },
        )
    }
    Spacer(modifier = Modifier.height(14.dp))
    Text("Outline", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    Spacer(modifier = Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf(
            CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW to "Shadow",
            CaptionStyleCompat.EDGE_TYPE_OUTLINE to "Outline",
            CaptionStyleCompat.EDGE_TYPE_NONE to "None",
        ).forEach { (edge, label) ->
            ChoicePill(
                label = label,
                selected = style.edgeType == edge,
                onClick = { onChange(style.copy(edgeType = edge)) },
            )
        }
    }
    Spacer(modifier = Modifier.height(16.dp))
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(12.dp))
            .background(Color.Black.copy(alpha = 0.55f))
            .padding(14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            "Preview · 字幕サンプル",
            color = Color(style.color),
            fontSize = previewSp.sp,
            fontWeight = FontWeight.Medium,
            modifier = if (style.background) {
                Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color.Black.copy(alpha = 0.72f))
                    .padding(horizontal = 8.dp, vertical = 4.dp)
            } else {
                Modifier
            },
        )
    }
}

@Composable
private fun DisplaySheet(
    resizeMode: Int,
    immersive: Boolean,
    onResize: (Int) -> Unit,
    onImmersive: (Boolean) -> Unit,
) {
    SheetTitle("Display")
    Spacer(modifier = Modifier.height(10.dp))
    SheetRow(
        label = "Fit (letterbox)",
        selected = resizeMode == AspectRatioFrameLayout.RESIZE_MODE_FIT,
        onClick = { onResize(AspectRatioFrameLayout.RESIZE_MODE_FIT) },
    )
    SheetRow(
        label = "Fill (crop)",
        selected = resizeMode == AspectRatioFrameLayout.RESIZE_MODE_ZOOM,
        onClick = { onResize(AspectRatioFrameLayout.RESIZE_MODE_ZOOM) },
    )
    SheetRow(
        label = "Stretch",
        selected = resizeMode == AspectRatioFrameLayout.RESIZE_MODE_FILL,
        onClick = { onResize(AspectRatioFrameLayout.RESIZE_MODE_FILL) },
    )
    Spacer(modifier = Modifier.height(8.dp))
    SheetRow(
        label = if (immersive) "System bars hidden" else "Show system bars",
        selected = immersive,
        onClick = { onImmersive(!immersive) },
    )
}

@Composable
private fun SheetTitle(text: String) {
    Text(
        text,
        color = PlayerChrome.Paper,
        fontWeight = FontWeight.SemiBold,
        fontSize = 15.sp,
        letterSpacing = 0.2.sp,
    )
}

@Composable
private fun SheetRow(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(10.dp))
            .background(if (selected) Color.White.copy(alpha = 0.12f) else Color.Transparent)
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 11.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            label,
            color = if (selected) PlayerChrome.Paper else PlayerChrome.Graphite,
            fontWeight = if (selected) FontWeight.SemiBold else FontWeight.Normal,
            fontSize = 14.sp,
            modifier = Modifier.weight(1f),
        )
        if (selected) {
            Text("●", color = PlayerChrome.Accent, fontSize = 10.sp)
        }
    }
}

@Composable
private fun ChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    Box(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (selected) PlayerChrome.Paper else Color.White.copy(alpha = 0.08f))
            .border(
                1.dp,
                if (selected) PlayerChrome.Paper else Color.White.copy(alpha = 0.12f),
                RoundedCornerShape(999.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 12.dp, vertical = 7.dp),
    ) {
        Text(
            label,
            color = if (selected) PlayerChrome.Ink else PlayerChrome.Paper,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
        )
    }
}

@Composable
private fun ToolChip(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    label: String,
    active: Boolean,
    onClick: () -> Unit,
) {
    Row(
        modifier = Modifier
            .clip(RoundedCornerShape(999.dp))
            .background(if (active) PlayerChrome.Paper else Color.White.copy(alpha = 0.1f))
            .border(
                1.dp,
                if (active) PlayerChrome.Paper else Color.White.copy(alpha = 0.12f),
                RoundedCornerShape(999.dp),
            )
            .clickable(onClick = onClick)
            .padding(horizontal = 11.dp, vertical = 7.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(6.dp),
    ) {
        Icon(
            icon,
            contentDescription = null,
            tint = if (active) PlayerChrome.Ink else PlayerChrome.Paper,
            modifier = Modifier.size(16.dp),
        )
        Text(
            label,
            color = if (active) PlayerChrome.Ink else PlayerChrome.Paper,
            fontSize = 12.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
    }
}

@Composable
private fun SkipMarkers(skipTimes: SkipTimes, durationMs: Long) {
    val dur = durationMs.coerceAtLeast(1L).toFloat()
    BoxWithConstraints(
        modifier = Modifier
            .fillMaxWidth()
            .height(18.dp)
            .padding(top = 10.dp),
    ) {
        val track = maxWidth
        skipTimes.segments.forEach { (kind, iv) ->
            val start = (iv.startMs / dur).coerceIn(0f, 1f)
            val end = (iv.endMs / dur).coerceIn(0f, 1f)
            val color = when (kind) {
                "intro" -> Color(0xFF93C5FD)
                "credits" -> Color(0xFFFDBA74)
                "recap" -> Color(0xFFC4B5FD)
                else -> Color.White.copy(alpha = 0.45f)
            }
            Box(
                modifier = Modifier
                    .offset(x = track * start)
                    .width(track * (end - start).coerceAtLeast(0.012f))
                    .height(3.dp)
                    .align(Alignment.CenterStart)
                    .clip(RoundedCornerShape(999.dp))
                    .background(color.copy(alpha = 0.9f)),
            )
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

@OptIn(UnstableApi::class)
private fun subtitleConfig(track: SubtitleTrack): MediaItem.SubtitleConfiguration? {
    if (!track.url.startsWith("http")) return null
    val mime = track.mimeType
        ?: when {
            track.url.contains(".vtt", ignoreCase = true) -> MimeTypes.TEXT_VTT
            track.url.contains(".srt", ignoreCase = true) -> MimeTypes.APPLICATION_SUBRIP
            track.url.contains(".ass", ignoreCase = true) ||
                track.url.contains(".ssa", ignoreCase = true) -> MimeTypes.TEXT_SSA
            else -> MimeTypes.TEXT_VTT
        }
    return MediaItem.SubtitleConfiguration.Builder(android.net.Uri.parse(track.url))
        .setMimeType(mime)
        .setLanguage(track.language ?: "und")
        .setLabel(track.label)
        .setSelectionFlags(C.SELECTION_FLAG_DEFAULT)
        .build()
}

@OptIn(UnstableApi::class)
private fun buildTextOptions(tracks: Tracks, external: List<SubtitleTrack>): List<TextOption> {
    val out = ArrayList<TextOption>()
    out += TextOption(id = "off", label = "Off")
    out += TextOption(id = "auto", label = "Auto")
    var externalIdx = 0
    tracks.groups.forEachIndexed { gi, group ->
        if (group.type != C.TRACK_TYPE_TEXT) return@forEachIndexed
        for (ti in 0 until group.length) {
            if (!group.isTrackSupported(ti)) continue
            val format: Format = group.getTrackFormat(ti)
            val label = format.label
                ?: format.language?.uppercase(Locale.US)
                ?: external.getOrNull(externalIdx)?.label
                ?: "Track ${out.size - 1}"
            externalIdx++
            out += TextOption(
                id = "g${gi}_t$ti",
                label = label,
                mediaGroup = group.mediaTrackGroup,
                trackIndex = ti,
            )
        }
    }
    return out
}

@OptIn(UnstableApi::class)
private fun applyTextSelection(
    selector: DefaultTrackSelector,
    selectedId: String,
    options: List<TextOption>,
    enabled: Boolean,
) {
    val params = selector.buildUponParameters()
        .clearOverridesOfType(C.TRACK_TYPE_TEXT)
    if (!enabled || selectedId == "off") {
        selector.parameters = params
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            .build()
        return
    }
    params.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
    val opt = options.firstOrNull { it.id == selectedId }
    val mediaGroup = opt?.mediaGroup
    if (mediaGroup != null) {
        params.setOverrideForType(
            TrackSelectionOverride(mediaGroup, listOf(opt.trackIndex)),
        )
    }
    selector.parameters = params.build()
}

@OptIn(UnstableApi::class)
private fun applyCaptionStyle(playerView: PlayerView?, style: SubStyle) {
    val view = playerView?.subtitleView ?: return
    val bg = if (style.background) AndroidColor.argb(160, 0, 0, 0) else AndroidColor.TRANSPARENT
    val window = AndroidColor.TRANSPARENT
    // Prefer a readable regular weight — bold + huge size was blowing out phones.
    view.setStyle(
        CaptionStyleCompat(
            style.color,
            bg,
            window,
            style.edgeType,
            AndroidColor.BLACK,
            Typeface.DEFAULT,
        ),
    )
    // Fractional size tracks the player viewport, so landscape phones and tablets
    // get captions that fit the frame instead of a fixed oversized sp value.
    val fraction = style.sizeFraction.coerceIn(SUB_SIZE_MIN, SUB_SIZE_MAX)
    view.setFixedTextSize(Cue.TEXT_SIZE_TYPE_FRACTIONAL_IGNORE_PADDING, fraction)
    view.setBottomPaddingFraction(style.bottomPad.coerceIn(SUB_BOTTOM_MIN, SUB_BOTTOM_MAX))
}

private fun loadSubStyle(prefs: android.content.SharedPreferences): SubStyle {
    val storedFrac = if (prefs.contains("sub_size_frac")) {
        prefs.getFloat("sub_size_frac", DEFAULT_SUB_SIZE_FRACTION)
    } else {
        // Migrate old absolute-sp preference into a viewport fraction.
        val legacySp = prefs.getFloat("sub_size", -1f)
        when {
            legacySp < 0f -> DEFAULT_SUB_SIZE_FRACTION
            legacySp <= 16f -> 0.028f
            legacySp <= 20f -> 0.036f
            legacySp <= 24f -> DEFAULT_SUB_SIZE_FRACTION
            legacySp <= 30f -> 0.055f
            else -> 0.068f
        }
    }
    return SubStyle(
        sizeFraction = storedFrac.coerceIn(SUB_SIZE_MIN, SUB_SIZE_MAX),
        bottomPad = prefs.getFloat("sub_bottom", DEFAULT_SUB_BOTTOM_PAD)
            .coerceIn(SUB_BOTTOM_MIN, SUB_BOTTOM_MAX),
        color = prefs.getInt("sub_color", AndroidColor.WHITE),
        background = prefs.getBoolean("sub_bg", true),
        edgeType = prefs.getInt("sub_edge", CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW),
    )
}

private const val DEFAULT_SUB_SIZE_FRACTION = 0.042f
private const val SUB_SIZE_MIN = 0.024f
private const val SUB_SIZE_MAX = 0.08f
private const val DEFAULT_SUB_BOTTOM_PAD = 0.06f
private const val SUB_BOTTOM_MIN = 0.02f
private const val SUB_BOTTOM_MAX = 0.22f

private fun shortQuality(label: String): String {
    val m = Regex("""(\d{3,4}p)""", RegexOption.IGNORE_CASE).find(label)
    return m?.groupValues?.get(1) ?: label.take(12)
}

private fun resizeLabel(mode: Int): String = when (mode) {
    AspectRatioFrameLayout.RESIZE_MODE_ZOOM -> "Fill"
    AspectRatioFrameLayout.RESIZE_MODE_FILL -> "Stretch"
    else -> "Fit"
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
