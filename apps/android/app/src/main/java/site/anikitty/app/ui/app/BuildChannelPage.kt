package site.anikitty.app.ui.app

import android.content.Intent
import android.net.Uri
import androidx.activity.compose.BackHandler
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBars
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.windowInsetsPadding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.rounded.ArrowBack
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import kotlinx.coroutines.launch
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.updates.AppReleaseClient
import site.anikitty.app.data.updates.BuildChannel
import site.anikitty.app.data.updates.BuildChannelStore
import site.anikitty.app.data.updates.InstallDecision
import site.anikitty.app.data.updates.PublishedBuild
import site.anikitty.app.data.updates.PullRequestChange
import site.anikitty.app.data.updates.canRequestInstall
import site.anikitty.app.data.updates.decideInstall
import site.anikitty.app.data.updates.devBuildsSinceStable
import site.anikitty.app.data.updates.installApk
import site.anikitty.app.data.updates.openDownload
import site.anikitty.app.data.updates.openInstallPermission
import site.anikitty.app.data.updates.uninstallThisApp
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittySurfaceElevated
import site.anikitty.app.ui.theme.KittyText
import java.io.File
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable
fun AppBuildsRow(onClick: () -> Unit) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .clip(RoundedCornerShape(16.dp))
            .background(KittySurface)
            .border(1.dp, KittyOutlineSoft, RoundedCornerShape(16.dp))
            .clickable(onClick = onClick)
            .padding(16.dp),
    ) {
        Text("App builds", color = KittyText, fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
        Spacer(modifier = Modifier.height(4.dp))
        Text(
            "Choose dev or stable, and read the pull requests in each.",
            color = KittyMuted,
            fontSize = 13.sp,
        )
    }
}

@Composable
fun BuildChannelPage(onBack: () -> Unit) {
    BackHandler(onBack = onBack)
    val context = LocalContext.current
    val store = remember { BuildChannelStore(context) }
    val client = remember { AppReleaseClient() }
    val scope = rememberCoroutineScope()
    val installed = BuildConfig.VERSION_NAME
    val installedChannel = if (installed.contains("-dev.")) BuildChannel.Dev else BuildChannel.Stable
    var channel by remember {
        mutableStateOf(store.get() ?: installedChannel)
    }
    var releases by remember { mutableStateOf<List<PublishedBuild>>(emptyList()) }
    var loading by remember { mutableStateOf(true) }
    var error by remember { mutableStateOf<String?>(null) }
    var busy by remember { mutableStateOf(false) }
    var progress by remember { mutableIntStateOf(-1) }
    var notice by remember { mutableStateOf<String?>(null) }
    var replaceUrl by remember { mutableStateOf<String?>(null) }

    fun reload() {
        loading = true
        error = null
        scope.launch {
            runCatching { client.load() }
                .onSuccess {
                    releases = it
                    loading = false
                }
                .onFailure {
                    error = friendlyFailure(it.message ?: "Couldn't load releases")
                    loading = false
                }
        }
    }

    LaunchedEffect(Unit) { reload() }

    val stable = releases.filter { !it.prerelease }.maxByOrNull { it.publishedAt }
    val devs = devBuildsSinceStable(releases)
    val latestDev = devs.firstOrNull()
    val selectedBuild = if (channel == BuildChannel.Dev) latestDev else stable
    val groups = if (channel == BuildChannel.Dev) devs else listOfNotNull(stable)

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .windowInsetsPadding(WindowInsets.statusBars),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 28.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                IconButton(onClick = onBack) {
                    Icon(Icons.AutoMirrored.Rounded.ArrowBack, contentDescription = "Back", tint = KittyText)
                }
                Column {
                    Text("App", color = KittyText, fontWeight = FontWeight.Bold, fontSize = 22.sp)
                    Text(
                        "On this phone · $installed",
                        color = KittyMuted,
                        fontSize = 13.sp,
                    )
                }
            }
        }
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                ChannelCard(
                    title = "Stable",
                    subtitle = "Everyday build",
                    selected = channel == BuildChannel.Stable,
                    onThisPhone = installedChannel == BuildChannel.Stable,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        channel = BuildChannel.Stable
                        store.set(BuildChannel.Stable)
                        notice = null
                        replaceUrl = null
                    },
                )
                ChannelCard(
                    title = "Dev",
                    subtitle = "Newest changes",
                    selected = channel == BuildChannel.Dev,
                    onThisPhone = installedChannel == BuildChannel.Dev,
                    modifier = Modifier.weight(1f),
                    onClick = {
                        channel = BuildChannel.Dev
                        store.set(BuildChannel.Dev)
                        notice = null
                        replaceUrl = null
                    },
                )
            }
        }
        item {
            Text(
                if (channel == BuildChannel.Dev) {
                    "The dev build is published when new code is merged. These pull requests are the changes since the stable build."
                } else {
                    "The stable build is the version for everyday watching. These pull requests are what shipped in it."
                },
                color = KittyMuted,
                fontSize = 14.sp,
                lineHeight = 20.sp,
            )
        }
        when {
            loading -> item {
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
                    horizontalArrangement = Arrangement.Center,
                ) {
                    CircularProgressIndicator(color = KittyAccent, modifier = Modifier.size(28.dp))
                }
            }
            error != null -> item {
                Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    Text(error ?: "Couldn't load releases", color = KittyText, fontSize = 14.sp)
                    OutlinedButton(onClick = { reload() }) {
                        Text("Try again", color = KittyText)
                    }
                }
            }
            selectedBuild == null -> item {
                Text(
                    if (channel == BuildChannel.Dev) "No dev build has been published yet."
                    else "No stable build has been published yet.",
                    color = KittyText,
                    fontSize = 14.sp,
                )
            }
            else -> {
                item {
                    val build = selectedBuild
                    val installedThis = build.versionName == installed
                    Button(
                        onClick = {
                            if (installedThis || busy) return@Button
                            if (!canRequestInstall(context)) {
                                notice = "Allow AniKitty to install builds, then try again."
                                openInstallPermission(context)
                                return@Button
                            }
                            busy = true
                            progress = 0
                            notice = null
                            replaceUrl = null
                            scope.launch {
                                runCatching {
                                    val dest = File(context.cacheDir, "updates/${build.versionName}.apk")
                                    client.download(build.apkUrl, dest) { progress = it }
                                    decideInstall(context, dest, build.versionName)
                                }.onSuccess { decision ->
                                    when (decision) {
                                        InstallDecision.AlreadyInstalled -> notice = "This build is already installed."
                                        is InstallDecision.Install -> installApk(context, decision.apk)
                                        is InstallDecision.ReplaceFirst -> {
                                            notice = decision.reason
                                            replaceUrl = build.apkUrl
                                        }
                                    }
                                }.onFailure {
                                    notice = it.message ?: "Couldn't download that build"
                                }
                                busy = false
                                progress = -1
                            }
                        },
                        enabled = !installedThis && !busy,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(14.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = KittyAccent,
                            contentColor = KittyOnAccent,
                            disabledContainerColor = KittySurfaceElevated,
                            disabledContentColor = KittyMuted,
                        ),
                    ) {
                        Text(
                            when {
                                busy && progress >= 0 -> "Downloading $progress%"
                                installedThis -> "Installed"
                                else -> "Install ${build.versionName}"
                            },
                            fontWeight = FontWeight.Bold,
                        )
                    }
                    if (!notice.isNullOrBlank()) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Text(notice ?: "", color = KittyMuted, fontSize = 13.sp, lineHeight = 18.sp)
                    }
                    if (replaceUrl != null) {
                        Spacer(modifier = Modifier.height(8.dp))
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            OutlinedButton(onClick = { openDownload(context, replaceUrl!!) }) {
                                Text("Download", color = KittyText, fontWeight = FontWeight.SemiBold)
                            }
                            OutlinedButton(onClick = { uninstallThisApp(context) }) {
                                Text("Uninstall", color = KittyText, fontWeight = FontWeight.SemiBold)
                            }
                        }
                    }
                }
                groups.forEach { build ->
                    item(key = build.tag) {
                        Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
                            Text(
                                build.versionName,
                                color = KittyText,
                                fontWeight = FontWeight.Bold,
                                fontSize = 16.sp,
                            )
                            Text(
                                formatReleaseDate(build.publishedAt),
                                color = KittyFaint,
                                fontSize = 12.sp,
                            )
                        }
                    }
                    if (build.pullRequests.isEmpty()) {
                        item(key = "${build.tag}-empty") {
                            Text(
                                "This release has no pull request list.",
                                color = KittyMuted,
                                fontSize = 13.sp,
                            )
                        }
                    } else {
                        items(build.pullRequests, key = { "${build.tag}-${it.number}" }) { change ->
                            PullRequestRow(change)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChannelCard(
    title: String,
    subtitle: String,
    selected: Boolean,
    onThisPhone: Boolean,
    modifier: Modifier = Modifier,
    onClick: () -> Unit,
) {
    val shape = RoundedCornerShape(16.dp)
    Column(
        modifier = modifier
            .clip(shape)
            .background(if (selected) KittyAccent else KittySurface)
            .border(1.dp, if (selected) KittyAccent else KittyOutlineSoft, shape)
            .clickable(onClick = onClick)
            .padding(horizontal = 14.dp, vertical = 14.dp),
        verticalArrangement = Arrangement.spacedBy(4.dp),
    ) {
        Text(
            title,
            color = if (selected) KittyOnAccent else KittyText,
            fontWeight = FontWeight.Bold,
            fontSize = 16.sp,
        )
        Text(
            subtitle,
            color = if (selected) KittyOnAccent.copy(alpha = 0.7f) else KittyMuted,
            fontSize = 12.sp,
        )
        if (onThisPhone) {
            Text(
                "On this phone",
                color = if (selected) KittyOnAccent else KittyFaint,
                fontSize = 11.sp,
                fontWeight = FontWeight.SemiBold,
            )
        }
    }
}

@Composable
private fun PullRequestRow(change: PullRequestChange) {
    val context = LocalContext.current
    val shape = RoundedCornerShape(14.dp)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .clip(shape)
            .background(KittySurface)
            .border(1.dp, KittyOutlineSoft, shape)
            .clickable {
                context.startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(change.url)))
            }
            .padding(horizontal = 12.dp, vertical = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(
            "#${change.number}",
            modifier = Modifier
                .clip(RoundedCornerShape(8.dp))
                .background(KittySurfaceElevated)
                .padding(horizontal = 8.dp, vertical = 4.dp),
            color = KittyText,
            fontWeight = FontWeight.Bold,
            fontSize = 12.sp,
        )
        Text(
            change.title,
            color = KittyText,
            fontSize = 14.sp,
            lineHeight = 18.sp,
            fontWeight = FontWeight.Medium,
            maxLines = 3,
            overflow = TextOverflow.Ellipsis,
            modifier = Modifier.weight(1f),
        )
    }
}

private fun formatReleaseDate(raw: String): String {
    return runCatching {
        val zoned = OffsetDateTime.parse(raw).atZoneSameInstant(ZoneId.systemDefault())
        DateTimeFormatter.ofPattern("d MMM yyyy", Locale.getDefault()).format(zoned)
    }.getOrDefault(raw.take(10))
}
