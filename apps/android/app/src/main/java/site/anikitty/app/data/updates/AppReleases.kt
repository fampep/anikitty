// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.updates

import android.content.Context
import android.content.Intent
import android.content.pm.PackageInfo
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import androidx.core.content.FileProvider
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import java.io.File
import java.util.concurrent.TimeUnit

enum class BuildChannel {
    Stable,
    Dev,
}

data class PullRequestChange(
    val number: Int,
    val title: String,
    val url: String,
)

data class PublishedBuild(
    val versionName: String,
    val tag: String,
    val prerelease: Boolean,
    val publishedAt: String,
    val notes: String,
    val apkUrl: String,
    val pullRequests: List<PullRequestChange>,
) {
    val channel: BuildChannel
        get() = if (prerelease) BuildChannel.Dev else BuildChannel.Stable
}

class BuildChannelStore(context: Context) {
    private val prefs = context.getSharedPreferences("anikitty_builds", Context.MODE_PRIVATE)

    fun get(): BuildChannel? = when (prefs.getString(KEY, null)) {
        "dev" -> BuildChannel.Dev
        "stable" -> BuildChannel.Stable
        else -> null
    }

    fun set(channel: BuildChannel) {
        prefs.edit().putString(KEY, if (channel == BuildChannel.Dev) "dev" else "stable").apply()
    }

    private companion object {
        const val KEY = "channel"
    }
}

class AppReleaseClient(
    private val http: OkHttpClient = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(60, TimeUnit.SECONDS)
        .build(),
) {
    suspend fun load(): List<PublishedBuild> = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url("https://api.github.com/repos/fampep/anikitty/releases?per_page=30")
            .header("User-Agent", "AniKitty")
            .header("Accept", "application/vnd.github+json")
            .build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("Releases returned ${response.code}")
            val body = response.body?.string().orEmpty()
            parseReleases(JSONArray(body))
        }
    }

    suspend fun download(url: String, dest: File, onProgress: (Int) -> Unit) = withContext(Dispatchers.IO) {
        val request = Request.Builder()
            .url(url)
            .header("User-Agent", "AniKitty")
            .header("Accept", "application/vnd.android.package-archive")
            .build()
        http.newCall(request).execute().use { response ->
            if (!response.isSuccessful) error("Download returned ${response.code}")
            val payload = response.body ?: error("Empty download")
            val total = payload.contentLength().coerceAtLeast(0L)
            dest.parentFile?.mkdirs()
            payload.byteStream().use { input ->
                dest.outputStream().use { output ->
                    val buffer = ByteArray(DEFAULT_BUFFER_SIZE)
                    var readTotal = 0L
                    while (true) {
                        val n = input.read(buffer)
                        if (n < 0) break
                        output.write(buffer, 0, n)
                        readTotal += n
                        if (total > 0L) {
                            onProgress(((readTotal * 100L) / total).toInt().coerceIn(0, 100))
                        }
                    }
                }
            }
        }
    }
}

fun parseReleases(array: JSONArray): List<PublishedBuild> {
    val out = ArrayList<PublishedBuild>(array.length())
    for (i in 0 until array.length()) {
        val item = array.optJSONObject(i) ?: continue
        if (item.optBoolean("draft")) continue
        val apk = item.optJSONArray("assets").apkUrl() ?: continue
        val tag = item.optString("tag_name")
        val name = item.optString("name").ifBlank { tag.removePrefix("v") }
        val notes = item.optString("body")
        out += PublishedBuild(
            versionName = name,
            tag = tag,
            prerelease = item.optBoolean("prerelease"),
            publishedAt = item.optString("published_at"),
            notes = notes,
            apkUrl = apk,
            pullRequests = parsePullRequests(notes),
        )
    }
    return out
}

fun parsePullRequests(notes: String): List<PullRequestChange> {
    if (notes.isBlank()) return emptyList()
    return notes.replace("\r\n", "\n").lineSequence().mapNotNull { raw ->
        val line = raw.trim()
        val match = PR_LINE.matchEntire(line) ?: return@mapNotNull null
        PullRequestChange(
            number = match.groupValues[3].toInt(),
            title = match.groupValues[1].trim(),
            url = match.groupValues[2],
        )
    }.toList()
}

fun devBuildsSinceStable(releases: List<PublishedBuild>): List<PublishedBuild> {
    val stableAt = releases.filter { !it.prerelease }.maxOfOrNull { it.publishedAt } ?: ""
    return releases
        .filter { it.prerelease && it.publishedAt >= stableAt }
        .sortedByDescending { it.publishedAt }
}

private fun JSONArray?.apkUrl(): String? {
    if (this == null) return null
    for (i in 0 until length()) {
        val asset = optJSONObject(i) ?: continue
        val name = asset.optString("name")
        val url = asset.optString("browser_download_url")
        if (name.endsWith(".apk") && url.startsWith("https://")) return url
    }
    return null
}

private val PR_LINE = Regex(
    """^\*\s+(.+?)\s+by\s+@\S+\s+in\s+(https://github\.com/\S+/pull/(\d+))\s*$""",
)

sealed class InstallDecision {
    data object AlreadyInstalled : InstallDecision()
    data class Install(val apk: File) : InstallDecision()
    data class ReplaceFirst(val reason: String) : InstallDecision()
}

fun decideInstall(context: Context, apk: File, versionName: String): InstallDecision {
    if (versionName == installedVersionName()) return InstallDecision.AlreadyInstalled
    val archive = readArchive(context, apk) ?: return InstallDecision.Install(apk)
    val currentCode = installedVersionCode()
    val signaturesDiffer = archive.certs.isNotEmpty() &&
        currentCerts(context).isNotEmpty() &&
        archive.certs.none { theirs -> currentCerts(context).any { it.contentEquals(theirs) } }
    if (signaturesDiffer) {
        return InstallDecision.ReplaceFirst(
            "This build is signed with a different key than the app on this phone. Android will not update over it. Uninstall AniKitty, then install the download.",
        )
    }
    if (archive.versionCode in 1 until currentCode) {
        return InstallDecision.ReplaceFirst(
            "This build is older than the one on this phone. Android will not replace a newer build with an older one. Uninstall AniKitty, then install the download.",
        )
    }
    return InstallDecision.Install(apk)
}

fun installApk(context: Context, apk: File) {
    val uri = FileProvider.getUriForFile(context, "${context.packageName}.fileprovider", apk)
    val intent = Intent(Intent.ACTION_VIEW).apply {
        setDataAndType(uri, "application/vnd.android.package-archive")
        addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
}

fun openDownload(context: Context, url: String) {
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url)).apply {
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
}

fun uninstallThisApp(context: Context) {
    val intent = Intent(Intent.ACTION_DELETE).apply {
        data = Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
}

fun canRequestInstall(context: Context): Boolean = context.packageManager.canRequestPackageInstalls()

fun openInstallPermission(context: Context) {
    val intent = Intent(android.provider.Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES).apply {
        data = Uri.parse("package:${context.packageName}")
        addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
    }
    context.startActivity(intent)
}

private data class ArchiveInfo(val versionCode: Long, val certs: List<ByteArray>)

private fun readArchive(context: Context, apk: File): ArchiveInfo? {
    val flags = signingFlags()
    val info = context.packageManager.getPackageArchiveInfo(apk.absolutePath, flags) ?: return null
    info.applicationInfo?.apply {
        sourceDir = apk.absolutePath
        publicSourceDir = apk.absolutePath
    }
    return ArchiveInfo(versionCodeOf(info), certBytes(info))
}

private fun currentCerts(context: Context): List<ByteArray> {
    val info = if (Build.VERSION.SDK_INT >= 33) {
        context.packageManager.getPackageInfo(
            context.packageName,
            PackageManager.PackageInfoFlags.of(signingFlags().toLong()),
        )
    } else {
        @Suppress("DEPRECATION")
        context.packageManager.getPackageInfo(context.packageName, signingFlags())
    }
    return certBytes(info)
}

private fun installedVersionCode(): Long = site.anikitty.app.BuildConfig.VERSION_CODE.toLong()

private fun installedVersionName(): String = site.anikitty.app.BuildConfig.VERSION_NAME

private fun signingFlags(): Int =
    if (Build.VERSION.SDK_INT >= 28) PackageManager.GET_SIGNING_CERTIFICATES else {
        @Suppress("DEPRECATION")
        PackageManager.GET_SIGNATURES
    }

private fun versionCodeOf(info: PackageInfo): Long =
    if (Build.VERSION.SDK_INT >= 28) info.longVersionCode else {
        @Suppress("DEPRECATION")
        info.versionCode.toLong()
    }

private fun certBytes(info: PackageInfo): List<ByteArray> {
    if (Build.VERSION.SDK_INT >= 28) {
        val signing = info.signingInfo ?: return emptyList()
        val signers = if (signing.hasMultipleSigners()) {
            signing.apkContentsSigners
        } else {
            signing.signingCertificateHistory
        }
        return signers?.map { it.toByteArray() }.orEmpty()
    }
    @Suppress("DEPRECATION")
    return info.signatures?.map { it.toByteArray() }.orEmpty()
}
