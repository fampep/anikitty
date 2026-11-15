// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.player

import android.app.Activity
import android.app.PictureInPictureParams
import android.content.pm.ActivityInfo
import android.content.pm.PackageManager
import android.os.Build
import android.util.Rational
import android.widget.Toast
import android.graphics.Color as AndroidColor
import android.graphics.Typeface
import android.view.ViewGroup
import android.view.WindowManager
import android.widget.FrameLayout
import androidx.activity.compose.BackHandler
import androidx.annotation.OptIn
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.focusable
import androidx.compose.animation.core.animate
import androidx.compose.foundation.gestures.awaitEachGesture
import androidx.compose.foundation.gestures.awaitFirstDown
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.gestures.detectVerticalDragGestures
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.interaction.MutableInteractionSource
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxWithConstraints
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.displayCutout
import androidx.compose.foundation.layout.fillMaxHeight
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.union
import androidx.compose.foundation.layout.navigationBars
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
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material.icons.rounded.CastConnected
import androidx.compose.material.icons.rounded.Check
import androidx.compose.material.icons.rounded.Close
import androidx.compose.material.icons.outlined.Forward10
import androidx.compose.material.icons.outlined.FullscreenExit
import androidx.compose.material.icons.outlined.LockOpen
import androidx.compose.material.icons.outlined.Pause
import androidx.compose.material.icons.outlined.PhotoCamera
import androidx.compose.material.icons.outlined.PictureInPicture
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.Replay10
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material.icons.automirrored.outlined.VolumeOff
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.rounded.Fullscreen
import androidx.compose.material.icons.rounded.PictureInPicture
import androidx.compose.material.icons.rounded.Settings
import androidx.media3.cast.SessionAvailabilityListener
import site.anikitty.app.cast.CastSessionHelper
import site.anikitty.app.ui.components.EpisodeCarousel
import site.anikitty.app.ui.components.EpisodeSlide
import site.anikitty.app.ui.theme.KittyDarkPalette
import site.anikitty.app.ui.theme.KittyHaptics
import site.anikitty.app.ui.theme.LocalKittyPalette
import site.anikitty.app.ui.theme.LookState
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.CompositionLocalProvider
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableLongStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.clipToBounds
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Shadow
import androidx.compose.ui.semantics.clearAndSetSemantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.draw.scale
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.focus.FocusRequester
import androidx.compose.ui.focus.focusProperties
import androidx.compose.ui.focus.focusRequester
import androidx.compose.ui.focus.onFocusChanged
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.key.Key
import androidx.compose.ui.input.key.KeyEventType
import androidx.compose.ui.input.key.key
import androidx.compose.ui.input.key.onPreviewKeyEvent
import androidx.compose.ui.input.key.type
import androidx.compose.ui.input.pointer.PointerEventPass
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontStyle
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
import androidx.media3.common.PlaybackParameters
import androidx.media3.common.Player
import androidx.media3.common.TrackGroup
import androidx.media3.common.TrackSelectionOverride
import androidx.media3.common.Tracks
import androidx.media3.common.text.Cue
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.DefaultDataSource
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.source.DefaultMediaSourceFactory
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import androidx.media3.ui.AspectRatioFrameLayout
import androidx.media3.ui.CaptionStyleCompat
import androidx.media3.ui.PlayerView
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withTimeoutOrNull
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.servers.GotakuObfDataSource
import site.anikitty.app.data.servers.FlixUnwrapDataSource
import site.anikitty.app.data.servers.PlaybackHttp
import site.anikitty.app.data.servers.PlayableSource
import site.anikitty.app.data.servers.SegmentStripDataSource
import site.anikitty.app.data.servers.SubtitleTrack
import site.anikitty.app.data.skip.SkipTimes
import site.anikitty.app.ui.theme.KittyInk
import site.anikitty.app.ui.app.spacePress
import site.anikitty.app.ui.theme.PlayerChrome
import java.util.Locale
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private enum class Panel { None, Quality, Subs, Style, Display, Speed, Sleep }

/** Soft “next episode?” offer when this much remains. */
private const val NEAR_END_THRESHOLD_MS = 90_000L
/** Ignore tiny clips / trailers for the near-end offer. */
private const val NEAR_END_MIN_DURATION_MS = 120_000L
private const val AUTOPLAY_COUNTDOWN_SEC = 10

/** Caption backdrop: none, soft tint, solid box, or frosted/blurred glass look. */
private enum class SubBgMode { None, Soft, Solid, Blur }

/**
 * Fully user-controlled caption look.
 * [sizeSp] is the real text size in sp — no forced “large” floor.
 * [bottomPad] is Media3 bottom padding fraction — higher lifts captions up.
 */
private data class SubStyle(
    val sizeSp: Float = DEFAULT_SUB_SIZE_SP,
    val bottomPad: Float = DEFAULT_SUB_BOTTOM_PAD,
    val color: Int = AndroidColor.rgb(242, 242, 242),
    val bgMode: SubBgMode = SubBgMode.None,
    val edgeType: Int = CaptionStyleCompat.EDGE_TYPE_OUTLINE,
    val bold: Boolean = false,
    val italic: Boolean = true,
    val bgAlpha: Float = 0.55f,
)

private data class TextOption(
    val id: String,
    val label: String,
    /** null = off/auto (no hard override) */
    val mediaGroup: TrackGroup? = null,
    val trackIndex: Int = 0,
)

/** HLS / progressive video variants the user can lock (1080p, 720p, …). */
private data class VideoOption(
    val id: String,
    val label: String,
    val height: Int = 0,
    val width: Int = 0,
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
    titleHint: String? = null,
    loadSkip: suspend (anilistId: Int, episode: Int, titleHint: String?) -> SkipTimes =
        { _, _, _ -> SkipTimes() },
    startPositionMs: Long = 0L,
    onClose: () -> Unit,
    onDismiss: () -> Unit = onClose,
    onToggleWatched: ((Int) -> Unit)? = null,
    onNextEpisode: (() -> Unit)? = null,
    onProgress: ((positionMs: Long, durationMs: Long) -> Unit)? = null,
    totalEpisodes: Int = 1,
    watchedThrough: Int = 0,
    audio: String = "sub",
    isMovie: Boolean = false,
    onPickEpisode: ((Int) -> Unit)? = null,
    onPickAudio: ((String) -> Unit)? = null,
    episodeSlides: List<EpisodeSlide> = emptyList(),
    fallbackArt: String? = null,
    stageModifier: Modifier = Modifier,
) {
    val context = LocalContext.current
    val activity = context as? Activity
    val view = LocalView.current
    var error by remember { mutableStateOf<String?>(null) }
    var ready by remember { mutableStateOf(false) }
    var playing by remember { mutableStateOf(true) }
    var controlsVisible by remember { mutableStateOf(true) }
    var chromeFocused by remember { mutableStateOf(false) }
    var positionMs by remember { mutableLongStateOf(0L) }
    var durationMs by remember { mutableLongStateOf(0L) }
    var scrubbing by remember { mutableStateOf(false) }
    var scrubValue by remember { mutableFloatStateOf(0f) }
    var playAttempt by remember { mutableIntStateOf(0) }
    var sourceIndex by remember(sources, playAttempt) { mutableIntStateOf(0) }
    var skipTimes by remember { mutableStateOf(SkipTimes()) }
    var autoSkippedRecap by remember { mutableStateOf(false) }
    var didSeekStart by remember { mutableStateOf(false) }
    var resumeAtMs by remember { mutableLongStateOf(startPositionMs) }
    /** True until the first successful resume seek or a user quality pick. */
    var allowHistoryFallback by remember { mutableStateOf(true) }
    var panel by remember { mutableStateOf(Panel.None) }
    var immersive by remember { mutableStateOf(true) }
    var resizeMode by remember {
        mutableIntStateOf(
            context.getSharedPreferences("anikitty_player", 0)
                .getInt("resize_mode", AspectRatioFrameLayout.RESIZE_MODE_FIT),
        )
    }
    var subStyle by remember {
        mutableStateOf(
            loadSubStyle(context.getSharedPreferences("anikitty_player", 0)),
        )
    }
    var subsEnabled by remember { mutableStateOf(true) }
    var selectedTextId by remember { mutableStateOf("auto") }
    var textOptions by remember { mutableStateOf<List<TextOption>>(emptyList()) }
    var selectedVideoId by remember { mutableStateOf("auto") }
    var videoOptions by remember { mutableStateOf<List<VideoOption>>(emptyList()) }
    var playerViewRef by remember { mutableStateOf<PlayerView?>(null) }
    val playerPrefs = remember { context.getSharedPreferences("anikitty_player", 0) }
    var playbackSpeed by remember {
        mutableFloatStateOf(playerPrefs.getFloat("playback_speed", 1f).coerceIn(0.5f, 2f))
    }
    var autoNext by remember { mutableStateOf(playerPrefs.getBoolean("auto_next", true)) }
    var holdBoost by remember { mutableStateOf(false) }
    var gestureHud by remember { mutableStateOf<Pair<String, Float>?>(null) }
    var controlsLocked by remember { mutableStateOf(false) }
    var seekFlashDir by remember { mutableIntStateOf(0) } // -1 left, +1 right, 0 none
    var isCasting by remember { mutableStateOf(false) }
    var castHint by remember { mutableStateOf<String?>(null) }
    // Next-episode UX: soft offer near the end, then 10s autoplay once ended.
    var nearEndDismissed by remember(episode) { mutableStateOf(false) }
    var playbackEnded by remember(episode) { mutableStateOf(false) }
    var autoplayCancelled by remember(episode) { mutableStateOf(false) }
    var autoplaySecLeft by remember(episode) { mutableIntStateOf(AUTOPLAY_COUNTDOWN_SEC) }
    var nextTriggered by remember(episode) { mutableStateOf(false) }
    /** 0 off, positive minutes, -1 pause when this episode ends. */
    var sleepChoice by remember { mutableIntStateOf(0) }
    var sleepArmedAt by remember { mutableLongStateOf(0L) }
    var sleepTick by remember { mutableIntStateOf(0) }
    var sleepNote by remember { mutableStateOf<String?>(null) }

    val source = sources.getOrNull(sourceIndex)
    val stripBytes = remember { AtomicInteger(SegmentStripDataSource.DEFAULT_STRIP_BYTES) }
    val castHelper = remember { CastSessionHelper.create(context.applicationContext) }

    var theater by remember { mutableStateOf(playerPrefs.getBoolean("start_theater", false)) }
    var muted by remember { mutableStateOf(false) }

    fun closePanelOrExit() {
        if (panel != Panel.None) {
            panel = Panel.None
        } else if (theater) {
            theater = false
        } else {
            onClose()
        }
    }

    BackHandler(onBack = { closePanelOrExit() })

    DisposableEffect(theater) {
        val previous = activity?.requestedOrientation
        activity?.requestedOrientation = if (theater) {
            ActivityInfo.SCREEN_ORIENTATION_SENSOR_LANDSCAPE
        } else {
            ActivityInfo.SCREEN_ORIENTATION_PORTRAIT
        }
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
            if (immersive && theater) {
                controller.hide(WindowInsetsCompat.Type.systemBars())
                controller.systemBarsBehavior =
                    WindowInsetsControllerCompat.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            } else {
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
            onDispose {
                // Keep edge-to-edge (MainActivity.enableEdgeToEdge); only restore bars.
                controller.show(WindowInsetsCompat.Type.systemBars())
            }
        }
    }

    // Fresh DefaultTrackSelector per ExoPlayer — release() owns the selector, so a
    // remembered shared instance would be detached after the first quality switch.
    val playerBundle = remember(source?.url, source?.subtitles, source?.gotakuObf, playAttempt) {
        if (source == null) return@remember null
        val httpFactory = PlaybackHttp.factory(
            headers = source.headers,
            userAgent = source.headers["User-Agent"] ?: DEFAULT_UA,
        )
        val gotakuFactory = GotakuObfDataSource.Factory(httpFactory).also {
            it.updateObf(source.gotakuObf)
        }
        val flixFactory = FlixUnwrapDataSource.Factory(
            gotakuFactory,
            java.util.concurrent.atomic.AtomicReference(source.flix),
        )
        // Gotaku and reanime must not inherit MegaPlay's default PNG strip.
        stripBytes.set(
            when {
                source.gotakuObf != null || source.flix != null -> source.stripBytes.coerceAtLeast(0)
                source.stripBytes > 0 -> source.stripBytes
                else -> SegmentStripDataSource.DEFAULT_STRIP_BYTES
            },
        )
        val localFile = source.url.startsWith("file:") ||
            source.url.startsWith("android.resource:") ||
            source.url.startsWith("content:")
        val factory = if (localFile) {
            DefaultDataSource.Factory(context)
        } else {
            SegmentStripDataSource.Factory(flixFactory, stripBytes = stripBytes)
        }
        val loadControl = DefaultLoadControl.Builder()
            .setBufferDurationsMs(2_500, 40_000, 1_500, 2_000)
            .build()
        val selector = DefaultTrackSelector(context).apply {
            parameters = buildUponParameters()
                .setPreferredTextLanguage("en")
                .setSelectUndeterminedTextLanguage(true)
                .build()
        }
        val exo = ExoPlayer.Builder(context)
            .setMediaSourceFactory(DefaultMediaSourceFactory(factory))
            .setLoadControl(loadControl)
            .setTrackSelector(selector)
            .build()
            .apply {
                val itemBuilder = MediaItem.Builder().setUri(source.url)
                // Gotaku CDN playlists have no .m3u8 suffix but are HLS after unwrap.
                if (source.url.contains(".m3u8", ignoreCase = true) || source.gotakuObf != null) {
                    itemBuilder.setMimeType(MimeTypes.APPLICATION_M3U8)
                }
                val configs = source.subtitles.mapIndexedNotNull { index, track ->
                    subtitleConfig(track, default = index == 0)
                }
                if (configs.isNotEmpty()) {
                    itemBuilder.setSubtitleConfigurations(configs)
                }
                setMediaItem(itemBuilder.build())
                playWhenReady = true
                videoScalingMode = C.VIDEO_SCALING_MODE_SCALE_TO_FIT
                playbackParameters = PlaybackParameters(playbackSpeed)
                prepare()
            }
        PlayerBundle(exo, selector)
    }
    val player = playerBundle?.player
    val trackSelector = playerBundle?.trackSelector
    val activePlayer: Player? = if (isCasting) castHelper?.castPlayer else player
    val latestPlayer by rememberUpdatedState(player)
    val latestSources by rememberUpdatedState(sources)
    val latestSourceIndex by rememberUpdatedState(sourceIndex)
    val latestTitle by rememberUpdatedState(title)
    val latestEpisode by rememberUpdatedState(episode)
    val playhead = remember { Playhead() }
    val latestPosition = playhead
    val latestOnNextEpisode by rememberUpdatedState(onNextEpisode)
    val mutedNow = rememberUpdatedState(muted)

    fun pushMute() {
        val level = if (mutedNow.value) 0f else 1f
        castHelper?.heldVolume = level
        player?.volume = level
        castHelper?.castPlayer?.volume = level
    }

    fun goNextEpisode() {
        if (nextTriggered) return
        val next = latestOnNextEpisode ?: return
        nextTriggered = true
        next()
    }

    var nearEndOffer by remember { mutableStateOf(false) }
    var shownSkip by remember { mutableStateOf<Pair<String, site.anikitty.app.data.skip.SkipInterval>?>(null) }
    var shelfMinutes by remember { mutableIntStateOf(-1) }
    val showEndAutoplay = autoNext &&
        onNextEpisode != null &&
        playbackEnded &&
        !autoplayCancelled &&
        !nextTriggered &&
        sleepChoice != -1

    DisposableEffect(castHelper) {
        val helper = castHelper
        if (helper == null) {
            onDispose { }
        } else {
            val castErrors = object : Player.Listener {
                override fun onPlayerError(error: PlaybackException) {
                    if (!isCasting) return
                    castHint = error.message?.takeIf { it.isNotBlank() }
                        ?: "Chromecast could not play this stream"
                    isCasting = false
                    pushMute()
                    latestPlayer?.play()
                }
            }
            helper.castPlayer.addListener(castErrors)
            helper.setAvailabilityListener(object : SessionAvailabilityListener {
                override fun onCastSessionAvailable() {
                    val src = latestSources.getOrNull(latestSourceIndex) ?: return
                    val local = latestPlayer
                    val pos = local?.currentPosition?.coerceAtLeast(0L) ?: latestPosition.ms
                    local?.pause()
                    isCasting = false
                    castHint = "Connecting to your TV"
                    controlsVisible = true
                    pushMute()
                    helper.load(
                        source = src,
                        title = latestTitle,
                        episode = latestEpisode,
                        positionMs = pos,
                        onReady = {
                            local?.pause()
                            pushMute()
                            isCasting = true
                            castHint = null
                        },
                        onError = { message ->
                            castHint = message
                            isCasting = false
                            pushMute()
                            local?.play()
                        },
                    )
                }

                override fun onCastSessionUnavailable() {
                    val pos = runCatching {
                        helper.castPlayer.currentPosition.coerceAtLeast(0L)
                    }.getOrDefault(latestPosition.ms)
                    helper.stopCasting()
                    isCasting = false
                    val local = latestPlayer
                    if (pos > 1_000L) {
                        local?.seekTo(pos)
                        positionMs = pos
                    }
                    pushMute()
                    local?.play()
                    controlsVisible = true
                }
            })
            onDispose {
                helper.castPlayer.removeListener(castErrors)
                helper.setAvailabilityListener(null)
                helper.release()
            }
        }
    }

    // When quality/episode changes mid-cast, push the new URL to the TV.
    // First load is handled by SessionAvailabilityListener.
    LaunchedEffect(source?.url, episode) {
        if (!isCasting) return@LaunchedEffect
        val helper = castHelper ?: return@LaunchedEffect
        val src = source ?: return@LaunchedEffect
        val pos = helper.castPlayer.currentPosition.coerceAtLeast(0L)
            .takeIf { it > 0L } ?: playhead.ms
        helper.load(
            source = src,
            title = title,
            episode = episode,
            positionMs = pos,
            onReady = {
                latestPlayer?.pause()
                pushMute()
                castHint = null
            },
            onError = { message ->
                castHint = message
                if (castHelper?.casting != true) {
                    isCasting = false
                    pushMute()
                    latestPlayer?.play()
                }
            },
        )
    }

    LaunchedEffect(castHint) {
        val message = castHint ?: return@LaunchedEffect
        if (message != "Connecting to your TV") {
            Toast.makeText(context, message, Toast.LENGTH_LONG).show()
        }
        delay(4_200)
        if (castHint == message) castHint = null
    }

    LaunchedEffect(player, playbackSpeed, holdBoost) {
        val speed = if (holdBoost) 2f else playbackSpeed
        player?.playbackParameters = PlaybackParameters(speed)
    }
    LaunchedEffect(playbackSpeed) {
        playerPrefs.edit().putFloat("playback_speed", playbackSpeed).apply()
    }
    LaunchedEffect(resizeMode) {
        playerPrefs.edit().putInt("resize_mode", resizeMode).apply()
    }

    LaunchedEffect(seekFlashDir) {
        if (seekFlashDir == 0) return@LaunchedEffect
        delay(520)
        seekFlashDir = 0
    }

    DisposableEffect(playerBundle) {
        ready = false
        error = null
        textOptions = emptyList()
        videoOptions = emptyList()
        val activePlayer = playerBundle?.player
        val activeSelector = playerBundle?.trackSelector
        val listener = object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                ready = playbackState == Player.STATE_READY || playbackState == Player.STATE_BUFFERING
                if (playbackState == Player.STATE_READY) {
                    durationMs = activePlayer?.duration?.coerceAtLeast(0L) ?: 0L
                    error = null
                    if (playbackEnded) {
                        // User scrubbed/replayed after end — clear autoplay.
                        playbackEnded = false
                        autoplayCancelled = false
                    }
                    val target = resumeAtMs
                    if (!didSeekStart && target > 1_500L && durationMs > target) {
                        activePlayer?.seekTo(target.coerceAtMost(durationMs - 1_000L))
                        positionMs = target
                        resumeAtMs = 0L
                        didSeekStart = true
                        allowHistoryFallback = false
                    }
                }
                if (playbackState == Player.STATE_ENDED) {
                    playbackEnded = true
                    controlsVisible = true
                }
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                playing = isPlaying
            }

            override fun onTracksChanged(tracks: Tracks) {
                val options = buildTextOptions(tracks, source?.subtitles.orEmpty())
                textOptions = options
                selectedTextId = rematchTextId(selectedTextId, options)
                val vids = buildVideoOptions(tracks)
                videoOptions = vids
                selectedVideoId = rematchVideoId(selectedVideoId, vids)
                if (activeSelector != null) {
                    applyTextSelection(activeSelector, selectedTextId, options, subsEnabled)
                    applyVideoSelection(activeSelector, selectedVideoId, vids)
                }
            }

            override fun onPlayerError(e: PlaybackException) {
                if (sourceIndex + 1 < sources.size) {
                    val pos = activePlayer?.currentPosition?.coerceAtLeast(0L) ?: playhead.ms
                    // Prefer live position, then an in-flight quality resume target,
                    // and only then watch-history — never rewind a quality switch.
                    resumeAtMs = when {
                        pos > 2_000L -> pos
                        resumeAtMs > 2_000L -> resumeAtMs
                        allowHistoryFallback && startPositionMs > 2_000L -> startPositionMs
                        else -> pos.coerceAtLeast(resumeAtMs)
                    }
                    didSeekStart = false
                    sourceIndex += 1
                } else {
                    val cause = e.cause?.message?.takeIf { it.isNotBlank() }
                    error = friendlyFailure(
                        listOfNotNull(e.message, cause).joinToString(" — ")
                            .ifBlank { "Playback failed" },
                    )
                }
            }
        }
        activePlayer?.addListener(listener)
        onDispose {
            activePlayer?.removeListener(listener)
            activePlayer?.release()
        }
    }

    LaunchedEffect(sources, playAttempt) {
        sourceIndex = 0
        resumeAtMs = startPositionMs
        didSeekStart = false
        allowHistoryFallback = true
        if (sources.isEmpty()) error = "No playable source"
    }

    // Parent may load watch-history into startPositionMs after first composition.
    LaunchedEffect(startPositionMs) {
        if (!didSeekStart && allowHistoryFallback && startPositionMs > resumeAtMs) {
            resumeAtMs = startPositionMs
        }
    }

    // Apply resume even if READY already fired before history arrived.
    LaunchedEffect(resumeAtMs, player, ready, didSeekStart) {
        val p = player ?: return@LaunchedEffect
        if (didSeekStart || !ready || resumeAtMs <= 1_500L) return@LaunchedEffect
        val d = p.duration
        if (d <= resumeAtMs) return@LaunchedEffect
        p.seekTo(resumeAtMs.coerceAtMost(d - 1_000L))
        positionMs = resumeAtMs
        resumeAtMs = 0L
        didSeekStart = true
        allowHistoryFallback = false
    }

    LaunchedEffect(subsEnabled, selectedTextId, textOptions, trackSelector) {
        val selector = trackSelector ?: return@LaunchedEffect
        applyTextSelection(selector, selectedTextId, textOptions, subsEnabled)
    }

    LaunchedEffect(selectedVideoId, videoOptions, trackSelector) {
        val selector = trackSelector ?: return@LaunchedEffect
        applyVideoSelection(selector, selectedVideoId, videoOptions)
    }

    LaunchedEffect(subStyle, playerViewRef) {
        applyCaptionStyle(playerViewRef, subStyle)
        context.getSharedPreferences("anikitty_player", 0).edit()
            .putInt("sub_style_v", SUB_STYLE_VERSION)
            .putFloat("sub_size_sp", subStyle.sizeSp)
            .putFloat("sub_bottom", subStyle.bottomPad)
            .putInt("sub_color", subStyle.color)
            .putString("sub_bg_mode", subStyle.bgMode.name)
            .putBoolean("sub_bg", subStyle.bgMode != SubBgMode.None)
            .putInt("sub_edge", subStyle.edgeType)
            .putBoolean("sub_bold", subStyle.bold)
            .putBoolean("sub_italic", subStyle.italic)
            .putFloat("sub_bg_alpha", subStyle.bgAlpha)
            .apply()
    }

    LaunchedEffect(activePlayer, scrubbing, isCasting, nearEndDismissed, playbackEnded, nextTriggered) {
        var lastProgressAt = 0L
        var lastSkipKey: String? = null
        var lastMinute = -2
        val p = activePlayer
        while (p != null) {
            if (!scrubbing) {
                val pos = p.currentPosition.coerceAtLeast(0L)
                playhead.ms = pos
                val d = p.duration
                if (d > 0 && d != durationMs) durationMs = d
                val nowPlaying = p.isPlaying
                if (nowPlaying != playing) playing = nowPlaying
                val nowReady = p.playbackState == Player.STATE_READY ||
                    p.playbackState == Player.STATE_BUFFERING ||
                    isCasting
                if (nowReady != ready) ready = nowReady
                val active = skipTimes.activeAt(pos)
                val skipKey = if (active == null) null else "${active.first}:${active.second.endMs}"
                if (skipKey != lastSkipKey) {
                    lastSkipKey = skipKey
                    shownSkip = active
                }
                if (active != null && !isCasting) {
                    val (kind, iv) = active
                    if (kind == "recap" && !autoSkippedRecap) {
                        autoSkippedRecap = true
                        p.seekTo(iv.endMs)
                        playhead.ms = iv.endMs
                    }
                }
                val dur = if (d > 0) d else durationMs
                val remaining = (dur - pos).coerceAtLeast(0L)
                val offer = onNextEpisode != null &&
                    !playbackEnded &&
                    !nearEndDismissed &&
                    !nextTriggered &&
                    dur >= NEAR_END_MIN_DURATION_MS &&
                    remaining in 1L..NEAR_END_THRESHOLD_MS
                if (offer != nearEndOffer) nearEndOffer = offer
                val mins = if (dur > 30_000L) (remaining / 60_000L).toInt() else -1
                if (mins != lastMinute) {
                    lastMinute = mins
                    shelfMinutes = mins
                }
                if (pos - lastProgressAt >= 2_000L) {
                    lastProgressAt = pos
                    val waitingHistory =
                        !didSeekStart && startPositionMs > 2_000L && pos < startPositionMs - 1_000L
                    if (!waitingHistory) {
                        onProgress?.invoke(pos, dur)
                    }
                }
            }
            delay(250)
        }
    }

    LaunchedEffect(anilistId, episode, titleHint) {
        autoSkippedRecap = false
        val fromSource = sources.firstOrNull { !it.skip.isEmpty }?.skip ?: SkipTimes()
        skipTimes = fromSource
        if (anilistId <= 0 || episode <= 0) return@LaunchedEffect
        val loaded = runCatching { loadSkip(anilistId, episode, titleHint) }.getOrDefault(SkipTimes())
        if (!loaded.isEmpty) skipTimes = loaded
    }

    DisposableEffect(Unit) {
        onDispose {
            onProgress?.invoke(playhead.ms, durationMs)
        }
    }

    LaunchedEffect(nearEndOffer, showEndAutoplay) {
        if (nearEndOffer || showEndAutoplay) {
            controlsVisible = true
        }
    }

    LaunchedEffect(sleepChoice) {
        if (sleepChoice <= 0) return@LaunchedEffect
        val minutes = sleepChoice
        sleepArmedAt = System.currentTimeMillis()
        delay(minutes * 60_000L)
        if (sleepChoice != minutes) return@LaunchedEffect
        latestPlayer?.pause()
        playing = false
        controlsVisible = true
        sleepNote = "Sleep timer paused playback"
        sleepChoice = 0
    }

    LaunchedEffect(sleepChoice) {
        if (sleepChoice <= 0) return@LaunchedEffect
        while (sleepChoice > 0) {
            delay(30_000)
            sleepTick++
        }
    }

    LaunchedEffect(playbackEnded, sleepChoice) {
        if (!playbackEnded || sleepChoice != -1) return@LaunchedEffect
        autoplayCancelled = true
        sleepNote = "Sleep timer stopped at the end of this episode"
        sleepChoice = 0
        controlsVisible = true
    }

    LaunchedEffect(showEndAutoplay, episode, autoplayCancelled, nextTriggered) {
        if (!showEndAutoplay || autoplayCancelled || nextTriggered) return@LaunchedEffect
        for (sec in AUTOPLAY_COUNTDOWN_SEC downTo 1) {
            autoplaySecLeft = sec
            delay(1_000)
            if (autoplayCancelled || !playbackEnded || nextTriggered) return@LaunchedEffect
        }
        goNextEpisode()
    }

    LaunchedEffect(nextTriggered) {
        if (!nextTriggered) return@LaunchedEffect
        // If resolve fails, parent keeps this episode — allow retry.
        delay(15_000)
        nextTriggered = false
    }

    LaunchedEffect(controlsVisible, playing, scrubbing, panel, isCasting, nearEndOffer, showEndAutoplay, chromeFocused) {
        if (nearEndOffer || showEndAutoplay) return@LaunchedEffect
        if (controlsVisible && playing && !scrubbing && panel == Panel.None && !chromeFocused) {
            delay(if (isCasting) 5_500 else 3_600)
            controlsVisible = false
        }
    }

    fun toggleMute() {
        val next = !muted
        muted = next
        val level = if (next) 0f else 1f
        castHelper?.heldVolume = level
        activePlayer?.volume = level
        player?.volume = level
        castHelper?.castPlayer?.volume = level
        controlsVisible = true
    }

    LaunchedEffect(player, muted) {
        pushMute()
    }

    fun seekBy(deltaMs: Long) {
        val p = activePlayer ?: return
        val target = (p.currentPosition + deltaMs).coerceIn(0L, p.duration.coerceAtLeast(0L))
        p.seekTo(target)
        positionMs = target
        playhead.ms = target
        seekFlashDir = if (deltaMs < 0) -1 else 1
        if (!controlsLocked) controlsVisible = true
    }

    fun skipTo(endMs: Long) {
        val p = activePlayer ?: return
        p.seekTo(endMs.coerceIn(0L, p.duration.coerceAtLeast(0L)))
        positionMs = endMs
        playhead.ms = endMs
        controlsVisible = true
    }

    fun pickQuality(index: Int) {
        if (index == sourceIndex || index !in sources.indices) return
        resumeAtMs = activePlayer?.currentPosition?.coerceAtLeast(0L) ?: playhead.ms
        didSeekStart = false
        allowHistoryFallback = false
        // Keep the user's resolution lock across mirror switches when possible.
        sourceIndex = index
        panel = Panel.None
        controlsVisible = true
    }

    val activeSkip = shownSkip
    val qualityLabel = when {
        selectedVideoId != "auto" ->
            videoOptions.firstOrNull { it.id == selectedVideoId }?.label ?: selectedVideoId
        videoOptions.any { it.height >= 1080 } -> "Auto · 1080p"
        videoOptions.any { it.height > 0 } -> {
            val best = videoOptions.filter { it.height > 0 }.maxByOrNull { it.height }
            "Auto · ${best?.label ?: "HD"}"
        }
        else -> source?.label ?: "Quality"
    }
    val subLabel = when {
        !subsEnabled -> "Off"
        selectedTextId == "auto" -> "Auto"
        else -> textOptions.firstOrNull { it.id == selectedTextId }?.label ?: "Subs"
    }
    val audioLabel = if (audio == "dub") "Dub" else "Sub"
    val episodeLine = if (isMovie) "Film · $audioLabel" else "E$episode · $audioLabel"

    fun enterPip() {
        val host = activity ?: return
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return
        if (!host.packageManager.hasSystemFeature(PackageManager.FEATURE_PICTURE_IN_PICTURE)) return
        val params = PictureInPictureParams.Builder()
            .setAspectRatio(Rational(16, 9))
            .build()
        val entered = try {
            host.enterPictureInPictureMode(params)
        } catch (_: IllegalStateException) {
            false
        }
        if (entered) {
            panel = Panel.None
            controlsVisible = false
        }
    }

    @Composable
    fun PanelContents() {
        when (panel) {
            Panel.Quality -> QualitySheet(
                videoOptions = videoOptions,
                selectedVideoId = selectedVideoId,
                onPickVideo = {
                    selectedVideoId = it
                    panel = Panel.None
                    controlsVisible = true
                },
                sources = sources,
                selectedSource = sourceIndex,
                onPickSource = ::pickQuality,
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
                audio = audio,
                onPickAudio = onPickAudio,
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
                onSleep = { panel = Panel.Sleep },
                onLock = {
                    controlsLocked = true
                    panel = Panel.None
                    controlsVisible = false
                },
                onQuality = { panel = Panel.Quality },
                onAudio = { panel = Panel.Subs },
                onSpeed = { panel = Panel.Speed },
                onEpisodes = {
                    panel = Panel.None
                    theater = false
                },
                onNext = { goNextEpisode() },
                nextEnabled = onNextEpisode != null && episode < totalEpisodes,
            )
            Panel.Speed -> SpeedSheet(
                speed = playbackSpeed,
                onPick = {
                    playbackSpeed = it
                    panel = Panel.None
                },
            )
            Panel.Sleep -> SleepSheet(
                choice = sleepChoice,
                onPick = {
                    sleepNote = null
                    sleepChoice = it
                    panel = Panel.None
                },
            )
            Panel.None -> Unit
        }
    }

    @Composable
    fun VideoStage(modifier: Modifier) {
        Box(
        modifier = modifier
            .clipToBounds()
            .background(KittyInk)
            .onFocusChanged { chromeFocused = it.hasFocus }
            .focusProperties { canFocus = panel == Panel.None && !controlsVisible }
            .focusable()
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                val showChrome = {
                    if (!controlsLocked) controlsVisible = true
                }
                when (event.key) {
                    Key.MediaPlay -> {
                        activePlayer?.play()
                        showChrome()
                        true
                    }
                    Key.MediaPause -> {
                        activePlayer?.pause()
                        showChrome()
                        true
                    }
                    Key.MediaPlayPause -> {
                        activePlayer?.let { if (it.isPlaying) it.pause() else it.play() }
                        showChrome()
                        true
                    }
                    Key.MediaRewind, Key.MediaPrevious -> {
                        seekBy(-10_000)
                        true
                    }
                    Key.MediaFastForward, Key.MediaNext -> {
                        seekBy(10_000)
                        true
                    }
                    Key.DirectionLeft -> {
                        if (!controlsVisible) {
                            if (controlsLocked) controlsVisible = true else seekBy(-10_000)
                            true
                        } else {
                            false
                        }
                    }
                    Key.DirectionRight -> {
                        if (!controlsVisible) {
                            if (controlsLocked) controlsVisible = true else seekBy(10_000)
                            true
                        } else {
                            false
                        }
                    }
                    Key.DirectionUp, Key.DirectionDown -> {
                        if (!controlsVisible) {
                            controlsVisible = true
                            true
                        } else {
                            false
                        }
                    }
                    Key.DirectionCenter, Key.Enter, Key.NumPadEnter -> {
                        if (!controlsVisible) {
                            controlsVisible = true
                            true
                        } else {
                            false
                        }
                    }
                    else -> false
                }
            }
            .pointerInput(controlsLocked) {
                detectTapGestures(
                    onTap = {
                        if (controlsLocked) {
                            controlsVisible = true
                            return@detectTapGestures
                        }
                        if (!theater) {
                            activePlayer?.let { if (it.isPlaying) it.pause() else it.play() }
                        } else if (panel != Panel.None) {
                            panel = Panel.None
                        } else {
                            controlsVisible = !controlsVisible
                        }
                    },
                    onDoubleTap = { offset ->
                        if (controlsLocked) return@detectTapGestures
                        // Double-tap either side skips 10 seconds.
                        if (offset.x < size.width / 2f) seekBy(-10_000) else seekBy(10_000)
                    },
                )
            }
            .pointerInput(controlsLocked) {
                awaitEachGesture {
                    val down = awaitFirstDown(requireUnconsumed = false, pass = PointerEventPass.Initial)
                    if (controlsLocked) return@awaitEachGesture
                    val start = down.position
                    val slideLevel = start.x < size.width / 2f
                    var dragged = false
                    val releasedEarly = withTimeoutOrNull(280L) {
                        while (true) {
                            val event = awaitPointerEvent(PointerEventPass.Initial)
                            val change = event.changes.firstOrNull() ?: return@withTimeoutOrNull true
                            if (!change.pressed) return@withTimeoutOrNull true
                            val dx = kotlin.math.abs(change.position.x - start.x)
                            val dy = kotlin.math.abs(change.position.y - start.y)
                            if (dy > 28f && dy > dx) {
                                dragged = true
                                return@withTimeoutOrNull false
                            }
                        }
                    }
                    if (!dragged && releasedEarly == null) {
                        holdBoost = true
                        while (true) {
                            val event = awaitPointerEvent(PointerEventPass.Initial)
                            if (event.changes.none { it.pressed }) break
                        }
                        holdBoost = false
                    } else if (dragged) {
                        var previous = start.y
                        while (true) {
                            val event = awaitPointerEvent(PointerEventPass.Initial)
                            val change = event.changes.firstOrNull { it.pressed }
                            if (change == null) break
                            val delta = (previous - change.position.y) / size.height
                            previous = change.position.y
                            change.consume()
                            if (slideLevel) {
                                gestureHud = "Brightness" to nudgeBrightness(context, view, delta)
                            } else {
                                gestureHud = "Volume" to nudgeVolume(context, view, delta)
                            }
                        }
                        gestureHud = null
                    }
                }
            },
    ) {
        AnimatedVisibility(
            visible = holdBoost,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(Alignment.TopCenter)
                .padding(top = 28.dp),
        ) {
            Text(
                "2×",
                color = PlayerChrome.Ink,
                fontWeight = FontWeight.Black,
                fontSize = 14.sp,
                modifier = Modifier
                    .clip(RoundedCornerShape(999.dp))
                    .background(PlayerChrome.Accent)
                    .padding(horizontal = 14.dp, vertical = 6.dp),
            )
        }
        AnimatedVisibility(
            visible = seekFlashDir != 0,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier
                .align(if (seekFlashDir < 0) Alignment.CenterStart else Alignment.CenterEnd)
                .padding(horizontal = 36.dp),
        ) {
            Box(
                modifier = Modifier
                    .size(72.dp)
                    .clip(CircleShape)
                    .background(PlayerChrome.DiscLarge)
                    .border(1.dp, PlayerChrome.Accent.copy(alpha = 0.55f), CircleShape),
                contentAlignment = Alignment.Center,
            ) {
                Icon(
                    if (seekFlashDir < 0) Icons.Outlined.Replay10 else Icons.Outlined.Forward10,
                    contentDescription = null,
                    tint = PlayerChrome.Accent,
                    modifier = Modifier.size(30.dp),
                )
            }
        }
        if (player != null && error == null && !isCasting) {
            AndroidView(
                factory = { ctx ->
                    PlayerView(ctx).apply {
                        useController = false
                        isFocusable = false
                        isFocusableInTouchMode = false
                        descendantFocusability = ViewGroup.FOCUS_BLOCK_DESCENDANTS
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

        if (isCasting) {
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Icon(
                    Icons.Rounded.CastConnected,
                    contentDescription = null,
                    tint = PlayerChrome.Paper,
                    modifier = Modifier.size(56.dp),
                )
                Spacer(modifier = Modifier.height(14.dp))
                Text(
                    "Casting to your TV",
                    color = PlayerChrome.Paper,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 18.sp,
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "EP $episode · $title",
                    color = PlayerChrome.Graphite,
                    fontSize = 13.sp,
                    maxLines = 2,
                    overflow = TextOverflow.Ellipsis,
                )
                Spacer(modifier = Modifier.height(6.dp))
                Text(
                    "Keep this phone on the same Wi-Fi. It sends the stream to the Chromecast.",
                    color = PlayerChrome.Graphite,
                    fontSize = 12.sp,
                    textAlign = androidx.compose.ui.text.style.TextAlign.Center,
                )
            }
        }

        val hud = gestureHud
        var heldHud by remember { mutableStateOf<Pair<String, Float>?>(null) }
        if (hud != null) heldHud = hud
        val reducedHud = site.anikitty.app.ui.theme.prefersReducedMotion()
        AnimatedVisibility(
            visible = hud != null,
            modifier = Modifier.align(Alignment.Center),
            enter = fadeIn(tween(if (reducedHud) 0 else 140)),
            exit = fadeOut(tween(if (reducedHud) 0 else 180)),
        ) {
            val (label, level) = heldHud ?: return@AnimatedVisibility
            val hudShape = RoundedCornerShape(site.anikitty.app.ui.theme.KittyRadius.lg)
            Column(
                modifier = Modifier
                    .clip(hudShape)
                    .background(Color.Black.copy(alpha = 0.78f))
                    .border(0.5.dp, Color.White.copy(alpha = 0.35f), hudShape)
                    .padding(horizontal = 18.dp, vertical = 12.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                Text(label, color = Color.White, fontWeight = FontWeight.SemiBold, fontSize = 12.sp)
                Spacer(modifier = Modifier.height(8.dp))
                Box(
                    modifier = Modifier
                        .width(8.dp)
                        .height(96.dp)
                        .clip(RoundedCornerShape(4.dp))
                        .background(Color.White.copy(alpha = 0.18f)),
                ) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .fillMaxHeight(level.coerceIn(0f, 1f))
                            .background(Color.White),
                    )
                }
            }
        }

        if (!ready && error == null && !isCasting) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .background(Color.Black.copy(alpha = 0.45f)),
            )
            Column(
                modifier = Modifier.align(Alignment.Center),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                CircularProgressIndicator(color = PlayerChrome.Accent)
                if (sourceIndex > 0 && sources.size > 1) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        "Source ${sourceIndex + 1} of ${sources.size}",
                        color = PlayerChrome.Paper,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                    )
                }
            }
        }

        if (sleepNote != null) {
            Text(
                sleepNote!!,
                color = PlayerChrome.Paper,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(top = 72.dp, start = 20.dp, end = 20.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PlayerChrome.Sheet)
                    .border(1.dp, PlayerChrome.SheetStroke, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            )
        }

        if (castHint != null) {
            Text(
                castHint!!,
                color = PlayerChrome.Paper,
                fontSize = 12.sp,
                modifier = Modifier
                    .align(Alignment.TopCenter)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(top = 72.dp, start = 20.dp, end = 20.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(PlayerChrome.Sheet)
                    .border(1.dp, PlayerChrome.SheetStroke, RoundedCornerShape(12.dp))
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            )
        }

        if (nearEndOffer || showEndAutoplay) {
            NextEpisodePrompt(
                modifier = Modifier
                    .align(if (showEndAutoplay) Alignment.Center else Alignment.BottomStart)
                    .then(
                        if (showEndAutoplay) {
                            Modifier.padding(28.dp)
                        } else {
                            Modifier
                                .windowInsetsPadding(WindowInsets.navigationBars)
                                .padding(start = 18.dp, bottom = 128.dp, end = 160.dp)
                        },
                    ),
                nextEpisode = episode + 1,
                ended = showEndAutoplay,
                secondsLeft = autoplaySecLeft,
                player = activePlayer,
                durationMs = durationMs,
                busy = nextTriggered,
                onPlayNow = { goNextEpisode() },
                onDismiss = {
                    if (showEndAutoplay) {
                        autoplayCancelled = true
                    } else {
                        nearEndDismissed = true
                    }
                },
            )
        }

        if (error != null) {
            val errorView = androidx.compose.ui.platform.LocalView.current
            androidx.compose.runtime.LaunchedEffect(error) {
                site.anikitty.app.ui.theme.KittyHaptics.perform(
                    errorView,
                    site.anikitty.app.ui.theme.KittyHaptics.Kind.Error,
                )
            }
            Column(
                modifier = Modifier
                    .align(Alignment.Center)
                    .padding(28.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
            ) {
                site.anikitty.app.ui.components.KittyFace(
                    modifier = Modifier.size(72.dp),
                    contentDescription = "Couldn't play this source",
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Couldn't play this source",
                    color = PlayerChrome.Paper,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                )
                Spacer(modifier = Modifier.height(8.dp))
                Text(
                    error!!.take(160),
                    color = PlayerChrome.Graphite,
                    fontSize = 13.sp,
                )
                Spacer(modifier = Modifier.height(12.dp))
                Text(
                    "Try again",
                    color = PlayerChrome.Ink,
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    modifier = Modifier
                        .clip(RoundedCornerShape(12.dp))
                        .background(PlayerChrome.Accent)
                        .clickable {
                            error = null
                            ready = false
                            playAttempt++
                        }
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                )
            }
        }

        if (controlsLocked && controlsVisible) {
            Box(
                modifier = Modifier
                    .align(Alignment.TopEnd)
                    .windowInsetsPadding(WindowInsets.statusBars)
                    .padding(16.dp),
            ) {
                ChromeDisc(onClick = {
                    controlsLocked = false
                    controlsVisible = true
                }, size = 48.dp) {
                    Icon(Icons.Outlined.LockOpen, contentDescription = "Unlock", tint = Color.White)
                }
            }
        }

        AnimatedVisibility(
            visible = theater && !controlsLocked && (controlsVisible || error != null || panel != Panel.None),
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize(),
        ) {
            Box(modifier = Modifier.fillMaxSize()) {
                Box(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(160.dp)
                        .align(Alignment.BottomCenter)
                        .background(
                            Brush.verticalGradient(
                                listOf(Color.Transparent, Color.Black.copy(alpha = 0.45f)),
                            ),
                        ),
                )

                if (panel == Panel.None) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.Center)
                            .size(96.dp)
                            .clip(CircleShape)
                            .background(Color(0xFF8A8A8A).copy(alpha = 0.42f))
                            .clickable {
                                activePlayer?.let {
                                    if (it.isPlaying) it.pause() else it.play()
                                }
                                controlsVisible = true
                            },
                        contentAlignment = Alignment.Center,
                    ) {
                        Icon(
                            if (playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                            contentDescription = if (playing) "Pause" else "Play",
                            tint = Color.White,
                            modifier = Modifier.size(46.dp),
                        )
                    }
                }

                Column(
                    modifier = Modifier
                        .align(Alignment.BottomCenter)
                        .fillMaxWidth()
                        .windowInsetsPadding(
                            WindowInsets.navigationBars.union(WindowInsets.displayCutout),
                        )
                        .padding(horizontal = 22.dp)
                        .padding(top = 18.dp, bottom = 20.dp),
                ) {
                    LiveTimeline(
                        player = activePlayer,
                        scrubbing = scrubbing,
                        scrubValue = scrubValue,
                        durationMs = durationMs,
                        skipTimes = skipTimes,
                        onScrub = {
                            scrubbing = true
                            scrubValue = it
                            controlsVisible = true
                        },
                        onScrubFinished = { fraction ->
                            val target = (fraction * durationMs).toLong()
                            activePlayer?.seekTo(target)
                            playhead.ms = target
                            positionMs = target
                            scrubbing = false
                        },
                    )

                    Spacer(modifier = Modifier.height(16.dp))

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        PlayerCapsule {
                            PillIcon(
                                icon = if (playing) Icons.Outlined.Pause else Icons.Outlined.PlayArrow,
                                description = if (playing) "Pause" else "Play",
                                onClick = {
                                    activePlayer?.let {
                                        if (it.isPlaying) it.pause() else it.play()
                                    }
                                    controlsVisible = true
                                },
                            )
                            PillIcon(
                                icon = if (muted) Icons.AutoMirrored.Outlined.VolumeOff else Icons.AutoMirrored.Outlined.VolumeUp,
                                description = if (muted) "Unmute" else "Mute",
                                onClick = { toggleMute() },
                            )
                            LiveClockText(
                                player = activePlayer,
                                scrubbing = scrubbing,
                                scrubValue = scrubValue,
                                durationMs = durationMs,
                                modifier = Modifier.padding(horizontal = 8.dp),
                            )
                        }
                        PlayerCapsule {
                            PillIcon(
                                icon = Icons.Outlined.Replay10,
                                description = "Back 10 seconds",
                                onClick = { seekBy(-10_000) },
                            )
                            PillIcon(
                                icon = Icons.Outlined.Forward10,
                                description = "Forward 10 seconds",
                                onClick = { seekBy(10_000) },
                            )
                            PillLabel(
                                label = "85",
                                description = "Skip 85 seconds",
                                onClick = { seekBy(85_000) },
                            )
                            PillIcon(
                                icon = Icons.Outlined.PhotoCamera,
                                description = "Screenshot",
                                onClick = { capturePlayerFrame(context, playerViewRef) },
                            )
                            PillIcon(
                                icon = Icons.Outlined.Settings,
                                description = "Settings",
                                onClick = {
                                    panel = if (panel == Panel.Display) Panel.None else Panel.Display
                                    controlsVisible = true
                                },
                            )
                            PillIcon(
                                icon = Icons.Outlined.PictureInPicture,
                                description = "Picture in picture",
                                onClick = { enterPip() },
                            )
                            PillIcon(
                                icon = Icons.Outlined.FullscreenExit,
                                description = "Exit full screen",
                                onClick = { theater = false },
                            )
                            if (castHelper != null) {
                                CastRouteButton(modifier = Modifier.size(40.dp))
                            }
                        }
                    }
                }

                if (panel != Panel.None) {
                    PlayerSheet(
                        modifier = Modifier
                            .align(Alignment.BottomCenter)
                            .fillMaxWidth()
                            .heightIn(max = 480.dp)
                            .windowInsetsPadding(
                                WindowInsets.navigationBars.union(WindowInsets.displayCutout),
                            ),
                        onDismiss = { panel = Panel.None },
                        resetKey = panel,
                    ) {
                        PanelContents()
                    }
                }
            }
        }

        if (activeSkip != null && !isCasting && panel == Panel.None) {
            val (kind, iv) = activeSkip
            val label = when (kind) {
                "intro" -> "Skip Intro"
                "credits" -> "Skip Outro"
                "recap" -> "Skip Recap"
                "preview" -> "Skip Preview"
                else -> "Skip"
            }
            val chromeUp = theater && controlsVisible && !controlsLocked
            val skipShape = RoundedCornerShape(12.dp)
            Text(
                label,
                color = Color.White,
                fontSize = 14.sp,
                fontWeight = FontWeight.Medium,
                fontFamily = FontFamily.SansSerif,
                modifier = Modifier
                    .align(Alignment.BottomStart)
                    .then(
                        if (theater) {
                            Modifier.windowInsetsPadding(
                                WindowInsets.navigationBars.union(WindowInsets.displayCutout),
                            )
                        } else {
                            Modifier
                        },
                    )
                    .padding(start = 22.dp, bottom = if (chromeUp) 118.dp else 22.dp)
                    .clip(skipShape)
                    .background(Color.Black.copy(alpha = 0.55f))
                    .border(1.dp, Color(0xFFD0D0D0).copy(alpha = 0.7f), skipShape)
                    .clickable { skipTo(iv.endMs) }
                    .padding(horizontal = 16.dp, vertical = 10.dp),
            )
        }
    }
    }

    var dismissY by remember { mutableFloatStateOf(0f) }
    val dismissScope = rememberCoroutineScope()
    fun Modifier.dismissDrag(): Modifier = pointerInput(onDismiss) {
        detectVerticalDragGestures(
            onVerticalDrag = { change, drag ->
                if (drag > 0f || dismissY > 0f) {
                    change.consume()
                    dismissY = (dismissY + drag).coerceAtLeast(0f)
                }
            },
            onDragEnd = {
                if (dismissY > 160f) {
                    onDismiss()
                } else {
                    val from = dismissY
                    dismissScope.launch {
                        animate(from, 0f) { value, _ -> dismissY = value }
                    }
                }
            },
            onDragCancel = {
                val from = dismissY
                dismissScope.launch {
                    animate(from, 0f) { value, _ -> dismissY = value }
                }
            },
        )
    }
    val playerPalette = KittyDarkPalette.copy(
        accent = LookState.accent,
        onAccent = LookState.onAccent(),
    )
    CompositionLocalProvider(LocalKittyPalette provides playerPalette) {
    Box(modifier = Modifier.fillMaxSize()) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .offset { androidx.compose.ui.unit.IntOffset(0, dismissY.toInt()) }
            .background(Color.Black),
    ) {
        if (!theater) {
            PlayerPageBar(
                title = title,
                episodeLine = episodeLine,
                onBack = onClose,
                onExpand = { theater = true },
                onSettings = {
                    panel = if (panel == Panel.Display) Panel.None else Panel.Display
                },
                onPip = { enterPip() },
                cast = {
                    if (castHelper != null) CastRouteButton()
                },
                modifier = Modifier.dismissDrag(),
            )
        }
        val shelfFraction = if (durationMs > 0L && shelfMinutes >= 0) {
            (1f - (shelfMinutes * 60_000f / durationMs.toFloat())).coerceIn(0f, 1f)
        } else {
            0f
        }
        VideoStage(
            modifier = stageModifier.then(
                if (theater) {
                    Modifier.weight(1f)
                } else {
                    Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 16.dp)
                        .clip(RoundedCornerShape(16.dp))
                        .aspectRatio(16f / 9f)
                },
            ),
        )
        if (!theater && durationMs > 0L) {
            LiveHairline(
                player = activePlayer,
                durationMs = durationMs,
                modifier = Modifier
                    .padding(horizontal = 16.dp)
                    .padding(top = 8.dp),
            )
        }
        if (!theater) {
            PlayerEpisodeShelf(
                marks = listOfNotNull(
                    source?.quality?.takeIf { it.isNotBlank() },
                    source?.qualityRating?.takeIf { it.isNotBlank() },
                    source?.audio?.takeIf { it.isNotBlank() },
                ),
                episode = episode,
                totalEpisodes = totalEpisodes.coerceAtLeast(1),
                watchedThrough = watchedThrough,
                positionFraction = shelfFraction,
                audio = audio,
                isMovie = isMovie,
                autoNext = autoNext,
                onPickEpisode = { picked -> onPickEpisode?.invoke(picked) },
                onPickAudio = { picked -> onPickAudio?.invoke(picked) },
                onToggleAutoNext = {
                    autoNext = !autoNext
                    playerPrefs.edit().putBoolean("auto_next", autoNext).apply()
                },
                episodeSlides = episodeSlides,
                anilistId = anilistId,
                fallbackArt = fallbackArt,
                minutesLeft = shelfMinutes.takeIf { it >= 0 },
                onToggleWatched = onToggleWatched,
                speedLabel = speedLabel(playbackSpeed),
                qualityLabel = shortQuality(qualityLabel),
                onSpeed = { panel = if (panel == Panel.Speed) Panel.None else Panel.Speed },
                onQuality = { panel = if (panel == Panel.Quality) Panel.None else Panel.Quality },
                onAudio = {
                    panel = if (panel == Panel.Subs || panel == Panel.Style) Panel.None else Panel.Subs
                },
                onNext = { goNextEpisode() },
                nextEnabled = onNextEpisode != null && episode < totalEpisodes,
                speedSelected = panel == Panel.Speed,
                qualitySelected = panel == Panel.Quality,
                audioSelected = panel == Panel.Subs || panel == Panel.Style,
                modifier = Modifier.weight(1f).dismissDrag(),
            )
        }
    }
    if (!theater && panel != Panel.None) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black.copy(alpha = 0.45f))
                .clickable { panel = Panel.None },
        )
        PlayerSheet(
            modifier = Modifier
                .align(Alignment.BottomCenter)
                .fillMaxWidth()
                .heightIn(max = 560.dp)
                .windowInsetsPadding(WindowInsets.navigationBars),
            onDismiss = { panel = Panel.None },
            resetKey = panel,
        ) {
            PanelContents()
        }
    }
    }
    }
}

@Composable
private fun PlayerPageBar(
    title: String,
    episodeLine: String,
    onBack: () -> Unit,
    onExpand: () -> Unit,
    onSettings: () -> Unit,
    onPip: () -> Unit,
    cast: @Composable () -> Unit,
    modifier: Modifier = Modifier,
) {
    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Color.Black)
            .windowInsetsPadding(WindowInsets.statusBars.union(WindowInsets.displayCutout))
            .padding(horizontal = 4.dp, vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        ChromeDisc(onClick = onBack, size = 48.dp) {
            Icon(
                Icons.AutoMirrored.Rounded.ArrowBack,
                contentDescription = "Back",
                tint = Color.White,
            )
        }
        Column(
            modifier = Modifier
                .weight(1f)
                .padding(horizontal = 8.dp),
        ) {
            Text(
                title,
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                letterSpacing = (-0.3).sp,
                maxLines = 1,
                overflow = TextOverflow.Ellipsis,
            )
            Text(
                episodeLine,
                color = Color.White.copy(alpha = 0.55f),
                fontSize = 13.sp,
                maxLines = 1,
            )
        }
        Box(
            modifier = Modifier.size(48.dp),
            contentAlignment = Alignment.Center,
        ) {
            cast()
        }
        ChromeDisc(onClick = onPip, size = 48.dp) {
            Icon(
                Icons.Rounded.PictureInPicture,
                contentDescription = "Picture in picture",
                tint = Color.White,
            )
        }
        ChromeDisc(onClick = onSettings, size = 48.dp) {
            Icon(
                Icons.Rounded.Settings,
                contentDescription = "Settings",
                tint = Color.White,
            )
        }
        ChromeDisc(onClick = onExpand, size = 48.dp) {
            Icon(
                Icons.Rounded.Fullscreen,
                contentDescription = "Full screen",
                tint = Color.White,
            )
        }
    }
}

@Composable
private fun PlayerEpisodeShelf(
    marks: List<String> = emptyList(),
    episode: Int,
    totalEpisodes: Int,
    watchedThrough: Int,
    positionFraction: Float,
    audio: String,
    isMovie: Boolean,
    autoNext: Boolean,
    onPickEpisode: (Int) -> Unit,
    onPickAudio: (String) -> Unit,
    onToggleAutoNext: () -> Unit,
    episodeSlides: List<EpisodeSlide>,
    anilistId: Int = 0,
    fallbackArt: String?,
    minutesLeft: Int?,
    onToggleWatched: ((Int) -> Unit)?,
    speedLabel: String = "1×",
    qualityLabel: String = "Auto",
    onSpeed: () -> Unit = {},
    onQuality: () -> Unit = {},
    onAudio: () -> Unit = {},
    onNext: () -> Unit = {},
    nextEnabled: Boolean = false,
    speedSelected: Boolean = false,
    qualitySelected: Boolean = false,
    audioSelected: Boolean = false,
    modifier: Modifier = Modifier,
) {
    val showGrid = !isMovie && totalEpisodes > 1
    var jump by remember { mutableStateOf("") }
    val jumpFocus = remember { FocusRequester() }
    val audioLabel = if (audio == "dub") "Dub" else "Sub"
    Column(
        modifier = modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .windowInsetsPadding(WindowInsets.navigationBars)
            .padding(horizontal = 16.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        if (marks.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                marks.forEach { PlayerMetaPill(it) }
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(4.dp),
        ) {
            PlayerTool(
                label = "Speed",
                value = speedLabel,
                selected = speedSelected,
                onClick = onSpeed,
                modifier = Modifier.weight(1f),
            )
            PlayerTool(
                label = "Quality",
                value = qualityLabel,
                selected = qualitySelected,
                onClick = onQuality,
                modifier = Modifier.weight(1f),
            )
            PlayerTool(
                label = "Audio",
                value = audioLabel,
                selected = audioSelected,
                onClick = onAudio,
                modifier = Modifier.weight(1f),
            )
            if (showGrid) {
                PlayerTool(
                    label = "Episodes",
                    value = "E$episode",
                    onClick = { runCatching { jumpFocus.requestFocus() } },
                    modifier = Modifier.weight(1f),
                )
            }
            PlayerTool(
                label = "Next",
                value = if (nextEnabled) "E${episode + 1}" else "—",
                enabled = nextEnabled,
                onClick = onNext,
                modifier = Modifier.weight(1f),
            )
        }
        if (showGrid) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .heightIn(min = 48.dp)
                    .clip(RoundedCornerShape(12.dp))
                    .background(Color.White.copy(alpha = 0.06f))
                    .padding(horizontal = 14.dp),
                contentAlignment = Alignment.CenterStart,
            ) {
                BasicTextField(
                    value = jump,
                    onValueChange = { next -> if (next.all { it.isDigit() }) jump = next },
                    textStyle = TextStyle(color = Color.White, fontSize = 14.sp, fontWeight = FontWeight.Medium),
                    keyboardOptions = KeyboardOptions(
                        keyboardType = KeyboardType.Number,
                        imeAction = ImeAction.Go,
                    ),
                    keyboardActions = KeyboardActions(onGo = {
                        val picked = jump.toIntOrNull()
                        if (picked != null && picked in 1..totalEpisodes) {
                            onPickEpisode(picked)
                            jump = ""
                        }
                    }),
                    singleLine = true,
                    modifier = Modifier
                        .fillMaxWidth()
                        .focusRequester(jumpFocus),
                    decorationBox = { inner ->
                        if (jump.isEmpty()) {
                            Text(
                                "Jump to episode",
                                color = Color.White.copy(alpha = 0.35f),
                                fontSize = 14.sp,
                            )
                        }
                        inner()
                    },
                )
            }
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
        ) {
            listOf("sub" to "Subtitled", "dub" to "Dubbed").forEach { (key, label) ->
                val selected = audio == key
                val background by animateColorAsState(
                    if (selected) Color.White else Color(0xFF0C0C10),
                    tween(180),
                    label = "audioBg",
                )
                val text by animateColorAsState(
                    if (selected) Color.Black else Color.White.copy(alpha = 0.7f),
                    tween(180),
                    label = "audioText",
                )
                Box(
                    modifier = Modifier
                        .weight(1f)
                        .heightIn(min = 48.dp)
                        .spacePress { onPickAudio(key) }
                        .clip(RoundedCornerShape(12.dp))
                        .background(background)
                        .border(
                            0.5.dp,
                            if (selected) Color.White else Color.White.copy(alpha = 0.08f),
                            RoundedCornerShape(12.dp),
                        ),
                    contentAlignment = Alignment.Center,
                ) {
                    Text(
                        label,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold,
                        color = text,
                    )
                }
            }
        }
        if (showGrid) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp),
            ) {
                Text(
                    "Episodes",
                    color = Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 16.sp,
                    letterSpacing = (-0.2).sp,
                )
                Text(
                    "$totalEpisodes",
                    color = Color.White.copy(alpha = 0.45f),
                    fontWeight = FontWeight.Medium,
                    fontSize = 13.sp,
                    modifier = Modifier.weight(1f),
                )
                Text(
                    if (autoNext) "Auto on" else "Auto off",
                    color = if (autoNext) Color.Black else Color.White,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                    modifier = Modifier
                        .heightIn(min = 48.dp)
                        .clip(RoundedCornerShape(12.dp))
                        .background(if (autoNext) Color.White else Color.White.copy(alpha = 0.06f))
                        .clickable(onClick = onToggleAutoNext)
                        .padding(horizontal = 14.dp, vertical = 14.dp),
                )
            }
            val slides = if (episodeSlides.isNotEmpty()) {
                episodeSlides
            } else {
                (1..totalEpisodes).map { number ->
                    EpisodeSlide(number, "Episode $number", null)
                }
            }
            EpisodeCarousel(
                slides = slides,
                current = episode,
                watchedThrough = watchedThrough,
                currentProgress = positionFraction,
                fallbackArt = fallbackArt,
                onPick = onPickEpisode,
                onDark = true,
                minutesLeft = minutesLeft,
                onToggleWatched = onToggleWatched,
                anilistId = anilistId,
            )
            val upcoming = slides.filter { it.number > episode }.take(3)
            if (upcoming.isNotEmpty()) {
                Text(
                    "Next up",
                    color = Color.White.copy(alpha = 0.45f),
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 12.sp,
                )
                upcoming.forEach { next ->
                    Text(
                        "${next.number}. ${next.title.ifBlank { "Episode ${next.number}" }}",
                        color = Color.White,
                        fontSize = 13.sp,
                        maxLines = 1,
                        overflow = TextOverflow.Ellipsis,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(10.dp))
                            .clickable { onPickEpisode(next.number) }
                            .padding(vertical = 4.dp),
                    )
                }
            }
        }
    }
}

@Composable
private fun ShelfAction(
    label: String,
    enabled: Boolean,
    selected: Boolean = false,
    icon: androidx.compose.ui.graphics.vector.ImageVector? = null,
    onClick: () -> Unit,
) {
    val filled = selected
    val tint = when {
        filled -> Color.Black
        enabled -> Color.White.copy(alpha = 0.85f)
        else -> Color.White.copy(alpha = 0.3f)
    }
    Box(
        modifier = Modifier
            .height(36.dp)
            .then(if (enabled) Modifier.spacePress(onClick) else Modifier)
            .clip(RoundedCornerShape(16.dp))
            .background(if (filled) Color.White else Color(0xFF0C0C10))
            .border(
                0.5.dp,
                if (filled) Color.White else Color.White.copy(alpha = if (enabled) 0.08f else 0.04f),
                RoundedCornerShape(16.dp),
            )
            .padding(horizontal = 12.dp),
        contentAlignment = Alignment.Center,
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            if (icon != null) {
                Icon(icon, contentDescription = null, modifier = Modifier.size(14.dp), tint = tint)
                Spacer(modifier = Modifier.width(4.dp))
            }
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.SemiBold, color = tint)
        }
    }
}

private class Playhead {
    var ms: Long = 0L
}

@Composable
private fun LiveTimeline(
    player: Player?,
    scrubbing: Boolean,
    scrubValue: Float,
    durationMs: Long,
    skipTimes: SkipTimes,
    onScrub: (Float) -> Unit,
    onScrubFinished: (Float) -> Unit,
) {
    var liveMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player, scrubbing) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            if (!scrubbing) {
                val next = p.currentPosition.coerceAtLeast(0L)
                if (next != liveMs) liveMs = next
            }
            delay(200)
        }
    }
    val shown = if (scrubbing) (scrubValue * durationMs).toLong() else liveMs
    val dur = durationMs.coerceAtLeast(1L).toFloat()
    var bufferedMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            val next = p.bufferedPosition.coerceAtLeast(0L)
            if (next != bufferedMs) bufferedMs = next
            delay(400)
        }
    }
    val buffered = if (durationMs > 0L) {
        (bufferedMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    GlassScrubber(
        progress = if (durationMs > 0L) (shown / dur).coerceIn(0f, 1f) else 0f,
        buffered = buffered,
        durationMs = durationMs,
        scrubbing = scrubbing,
        onScrub = onScrub,
        onScrubFinished = onScrubFinished,
        formatClock = ::formatClockPadded,
        skipTimes = skipTimes,
        modifier = Modifier.fillMaxWidth(),
    )
}

@Composable
private fun LiveHairline(
    player: Player?,
    durationMs: Long,
    modifier: Modifier = Modifier,
) {
    var liveMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            val next = p.currentPosition.coerceAtLeast(0L)
            if (next != liveMs) liveMs = next
            delay(250)
        }
    }
    val fraction = if (durationMs > 0L) {
        (liveMs.toFloat() / durationMs.toFloat()).coerceIn(0f, 1f)
    } else {
        0f
    }
    Box(
        modifier = modifier
            .fillMaxWidth()
            .height(2.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.White.copy(alpha = 0.12f)),
    ) {
        Box(
            modifier = Modifier
                .fillMaxHeight()
                .fillMaxWidth(fraction)
                .background(Color.White),
        )
    }
}

@Composable
private fun NextEpisodePrompt(
    modifier: Modifier = Modifier,
    nextEpisode: Int,
    ended: Boolean,
    secondsLeft: Int,
    player: Player? = null,
    durationMs: Long = 0L,
    busy: Boolean,
    onPlayNow: () -> Unit,
    onDismiss: () -> Unit,
) {
    var remainSec by remember { mutableIntStateOf(secondsLeft) }
    LaunchedEffect(player, ended, durationMs) {
        if (ended) return@LaunchedEffect
        val p = player ?: return@LaunchedEffect
        while (true) {
            val left = ((durationMs - p.currentPosition.coerceAtLeast(0L)) / 1000L).toInt().coerceAtLeast(0)
            if (left != remainSec) remainSec = left
            delay(250)
        }
    }
    val countdown = if (ended) secondsLeft else remainSec
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .widthIn(max = 360.dp)
            .shadow(16.dp, shape, clip = false, ambientColor = Color.Black.copy(alpha = 0.45f))
            .clip(shape)
            .background(PlayerChrome.Sheet)
            .border(1.dp, PlayerChrome.SheetStroke, shape)
            .padding(horizontal = 16.dp, vertical = 14.dp),
    ) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            site.anikitty.app.ui.components.KittyFace(
                modifier = Modifier
                    .padding(end = 8.dp)
                    .size(22.dp),
                contentDescription = "Up next",
            )
            Text(
                "Up next",
                color = PlayerChrome.Faint,
                fontSize = 11.sp,
                fontWeight = FontWeight.Bold,
                letterSpacing = 1.sp,
            )
        }
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Episode $nextEpisode",
            color = PlayerChrome.Paper,
            fontWeight = FontWeight.Bold,
            fontSize = 18.sp,
        )
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            when {
                busy -> "Loading next episode…"
                ended -> "Starting automatically in ${secondsLeft}s"
                countdown > 0 -> "Episode ends in ${countdown}s"
                else -> "Episode $nextEpisode is ready"
            },
            color = PlayerChrome.Graphite,
            fontSize = 13.sp,
        )
        if (countdown > 0) {
            val span = if (ended) AUTOPLAY_COUNTDOWN_SEC else (NEAR_END_THRESHOLD_MS / 1000L).toInt()
            val fraction = (countdown.toFloat() / span.coerceAtLeast(1)).coerceIn(0f, 1f)
            Spacer(modifier = Modifier.height(10.dp))
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(3.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White.copy(alpha = 0.12f)),
            ) {
                Box(
                    modifier = Modifier
                        .fillMaxHeight()
                        .fillMaxWidth(fraction)
                        .background(Color.White),
                )
            }
        }
        Spacer(modifier = Modifier.height(12.dp))
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            var playNowFocused by remember { mutableStateOf(false) }
            var dismissFocused by remember { mutableStateOf(false) }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (playNowFocused) Color.White else PlayerChrome.Accent)
                    .border(
                        if (playNowFocused) 2.dp else 0.dp,
                        Color.White,
                        RoundedCornerShape(12.dp),
                    )
                    .onFocusChanged { playNowFocused = it.isFocused }
                    .clickable(enabled = !busy, onClick = onPlayNow)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    if (ended) "Play now" else "Next episode",
                    color = Color.Black,
                    fontWeight = FontWeight.Bold,
                    fontSize = 13.sp,
                )
            }
            Box(
                modifier = Modifier
                    .clip(RoundedCornerShape(12.dp))
                    .background(if (dismissFocused) Color.White else PlayerChrome.Disc)
                    .border(
                        if (dismissFocused) 2.dp else 1.dp,
                        if (dismissFocused) Color.White else PlayerChrome.Accent.copy(alpha = 0.35f),
                        RoundedCornerShape(12.dp),
                    )
                    .onFocusChanged { dismissFocused = it.isFocused }
                    .clickable(enabled = !busy, onClick = onDismiss)
                    .padding(horizontal = 14.dp, vertical = 10.dp),
            ) {
                Text(
                    if (ended) "Cancel" else "Not now",
                    color = if (dismissFocused) Color.Black else PlayerChrome.Paper,
                    fontWeight = FontWeight.SemiBold,
                    fontSize = 13.sp,
                )
            }
        }
    }
}

@Composable
private fun PlayerSheet(
    modifier: Modifier = Modifier,
    onDismiss: () -> Unit,
    resetKey: Any? = null,
    content: @Composable () -> Unit,
) {
    val shape = RoundedCornerShape(topStart = 20.dp, topEnd = 20.dp)
    val focusManager = LocalFocusManager.current
    val scroll = rememberScrollState()
    LaunchedEffect(resetKey) { scroll.scrollTo(0) }
    Box(
        modifier = modifier
            .clip(shape)
            .background(Color(0xFF0C0C10))
            .border(0.5.dp, Color.White.copy(alpha = 0.1f), shape)
            .onPreviewKeyEvent { event ->
                if (event.type != KeyEventType.KeyDown) return@onPreviewKeyEvent false
                when (event.key) {
                    Key.DirectionDown -> {
                        focusManager.moveFocus(FocusDirection.Down)
                        true
                    }
                    Key.DirectionUp -> {
                        focusManager.moveFocus(FocusDirection.Up)
                        true
                    }
                    else -> false
                }
            }
            .pointerInput(Unit) { detectTapGestures { } }
            .padding(16.dp),
    ) {
        Column(modifier = Modifier.fillMaxWidth()) {
            Box(
                modifier = Modifier
                    .align(Alignment.CenterHorizontally)
                    .padding(bottom = 12.dp)
                    .size(width = 36.dp, height = 4.dp)
                    .clip(RoundedCornerShape(999.dp))
                    .background(Color.White.copy(alpha = 0.28f)),
            )
            Column(
                modifier = Modifier
                    .focusProperties { canFocus = false }
                    .verticalScroll(scroll),
            ) {
                content()
            }
        }
    }
}

@Composable
private fun SleepSheet(choice: Int, onPick: (Int) -> Unit) {
    SheetTitle("Sleep timer")
    Spacer(modifier = Modifier.height(6.dp))
    Text(
        "Pause playback after a while, or when this episode ends.",
        color = PlayerChrome.Graphite,
        fontSize = 12.sp,
    )
    Spacer(modifier = Modifier.height(10.dp))
    listOf(
        0 to "Off",
        15 to "15 minutes",
        30 to "30 minutes",
        45 to "45 minutes",
        -1 to "End of this episode",
    ).forEachIndexed { index, (value, label) ->
        SheetRow(
            label = label,
            selected = choice == value,
            onClick = { onPick(value) },
            initiallyFocused = index == 0,
        )
    }
}

@Composable
private fun SpeedSheet(speed: Float, onPick: (Float) -> Unit) {
    SheetTitle("Speed")
    Spacer(modifier = Modifier.height(10.dp))
    listOf(0.75f, 1f, 1.25f, 1.5f, 2f).forEachIndexed { index, rate ->
        SheetRow(
            label = speedLabel(rate),
            selected = kotlin.math.abs(speed - rate) < 0.01f,
            onClick = { onPick(rate) },
            initiallyFocused = index == 0,
        )
    }
}

@Composable
private fun QualitySheet(
    videoOptions: List<VideoOption>,
    selectedVideoId: String,
    onPickVideo: (String) -> Unit,
    sources: List<PlayableSource>,
    selectedSource: Int,
    onPickSource: (Int) -> Unit,
) {
    SheetTitle("Resolution")
    Spacer(modifier = Modifier.height(6.dp))
    Text(
        "Pick 1080p / 720p / … when the stream offers them",
        color = PlayerChrome.Graphite,
        fontSize = 12.sp,
    )
    Spacer(modifier = Modifier.height(10.dp))
    val resolutions = videoOptions.ifEmpty {
        listOf(VideoOption(id = "auto", label = "Auto (best available)"))
    }
    resolutions.forEachIndexed { index, opt ->
        SheetRow(
            label = opt.label,
            selected = selectedVideoId == opt.id ||
                (opt.id == "auto" && selectedVideoId == "auto"),
            onClick = { onPickVideo(opt.id) },
            initiallyFocused = index == 0,
        )
    }
    if (sources.size > 1) {
        Spacer(modifier = Modifier.height(16.dp))
        SheetTitle("Source")
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Alternate mirrors for this episode",
            color = PlayerChrome.Graphite,
            fontSize = 12.sp,
        )
        Spacer(modifier = Modifier.height(10.dp))
        sources.forEachIndexed { index, src ->
            SheetRow(
                label = src.label,
                selected = index == selectedSource,
                onClick = { onPickSource(index) },
            )
        }
    } else if (sources.size == 1) {
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            "Source · ${sources[0].label}",
            color = PlayerChrome.Graphite,
            fontSize = 12.sp,
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
    audio: String = "sub",
    onPickAudio: ((String) -> Unit)? = null,
) {
    SheetTitle("Subtitles")
    if (onPickAudio != null) {
        Spacer(modifier = Modifier.height(8.dp))
        SheetRow(
            label = "Subtitled",
            selected = audio != "dub",
            onClick = { onPickAudio("sub") },
        )
        SheetRow(
            label = "Dubbed",
            selected = audio == "dub",
            onClick = { onPickAudio("dub") },
        )
        Spacer(modifier = Modifier.height(8.dp))
    }
    Spacer(modifier = Modifier.height(10.dp))
    SheetRow(
        label = "Off",
        selected = !enabled || selectedId == "off",
        onClick = { onToggle(false) },
        initiallyFocused = true,
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
    val positionLabel = when {
        style.bottomPad <= 0.08f -> "Low"
        style.bottomPad <= 0.13f -> "Mid"
        style.bottomPad <= 0.19f -> "High"
        else -> "Top"
    }
    SheetTitle("Captions")
    SheetRow(
        label = "Back to subtitles",
        selected = false,
        onClick = onBack,
        initiallyFocused = true,
    )
    CaptionPreview(style)
    Text(
        "A Chromecast uses the TV's own caption style.",
        color = PlayerChrome.Faint,
        fontSize = 11.sp,
    )
    Spacer(modifier = Modifier.height(8.dp))

    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Size", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(
            String.format(Locale.US, "%.0f sp", style.sizeSp),
            color = PlayerChrome.Faint,
            fontSize = 11.sp,
        )
    }
    Spacer(modifier = Modifier.height(6.dp))
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(
            8f to "Tiny",
            12f to "Small",
            16f to "Medium",
            DEFAULT_SUB_SIZE_SP to "Default",
            22f to "Max",
        ).forEach { (sp, label) ->
            ChoicePill(
                label = label,
                selected = kotlin.math.abs(style.sizeSp - sp) < 0.4f,
                onClick = { onChange(style.copy(sizeSp = sp)) },
            )
        }
    }
    Slider(
        value = style.sizeSp,
        onValueChange = { onChange(style.copy(sizeSp = it)) },
        valueRange = SUB_SIZE_SP_MIN..SUB_SIZE_SP_MAX,
        colors = SliderDefaults.colors(
            thumbColor = PlayerChrome.Accent,
            activeTrackColor = PlayerChrome.Accent,
            inactiveTrackColor = PlayerChrome.Faint,
        ),
        modifier = Modifier.fillMaxWidth(),
    )

    Spacer(modifier = Modifier.height(8.dp))
    Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("Position", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
        Text(positionLabel, color = PlayerChrome.Faint, fontSize = 11.sp)
    }
    Text(
        "Drag right to raise captions",
        color = PlayerChrome.Faint,
        fontSize = 11.sp,
    )
    Slider(
        value = style.bottomPad,
        onValueChange = { onChange(style.copy(bottomPad = it)) },
        valueRange = SUB_BOTTOM_MIN..SUB_BOTTOM_MAX,
        colors = SliderDefaults.colors(
            thumbColor = PlayerChrome.Accent,
            activeTrackColor = PlayerChrome.Accent,
            inactiveTrackColor = PlayerChrome.Faint,
        ),
        modifier = Modifier.fillMaxWidth(),
    )

    Spacer(modifier = Modifier.height(8.dp))
    Text("Style", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    Spacer(modifier = Modifier.height(6.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        ChoicePill(
            label = "Regular",
            selected = !style.bold,
            onClick = { onChange(style.copy(bold = false)) },
        )
        ChoicePill(
            label = "Bold",
            selected = style.bold,
            onClick = { onChange(style.copy(bold = true)) },
        )
        ChoicePill(
            label = "Italic",
            selected = style.italic,
            onClick = { onChange(style.copy(italic = !style.italic)) },
        )
    }

    Spacer(modifier = Modifier.height(10.dp))
    Text("Color", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
    Spacer(modifier = Modifier.height(6.dp))
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(
            AndroidColor.WHITE to "White",
            AndroidColor.YELLOW to "Yellow",
            AndroidColor.CYAN to "Cyan",
            AndroidColor.rgb(255, 210, 140) to "Warm",
            AndroidColor.rgb(180, 255, 180) to "Mint",
            AndroidColor.rgb(220, 220, 255) to "Ice",
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
    Row(
        modifier = Modifier.horizontalScroll(rememberScrollState()),
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        listOf(
            SubBgMode.None to "None",
            SubBgMode.Soft to "Soft",
            SubBgMode.Blur to "Blur",
            SubBgMode.Solid to "Solid",
        ).forEach { (mode, label) ->
            ChoicePill(
                label = label,
                selected = style.bgMode == mode,
                onClick = { onChange(style.copy(bgMode = mode)) },
            )
        }
    }
    if (style.bgMode != SubBgMode.None) {
        Spacer(modifier = Modifier.height(6.dp))
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
        ) {
            Text("Box opacity", color = PlayerChrome.Graphite, fontSize = 12.sp)
            Text(
                "${(style.bgAlpha * 100).toInt()}%",
                color = PlayerChrome.Faint,
                fontSize = 11.sp,
            )
        }
        Slider(
            value = style.bgAlpha,
            onValueChange = { onChange(style.copy(bgAlpha = it)) },
            valueRange = 0.15f..1f,
            colors = SliderDefaults.colors(
                thumbColor = PlayerChrome.Accent,
                activeTrackColor = PlayerChrome.Accent,
                inactiveTrackColor = PlayerChrome.Faint,
            ),
            modifier = Modifier.fillMaxWidth(),
        )
    }

    Spacer(modifier = Modifier.height(14.dp))
    Text("Edge", color = PlayerChrome.Graphite, fontSize = 12.sp, fontWeight = FontWeight.Medium)
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

}

@Composable
private fun CaptionPreview(style: SubStyle) {
    val previewBg = when (style.bgMode) {
        SubBgMode.None -> Color.Transparent
        SubBgMode.Soft -> Color.Black.copy(alpha = style.bgAlpha.coerceIn(0.15f, 0.55f))
        SubBgMode.Blur -> Color.Black.copy(alpha = style.bgAlpha.coerceIn(0.25f, 0.7f))
        SubBgMode.Solid -> Color.Black.copy(alpha = style.bgAlpha)
    }
    val shadow = when (style.edgeType) {
        CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW -> Shadow(
            color = Color.Black.copy(alpha = 0.9f),
            offset = Offset(0f, 1.5f),
            blurRadius = 6f,
        )
        CaptionStyleCompat.EDGE_TYPE_OUTLINE -> Shadow(
            color = Color.Black,
            offset = Offset(0f, 0f),
            blurRadius = 3f,
        )
        else -> null
    }
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 8.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(
                Brush.verticalGradient(
                    listOf(Color(0xFF1A1A1E), Color(0xFF0A0A0C)),
                ),
            )
            .padding(vertical = 22.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            "Preview · 字幕サンプル",
            color = Color(style.color),
            fontSize = style.sizeSp.sp,
            fontWeight = if (style.bold) FontWeight.Bold else FontWeight.Medium,
            fontStyle = if (style.italic) FontStyle.Italic else FontStyle.Normal,
            fontFamily = FontFamily.SansSerif,
            style = TextStyle(shadow = shadow),
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(previewBg)
                .padding(horizontal = 10.dp, vertical = 4.dp),
        )
    }
}

@Composable
private fun DisplaySheet(
    resizeMode: Int,
    immersive: Boolean,
    onResize: (Int) -> Unit,
    onImmersive: (Boolean) -> Unit,
    onSleep: () -> Unit,
    onLock: () -> Unit,
    onQuality: () -> Unit,
    onAudio: () -> Unit,
    onSpeed: () -> Unit,
    onEpisodes: () -> Unit,
    onNext: () -> Unit,
    nextEnabled: Boolean,
) {
    SheetTitle("Display")
    Spacer(modifier = Modifier.height(10.dp))
    SheetRow(label = "Quality", selected = false, onClick = onQuality, initiallyFocused = true)
    SheetRow(label = "Audio and subtitles", selected = false, onClick = onAudio)
    SheetRow(label = "Speed", selected = false, onClick = onSpeed)
    SheetRow(label = "Episodes", selected = false, onClick = onEpisodes)
    if (nextEnabled) {
        SheetRow(label = "Next episode", selected = false, onClick = onNext)
    }
    Spacer(modifier = Modifier.height(8.dp))
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
    SheetRow(label = "Sleep timer", selected = false, onClick = onSleep)
    SheetRow(label = "Lock controls", selected = false, onClick = onLock)
    Spacer(modifier = Modifier.height(8.dp))
    Text(
        "Downloads aren't available. AniKitty streams this episode and does not keep a copy.",
        color = PlayerChrome.Faint,
        fontSize = 12.sp,
    )
}

@Composable
private fun SheetTitle(text: String) {
    Text(
        text,
        color = PlayerChrome.Accent,
        fontWeight = FontWeight.Bold,
        fontSize = 15.sp,
        letterSpacing = 0.2.sp,
    )
}

@Composable
private fun SheetRow(
    label: String,
    selected: Boolean,
    onClick: () -> Unit,
    initiallyFocused: Boolean = false,
) {
    val shape = RoundedCornerShape(12.dp)
    val focusRequester = remember { FocusRequester() }
    var focused by remember { mutableStateOf(false) }
    LaunchedEffect(initiallyFocused) {
        if (!initiallyFocused) return@LaunchedEffect
        delay(80)
        runCatching { focusRequester.requestFocus() }
    }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .focusRequester(focusRequester)
            .onFocusChanged { focused = it.isFocused }
            .clip(shape)
            .background(if (selected || focused) PlayerChrome.RowSelected else Color.Transparent)
            .border(
                if (focused) 2.dp else 1.dp,
                when {
                    focused -> Color.White
                    selected -> PlayerChrome.Accent.copy(alpha = 0.45f)
                    else -> Color.Transparent
                },
                shape,
            )
            .clickable(onClick = onClick)
            .heightIn(min = 48.dp)
            .padding(horizontal = 12.dp, vertical = 12.dp),
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
            Icon(
                Icons.Rounded.Check,
                contentDescription = null,
                tint = PlayerChrome.Accent,
                modifier = Modifier.size(18.dp),
            )
        }
    }
}

@Composable
private fun ChoicePill(label: String, selected: Boolean, onClick: () -> Unit) {
    val shape = RoundedCornerShape(999.dp)
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .heightIn(min = 48.dp)
            .clip(shape)
            .background(if (selected || focused) PlayerChrome.Accent else PlayerChrome.Disc)
            .border(
                if (focused) 2.dp else 1.dp,
                if (selected || focused) Color.White else PlayerChrome.DiscStroke,
                shape,
            )
            .onFocusChanged { focused = it.isFocused }
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = if (selected || focused) PlayerChrome.Ink else PlayerChrome.Paper,
            fontSize = 12.sp,
            fontWeight = FontWeight.SemiBold,
        )
    }
}

@Composable
private fun PlayerTool(
    label: String,
    value: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    selected: Boolean = false,
    enabled: Boolean = true,
) {
    Column(
        modifier = modifier
            .heightIn(min = 48.dp)
            .clip(RoundedCornerShape(12.dp))
            .background(
                if (selected) Color.White.copy(alpha = 0.16f) else Color.White.copy(alpha = 0.06f),
            )
            .clearAndSetSemantics { contentDescription = "$label, $value" }
            .then(if (enabled) Modifier.clickable(onClick = onClick) else Modifier)
            .padding(horizontal = 4.dp, vertical = 6.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center,
    ) {
        Text(
            value,
            color = if (enabled) Color.White else Color.White.copy(alpha = 0.35f),
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
            maxLines = 1,
            overflow = TextOverflow.Ellipsis,
        )
        Text(
            label,
            color = Color.White.copy(alpha = 0.5f),
            fontSize = 10.sp,
            maxLines = 1,
        )
    }
}

@Composable
private fun PlayerMetaPill(label: String, emphasized: Boolean = false) {
    val shape = RoundedCornerShape(999.dp)
    Box(
        modifier = Modifier
            .clip(shape)
            .background(if (emphasized) PlayerChrome.Accent else PlayerChrome.Disc)
            .border(
                1.dp,
                if (emphasized) PlayerChrome.Accent else PlayerChrome.DiscStroke,
                shape,
            )
            .padding(horizontal = 8.dp, vertical = 3.dp),
    ) {
        Text(
            label,
            color = if (emphasized) Color.Black else PlayerChrome.Graphite,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            maxLines = 1,
        )
    }
}

@Composable
private fun ChromeDisc(
    onClick: () -> Unit,
    size: androidx.compose.ui.unit.Dp = 40.dp,
    large: Boolean = false,
    accent: Boolean = false,
    focusRequester: FocusRequester? = null,
    content: @Composable () -> Unit,
) {
    val shape = CircleShape
    var focused by remember { mutableStateOf(false) }
    Box(
        modifier = Modifier
            .size(size)
            .scale(if (focused) 1.06f else 1f)
            .clip(shape)
            .background(
                when {
                    accent -> PlayerChrome.Accent
                    large -> Color.White.copy(alpha = 0.14f)
                    else -> Color.White.copy(alpha = 0.08f)
                },
            )
            .border(
                if (focused) 2.dp else 0.5.dp,
                if (focused || accent) Color.White else Color.White.copy(alpha = 0.12f),
                shape,
            )
            .then(if (focusRequester != null) Modifier.focusRequester(focusRequester) else Modifier)
            .onFocusChanged { focused = it.isFocused }
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
private fun subtitleConfig(
    track: SubtitleTrack,
    default: Boolean = false,
): MediaItem.SubtitleConfiguration? {
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
        .setLanguage(track.language ?: "en")
        .setLabel(track.label)
        .setSelectionFlags(if (default) C.SELECTION_FLAG_DEFAULT else 0)
        .setRoleFlags(C.ROLE_FLAG_SUBTITLE)
        .build()
}

private data class PlayerBundle(
    val player: ExoPlayer,
    val trackSelector: DefaultTrackSelector,
)

@OptIn(UnstableApi::class)
private fun buildTextOptions(tracks: Tracks, external: List<SubtitleTrack>): List<TextOption> {
    val out = ArrayList<TextOption>()
    out += TextOption(id = "off", label = "Off")
    out += TextOption(id = "auto", label = "Auto")
    var externalIdx = 0
    val usedIds = HashSet<String>()
    tracks.groups.forEachIndexed { _, group ->
        if (group.type != C.TRACK_TYPE_TEXT) return@forEachIndexed
        for (ti in 0 until group.length) {
            if (!group.isTrackSupported(ti)) continue
            val format: Format = group.getTrackFormat(ti)
            val label = format.label
                ?: format.language?.uppercase(Locale.US)
                ?: external.getOrNull(externalIdx)?.label
                ?: "Track ${out.size - 1}"
            externalIdx++
            var id = stableTextId(format.language, label)
            if (!usedIds.add(id)) {
                id = "$id#$ti"
                usedIds += id
            }
            out += TextOption(
                id = id,
                label = label,
                mediaGroup = group.mediaTrackGroup,
                trackIndex = ti,
            )
        }
    }
    return out
}

/** Stable across quality switches (group indices are not). */
private fun stableTextId(language: String?, label: String): String {
    val lang = language?.trim()?.lowercase(Locale.US).orEmpty()
    val normLabel = label.trim().lowercase(Locale.US)
    return when {
        lang.isNotBlank() && lang != "und" -> "lang:$lang|$normLabel"
        else -> "label:$normLabel"
    }
}

private fun rematchTextId(previous: String, options: List<TextOption>): String {
    if (previous == "off" || previous == "auto") return previous
    if (options.any { it.id == previous }) return previous
    val lang = previous.removePrefix("lang:").substringBefore("|").takeIf {
        previous.startsWith("lang:")
    }
    if (!lang.isNullOrBlank()) {
        options.firstOrNull { it.id.startsWith("lang:$lang") }?.id?.let { return it }
    }
    val labelKey = when {
        previous.startsWith("label:") -> previous.removePrefix("label:")
        previous.startsWith("lang:") -> previous.substringAfter("|", "")
        else -> previous
    }
    if (labelKey.isNotBlank()) {
        options.firstOrNull {
            it.id == "label:$labelKey" || it.label.equals(labelKey, ignoreCase = true)
        }?.id?.let { return it }
    }
    return "auto"
}

@OptIn(UnstableApi::class)
private fun buildVideoOptions(tracks: Tracks): List<VideoOption> {
    data class Cand(val height: Int, val width: Int, val group: TrackGroup, val index: Int, val bitrate: Int)
    val cands = ArrayList<Cand>()
    for (i in 0 until tracks.groups.size) {
        val group = tracks.groups[i]
        if (group.type != C.TRACK_TYPE_VIDEO) continue
        val media = group.mediaTrackGroup
        for (t in 0 until group.length) {
            if (!group.isTrackSupported(t)) continue
            val format = group.getTrackFormat(t)
            val height = format.height
            if (height <= 0) continue
            cands += Cand(
                height = height,
                width = format.width.coerceAtLeast(0),
                group = media,
                index = t,
                bitrate = format.bitrate,
            )
        }
    }
    if (cands.isEmpty()) {
        return listOf(VideoOption(id = "auto", label = "Auto (best available)"))
    }
    // One row per unique height — keep the highest-bitrate variant for that height.
    val bestByHeight = cands
        .groupBy { it.height }
        .map { (_, list) -> list.maxBy { it.bitrate } }
        .sortedByDescending { it.height }
    val out = ArrayList<VideoOption>(bestByHeight.size + 1)
    out += VideoOption(id = "auto", label = "Auto (best available)")
    for (c in bestByHeight) {
        val label = when {
            c.height >= 2160 -> "2160p · 4K"
            c.height >= 1440 -> "1440p · QHD"
            c.height >= 1080 -> "1080p · Full HD"
            c.height >= 720 -> "720p · HD"
            c.height >= 480 -> "480p"
            else -> "${c.height}p"
        }
        out += VideoOption(
            id = "${c.height}p",
            label = label,
            height = c.height,
            width = c.width,
            mediaGroup = c.group,
            trackIndex = c.index,
        )
    }
    return out
}

private fun rematchVideoId(previous: String, options: List<VideoOption>): String {
    if (previous == "auto") return "auto"
    if (options.any { it.id == previous }) return previous
    val height = previous.removeSuffix("p").toIntOrNull()
    if (height != null) {
        options.firstOrNull { it.height == height }?.id?.let { return it }
        // Closest lower-or-equal height if the exact rung disappeared after a source switch.
        options.filter { it.height in 1..height }.maxByOrNull { it.height }?.id?.let { return it }
    }
    return "auto"
}

@OptIn(UnstableApi::class)
private fun applyVideoSelection(
    selector: DefaultTrackSelector,
    selectedId: String,
    options: List<VideoOption>,
) {
    val params = selector.buildUponParameters()
        .clearOverridesOfType(C.TRACK_TYPE_VIDEO)
    if (selectedId == "auto") {
        selector.parameters = params
            .setForceHighestSupportedBitrate(false)
            .setMaxVideoSize(Int.MAX_VALUE, Int.MAX_VALUE)
            .build()
        return
    }
    val concrete = options.firstOrNull { it.id == selectedId && it.mediaGroup != null }
    if (concrete?.mediaGroup != null) {
        selector.parameters = params
            .setOverrideForType(
                TrackSelectionOverride(concrete.mediaGroup, listOf(concrete.trackIndex)),
            )
            .build()
        return
    }
    // Fallback: cap by height parsed from id ("1080p").
    val height = selectedId.removeSuffix("p").toIntOrNull()
    selector.parameters = if (height != null && height > 0) {
        params.setMaxVideoSize(Int.MAX_VALUE, height).build()
    } else {
        params.build()
    }
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
        .setSelectUndeterminedTextLanguage(true)
        .setPreferredTextLanguage("en")
    if (!enabled || selectedId == "off") {
        selector.parameters = params
            .setTrackTypeDisabled(C.TRACK_TYPE_TEXT, true)
            .build()
        return
    }
    params.setTrackTypeDisabled(C.TRACK_TYPE_TEXT, false)
    val concrete = when (selectedId) {
        "auto" -> options.firstOrNull { it.mediaGroup != null }
            ?: options.firstOrNull {
                it.id != "off" && it.id != "auto" && it.mediaGroup != null
            }
        else -> options.firstOrNull { it.id == selectedId }
    }
    val mediaGroup = concrete?.mediaGroup
    if (mediaGroup != null) {
        params.setOverrideForType(
            TrackSelectionOverride(mediaGroup, listOf(concrete.trackIndex)),
        )
    }
    selector.parameters = params.build()
}

@OptIn(UnstableApi::class)
private fun applyCaptionStyle(playerView: PlayerView?, style: SubStyle) {
    val view = playerView?.subtitleView ?: return
    view.visibility = android.view.View.VISIBLE
    view.setApplyEmbeddedStyles(false)
    view.setApplyEmbeddedFontSizes(false)
    val alpha = (style.bgAlpha.coerceIn(0f, 1f) * 255).toInt().coerceIn(0, 255)
    // Backdrop modes approximate caption plates on Media3 SubtitleView.
    val (bg, window) = when (style.bgMode) {
        SubBgMode.None -> AndroidColor.TRANSPARENT to AndroidColor.TRANSPARENT
        SubBgMode.Soft -> AndroidColor.TRANSPARENT to AndroidColor.argb((alpha * 0.7f).toInt(), 0, 0, 0)
        SubBgMode.Blur -> AndroidColor.argb((alpha * 0.45f).toInt(), 16, 16, 18) to
            AndroidColor.argb(alpha, 0, 0, 0)
        SubBgMode.Solid -> AndroidColor.argb(alpha, 0, 0, 0) to AndroidColor.TRANSPARENT
    }
    view.setStyle(
        CaptionStyleCompat(
            style.color,
            bg,
            window,
            style.edgeType,
            AndroidColor.BLACK,
            Typeface.create(
                Typeface.SANS_SERIF,
                when {
                    style.bold && style.italic -> Typeface.BOLD_ITALIC
                    style.bold -> Typeface.BOLD
                    style.italic -> Typeface.ITALIC
                    else -> Typeface.NORMAL
                },
            ),
        ),
    )
    val metrics = view.resources.displayMetrics
    val sizeSp = style.sizeSp.coerceIn(SUB_SIZE_SP_MIN, SUB_SIZE_SP_MAX)
    // Exact sp → px. No hidden density floor that keeps captions oversized.
    val px = sizeSp * metrics.density
    view.setFixedTextSize(Cue.TEXT_SIZE_TYPE_ABSOLUTE, px)
    view.setBottomPaddingFraction(style.bottomPad.coerceIn(SUB_BOTTOM_MIN, SUB_BOTTOM_MAX))
}

private fun loadSubStyle(prefs: android.content.SharedPreferences): SubStyle {
    val version = prefs.getInt("sub_style_v", 0)
    if (version < SUB_STYLE_VERSION && stockCaptionLook(prefs)) return SubStyle()
    val bgMode = when (prefs.getString("sub_bg_mode", null)) {
        SubBgMode.None.name -> SubBgMode.None
        SubBgMode.Soft.name -> SubBgMode.Soft
        SubBgMode.Blur.name -> SubBgMode.Blur
        SubBgMode.Solid.name -> SubBgMode.Solid
        else -> if (prefs.getBoolean("sub_bg", true)) SubBgMode.Soft else SubBgMode.None
    }
    val storedSize = if (prefs.contains("sub_size_sp")) {
        prefs.getFloat("sub_size_sp", DEFAULT_SUB_SIZE_SP)
    } else {
        DEFAULT_SUB_SIZE_SP
    }
    // v4 replaces the old 10.5 default with a smaller one and leaves a custom size alone.
    val sizeSp = when {
        version >= SUB_STYLE_VERSION && prefs.contains("sub_size_sp") -> storedSize
        !prefs.contains("sub_size_sp") -> DEFAULT_SUB_SIZE_SP
        kotlin.math.abs(storedSize - 10.5f) < 0.25f -> DEFAULT_SUB_SIZE_SP
        else -> storedSize
    }
    // Persist Low→Top as saved. Only clamp to valid slider bounds — never rewrite Low up.
    val rawBottom = if (prefs.contains("sub_bottom")) {
        prefs.getFloat("sub_bottom", DEFAULT_SUB_BOTTOM_PAD)
    } else {
        DEFAULT_SUB_BOTTOM_PAD
    }
    val bottom = if (rawBottom.isFinite()) {
        rawBottom.coerceIn(SUB_BOTTOM_MIN, SUB_BOTTOM_MAX)
    } else {
        DEFAULT_SUB_BOTTOM_PAD
    }
    return SubStyle(
        sizeSp = sizeSp.coerceIn(SUB_SIZE_SP_MIN, SUB_SIZE_SP_MAX),
        bottomPad = bottom,
        color = prefs.getInt("sub_color", AndroidColor.WHITE),
        bgMode = bgMode,
        edgeType = prefs.getInt("sub_edge", CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW),
        bold = prefs.getBoolean("sub_bold", false),
        italic = prefs.getBoolean("sub_italic", false),
        bgAlpha = prefs.getFloat("sub_bg_alpha", 0.55f).let { if (it.isFinite()) it.coerceIn(0.15f, 1f) else 0.55f },
    )
}

/** True when the saved look is still a stock caption style we can replace. */
private fun stockCaptionLook(prefs: android.content.SharedPreferences): Boolean {
    if (!prefs.contains("sub_size_sp") && !prefs.contains("sub_bg_mode")) return true
    if (shadowStockFromOverlay(prefs)) return true
    val size = prefs.getFloat("sub_size_sp", 9f)
    val bg = prefs.getString("sub_bg_mode", SubBgMode.Soft.name)
    val edge = prefs.getInt("sub_edge", CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW)
    val color = prefs.getInt("sub_color", AndroidColor.WHITE)
    val bold = prefs.getBoolean("sub_bold", false)
    val previousSize = kotlin.math.abs(size - 9f) < 0.4f || kotlin.math.abs(size - 10.5f) < 0.25f
    return previousSize &&
        bg == SubBgMode.Soft.name &&
        edge == CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW &&
        color == AndroidColor.WHITE &&
        !bold
}

/**
 * The 1.2.7-dev.6 stock look: 20sp italic, no box, drop shadow, light grey.
 * That was written as soon as the player opened, so it is not a custom choice.
 */
private fun shadowStockFromOverlay(prefs: android.content.SharedPreferences): Boolean {
    if (!prefs.contains("sub_size_sp") || !prefs.contains("sub_edge")) return false
    val size = prefs.getFloat("sub_size_sp", 0f)
    val bottom = prefs.getFloat("sub_bottom", -1f)
    val alpha = prefs.getFloat("sub_bg_alpha", -1f)
    return kotlin.math.abs(size - 20f) < 0.4f &&
        kotlin.math.abs(bottom - 0.20f) < 0.02f &&
        kotlin.math.abs(alpha - 0.55f) < 0.02f &&
        prefs.getString("sub_bg_mode", null) == SubBgMode.None.name &&
        prefs.getInt("sub_edge", -1) == CaptionStyleCompat.EDGE_TYPE_DROP_SHADOW &&
        prefs.getInt("sub_color", 0) == AndroidColor.rgb(242, 242, 242) &&
        !prefs.getBoolean("sub_bold", true) &&
        prefs.getBoolean("sub_italic", false)
}

/** Italic outlined captions, clear of the control pills. A saved custom look is kept. */
private const val SUB_STYLE_VERSION = 6
private const val DEFAULT_SUB_SIZE_SP = 20f
private const val SUB_SIZE_SP_MIN = 8f
private const val SUB_SIZE_SP_MAX = 24f
/** Sits the line just above the progress bar and control pills. */
private const val DEFAULT_SUB_BOTTOM_PAD = 0.20f
private const val SUB_BOTTOM_MIN = 0.03f
private const val SUB_BOTTOM_MAX = 0.30f

private fun nudgeBrightness(context: android.content.Context, view: android.view.View, delta: Float): Float {
    val activity = context as? Activity ?: return 0.5f
    val current = activity.window.attributes.screenBrightness
    val base = if (current < 0f) 0.5f else current
    val next = (base + delta).coerceIn(0.01f, 1f)
    if (base <= 0.02f && next <= 0.02f || base >= 0.99f && next >= 0.99f) {
        KittyHaptics.perform(view, KittyHaptics.Kind.Tick)
    }
    activity.window.attributes = activity.window.attributes.apply { screenBrightness = next }
    return next
}

private fun nudgeVolume(context: android.content.Context, view: android.view.View, delta: Float): Float {
    val audio = context.getSystemService(android.media.AudioManager::class.java) ?: return 0f
    val stream = android.media.AudioManager.STREAM_MUSIC
    val max = audio.getStreamMaxVolume(stream).coerceAtLeast(1)
    val current = audio.getStreamVolume(stream)
    val steps = when {
        delta > 0.012f -> 1
        delta < -0.012f -> -1
        else -> 0
    }
    val next = (current + steps).coerceIn(0, max)
    if (steps != 0 && (next == 0 || next == max) && next != current) {
        KittyHaptics.perform(view, KittyHaptics.Kind.Tick)
    }
    if (next != current) audio.setStreamVolume(stream, next, 0)
    return next / max.toFloat()
}

private fun shortQuality(label: String): String {
    val m = Regex("""(\d{3,4}p)""", RegexOption.IGNORE_CASE).find(label)
    return m?.groupValues?.get(1) ?: label.take(12)
}

private fun resizeLabel(mode: Int): String = when (mode) {
    AspectRatioFrameLayout.RESIZE_MODE_ZOOM -> "Fill"
    AspectRatioFrameLayout.RESIZE_MODE_FILL -> "Stretch"
    else -> "Fit"
}

private fun speedLabel(speed: Float): String {
    return when {
        kotlin.math.abs(speed - 1f) < 0.01f -> "1×"
        speed == speed.toInt().toFloat() -> "${speed.toInt()}×"
        else -> String.format(Locale.US, "%.2g×", speed)
    }
}

@Composable
private fun LiveClockText(
    player: Player?,
    scrubbing: Boolean,
    scrubValue: Float,
    durationMs: Long,
    modifier: Modifier = Modifier,
) {
    var liveMs by remember { mutableLongStateOf(0L) }
    LaunchedEffect(player, scrubbing) {
        val p = player ?: return@LaunchedEffect
        while (true) {
            if (!scrubbing) {
                val next = p.currentPosition.coerceAtLeast(0L)
                if (next != liveMs) liveMs = next
            }
            delay(200)
        }
    }
    val shown = if (scrubbing) (scrubValue * durationMs).toLong() else liveMs
    Text(
        "${formatClockPadded(shown)} / ${formatClockPadded(durationMs)}",
        color = Color.White,
        fontSize = 13.sp,
        fontFamily = FontFamily.SansSerif,
        fontWeight = FontWeight.Medium,
        maxLines = 1,
        modifier = modifier,
    )
}

@Composable
private fun PlayerCapsule(content: @Composable androidx.compose.foundation.layout.RowScope.() -> Unit) {
    Row(
        modifier = Modifier
            .height(48.dp)
            .clip(RoundedCornerShape(999.dp))
            .background(Color.Black.copy(alpha = 0.58f))
            .horizontalScroll(rememberScrollState())
            .padding(horizontal = 6.dp),
        verticalAlignment = Alignment.CenterVertically,
        content = content,
    )
}

@Composable
private fun PillIcon(
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    description: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Icon(
            icon,
            contentDescription = description,
            tint = Color.White,
            modifier = Modifier.size(22.dp),
        )
    }
}

@Composable
private fun PillLabel(
    label: String,
    description: String,
    onClick: () -> Unit,
) {
    Box(
        modifier = Modifier
            .size(40.dp)
            .clip(CircleShape)
            .clearAndSetSemantics { contentDescription = description }
            .clickable(
                interactionSource = remember { MutableInteractionSource() },
                indication = null,
                onClick = onClick,
            ),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            color = Color.White,
            fontSize = 13.sp,
            fontFamily = FontFamily.SansSerif,
            fontWeight = FontWeight.Medium,
        )
    }
}

private fun capturePlayerFrame(context: android.content.Context, playerView: PlayerView?) {
    val surfaceView = playerView?.videoSurfaceView as? android.view.SurfaceView
    val surface = surfaceView?.holder?.surface
    if (surfaceView == null || surface == null || !surface.isValid ||
        surfaceView.width <= 0 || surfaceView.height <= 0
    ) {
        Toast.makeText(context, "Couldn't capture this frame", Toast.LENGTH_SHORT).show()
        return
    }
    val bitmap = android.graphics.Bitmap.createBitmap(
        surfaceView.width,
        surfaceView.height,
        android.graphics.Bitmap.Config.ARGB_8888,
    )
    android.view.PixelCopy.request(
        surfaceView,
        bitmap,
        { result ->
            if (result != android.view.PixelCopy.SUCCESS) {
                Toast.makeText(context, "Couldn't capture this frame", Toast.LENGTH_SHORT).show()
                return@request
            }
            val dir = java.io.File(context.cacheDir, "frames").apply { mkdirs() }
            val file = java.io.File(dir, "frame-${System.currentTimeMillis()}.png")
            val wrote = runCatching {
                file.outputStream().use { bitmap.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it) }
            }.isSuccess
            if (!wrote) {
                Toast.makeText(context, "Couldn't capture this frame", Toast.LENGTH_SHORT).show()
                return@request
            }
            val uri = androidx.core.content.FileProvider.getUriForFile(
                context,
                "${context.packageName}.fileprovider",
                file,
            )
            val share = android.content.Intent(android.content.Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(android.content.Intent.EXTRA_STREAM, uri)
                addFlags(android.content.Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            context.startActivity(
                android.content.Intent.createChooser(share, "Save frame")
                    .addFlags(android.content.Intent.FLAG_ACTIVITY_NEW_TASK),
            )
        },
        android.os.Handler(android.os.Looper.getMainLooper()),
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

private fun formatClockPadded(ms: Long): String {
    val total = TimeUnit.MILLISECONDS.toSeconds(ms.coerceAtLeast(0L))
    val h = total / 3600
    val m = (total % 3600) / 60
    val s = total % 60
    return if (h > 0) {
        String.format(Locale.US, "%d:%02d:%02d", h, m, s)
    } else {
        String.format(Locale.US, "%02d:%02d", m, s)
    }
}

private fun formatDurationMinutes(ms: Long): String {
    val minutes = TimeUnit.MILLISECONDS.toMinutes(ms.coerceAtLeast(0L)).coerceAtLeast(1L)
    return if (minutes == 1L) "1 minute" else "$minutes minutes"
}

private const val DEFAULT_UA =
    "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
