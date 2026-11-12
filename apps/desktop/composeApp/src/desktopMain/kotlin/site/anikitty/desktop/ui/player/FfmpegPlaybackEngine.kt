package site.anikitty.desktop.ui.player

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.graphics.ImageBitmap
import androidx.compose.ui.graphics.toComposeImageBitmap
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.jetbrains.skia.Image
import site.anikitty.desktop.data.stream.PlayableSource
import java.io.BufferedInputStream
import java.util.concurrent.atomic.AtomicBoolean
import java.util.concurrent.atomic.AtomicLong
import kotlin.math.max

/**
 * AniKitty desktop playback engine — system FFmpeg pipe into Compose frames.
 * Same glass player chrome as Android; not VLC. Supports custom HTTP headers
 * (Settlar keyProof) via ffmpeg `-headers`.
 */
class FfmpegPlaybackEngine(
    private val scope: CoroutineScope,
) {
    var frame by mutableStateOf<ImageBitmap?>(null)
        private set
    var positionMs by mutableStateOf(0L)
        private set
    var durationMs by mutableStateOf(0L)
        private set
    var playing by mutableStateOf(false)
        private set
    var ready by mutableStateOf(false)
        private set
    var error by mutableStateOf<String?>(null)
        private set
    var videoWidth by mutableStateOf(1280)
        private set
    var videoHeight by mutableStateOf(720)
        private set

    private var process: Process? = null
    private var pumpJob: Job? = null
    private var tickerJob: Job? = null
    private val startedAt = AtomicLong(0L)
    private val baseOffsetMs = AtomicLong(0L)
    private val paused = AtomicBoolean(false)
    private var current: PlayableSource? = null

    fun play(source: PlayableSource, startMs: Long = 0L) {
        stop()
        current = source
        error = null
        ready = false
        playing = true
        paused.set(false)
        baseOffsetMs.set(startMs.coerceAtLeast(0L))
        positionMs = baseOffsetMs.get()
        scope.launch(Dispatchers.IO) {
            try {
                probe(source)
                startPipe(source, baseOffsetMs.get())
            } catch (t: Throwable) {
                error = t.message ?: "Playback failed"
                playing = false
                ready = false
            }
        }
    }

    fun togglePlayPause() {
        if (!ready && error == null) return
        if (playing) {
            pause()
        } else {
            resume()
        }
    }

    fun pause() {
        if (!playing) return
        playing = false
        paused.set(true)
        val elapsed = System.currentTimeMillis() - startedAt.get()
        baseOffsetMs.addAndGet(max(0L, elapsed))
        positionMs = baseOffsetMs.get()
        destroyProcess()
    }

    fun resume() {
        val source = current ?: return
        if (playing) return
        paused.set(false)
        playing = true
        error = null
        scope.launch(Dispatchers.IO) {
            runCatching { startPipe(source, baseOffsetMs.get()) }
                .onFailure {
                    error = it.message ?: "Resume failed"
                    playing = false
                }
        }
    }

    fun seekTo(ms: Long) {
        val source = current ?: return
        val target = ms.coerceIn(0L, if (durationMs > 0) durationMs else Long.MAX_VALUE)
        baseOffsetMs.set(target)
        positionMs = target
        destroyProcess()
        if (playing || !paused.get()) {
            playing = true
            paused.set(false)
            scope.launch(Dispatchers.IO) {
                runCatching { startPipe(source, target) }
                    .onFailure {
                        error = it.message ?: "Seek failed"
                        playing = false
                    }
            }
        }
    }

    fun stop() {
        playing = false
        paused.set(false)
        ready = false
        destroyProcess()
        pumpJob?.cancel()
        tickerJob?.cancel()
        frame = null
    }

    private fun destroyProcess() {
        process?.let { p ->
            runCatching { p.destroyForcibly() }
        }
        process = null
    }

    private fun probe(source: PlayableSource) {
        val headerArg = ffmpegHeaders(source.headers)
        val cmd = mutableListOf(
            "ffprobe", "-v", "error",
            "-show_entries", "format=duration:stream=width,height",
            "-of", "json",
        )
        if (headerArg != null) {
            cmd += listOf("-headers", headerArg)
        }
        cmd += source.url
        val proc = ProcessBuilder(cmd)
            .redirectErrorStream(true)
            .start()
        val out = proc.inputStream.bufferedReader().readText()
        proc.waitFor()
        val dur = Regex(""""duration"\s*:\s*"([0-9.]+)"""").find(out)
            ?.groupValues?.get(1)?.toDoubleOrNull()
        if (dur != null && dur > 0) {
            durationMs = (dur * 1000.0).toLong()
        }
        val w = Regex(""""width"\s*:\s*(\d+)""").find(out)?.groupValues?.get(1)?.toIntOrNull()
        val h = Regex(""""height"\s*:\s*(\d+)""").find(out)?.groupValues?.get(1)?.toIntOrNull()
        if (w != null && h != null && w > 16 && h > 16) {
            videoWidth = w.coerceAtMost(1280)
            // keep aspect
            videoHeight = ((videoWidth.toDouble() / w) * h).toInt().coerceAtLeast(180)
        }
    }

    private fun startPipe(source: PlayableSource, startMs: Long) {
        destroyProcess()
        val headerArg = ffmpegHeaders(source.headers)
        val targetW = videoWidth
        val targetH = videoHeight
        val cmd = mutableListOf("ffmpeg", "-hide_banner", "-loglevel", "error")
        if (startMs > 0) {
            cmd += listOf("-ss", formatTs(startMs))
        }
        if (headerArg != null) {
            cmd += listOf("-headers", headerArg)
        }
        cmd += listOf(
            "-i", source.url,
            "-an",
            "-vf", "scale=${targetW}:${targetH}",
            "-f", "rawvideo",
            "-pix_fmt", "rgba",
            "-vsync", "cfr",
            "-r", "24",
            "pipe:1",
        )
        val proc = ProcessBuilder(cmd)
            .redirectError(ProcessBuilder.Redirect.PIPE)
            .start()
        process = proc
        startedAt.set(System.currentTimeMillis())
        ready = true

        tickerJob?.cancel()
        tickerJob = scope.launch {
            while (isActive && playing && !paused.get()) {
                val elapsed = System.currentTimeMillis() - startedAt.get()
                positionMs = baseOffsetMs.get() + elapsed
                if (durationMs > 0 && positionMs >= durationMs) {
                    playing = false
                    break
                }
                delay(250)
            }
        }

        pumpJob?.cancel()
        pumpJob = scope.launch(Dispatchers.IO) {
            val frameBytes = targetW * targetH * 4
            val buf = ByteArray(frameBytes)
            val input = BufferedInputStream(proc.inputStream, frameBytes * 2)
            try {
                while (isActive && playing && !paused.get()) {
                    var read = 0
                    while (read < frameBytes) {
                        val n = input.read(buf, read, frameBytes - read)
                        if (n < 0) {
                            playing = false
                            return@launch
                        }
                        read += n
                    }
                    val skia = Image.makeRaster(
                        imageInfo = org.jetbrains.skia.ImageInfo.makeN32Premul(targetW, targetH),
                        bytes = buf,
                        rowBytes = targetW * 4,
                    )
                    val bmp = skia.toComposeImageBitmap()
                    withContext(Dispatchers.Main) {
                        frame = bmp
                    }
                }
            } catch (t: Throwable) {
                if (playing) {
                    withContext(Dispatchers.Main) {
                        error = t.message ?: "Decode failed"
                        playing = false
                    }
                }
            } finally {
                runCatching { input.close() }
                runCatching { proc.destroyForcibly() }
            }
        }
    }

    private fun ffmpegHeaders(headers: Map<String, String>): String? {
        if (headers.isEmpty()) return null
        // ffmpeg wants CRLF-separated header lines ending with CRLF.
        return headers.entries.joinToString("\r\n") { "${it.key}: ${it.value}" } + "\r\n"
    }

    private fun formatTs(ms: Long): String {
        val totalSec = ms / 1000.0
        return String.format("%.3f", totalSec)
    }
}
