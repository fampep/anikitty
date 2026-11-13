package site.anikitty.app.ui.link

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.rememberUpdatedState
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.content.ContextCompat
import com.google.mlkit.vision.barcode.common.Barcode
import com.google.mlkit.vision.codescanner.GmsBarcodeScannerOptions
import com.google.mlkit.vision.codescanner.GmsBarcodeScanning
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.friendlyFailure
import site.anikitty.app.data.link.DeviceLinkHost
import site.anikitty.app.data.link.DeviceLinkOffer
import site.anikitty.app.data.link.mergeWatchHistory
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyText

/**
 * TV shows the code. The phone scans it and sends the AniList account plus
 * the on-device library. Later episode updates keep syncing through AniList.
 */
@Composable
fun DeviceLinkCard(
    forTelevision: Boolean,
    isLinked: Boolean,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    history: List<WatchHistoryEntity>,
    pendingPairUri: String? = null,
    onConsumedPairUri: () -> Unit = {},
    onStatus: (String) -> Unit,
    onLinked: () -> Unit,
) {
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    val latestHistory by rememberUpdatedState(history)
    var offer by remember { mutableStateOf<DeviceLinkOffer?>(null) }
    var busy by remember { mutableStateOf(false) }

    if (forTelevision && !isLinked) {
        DisposableEffect(Unit) {
            val host = DeviceLinkHost()
            offer = host.start { payload ->
                scope.launch {
                    val message = runCatching {
                        val viewer = withContext(Dispatchers.IO) {
                            aniList.viewer(payload.token)
                        } ?: error("AniList did not accept that sign-in")
                        aniListAuth.saveViewer(payload.token, viewer)
                        withContext(Dispatchers.IO) {
                            mergeWatchHistory(historyDao, payload.history)
                            runCatching { aniListSync.pull() }
                        }
                        onLinked()
                        "Signed in as @${viewer.name}. Library updated from your phone."
                    }.getOrElse { friendlyFailure(it.message) }
                    onStatus(message)
                }
            }
            onDispose { host.stop() }
        }
        Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Text(
                "Link this TV",
                color = KittyText,
                fontWeight = FontWeight.Bold,
                fontSize = 18.sp,
            )
            Text(
                "On your phone, open AniKitty, go to Account, and tap Scan TV code. Both devices need the same Wi-Fi.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodySmall,
            )
            val current = offer
            if (current == null) {
                Text(
                    "Connect this TV to Wi-Fi, then open Account again.",
                    color = KittyFaint,
                    style = MaterialTheme.typography.bodySmall,
                )
            } else {
                QrCodeImage(contents = current.uri)
                Text(
                    "Code ${current.code}",
                    color = KittyText,
                    fontWeight = FontWeight.Black,
                    fontSize = 22.sp,
                    letterSpacing = 2.sp,
                )
            }
        }
        return
    }

    if (forTelevision && isLinked) {
        Text(
            "This TV uses the same AniList account as your phone. Watch progress stays in sync.",
            color = KittyMuted,
            style = MaterialTheme.typography.bodySmall,
        )
        return
    }

    if (!forTelevision && isLinked) {
        val scanOptions = remember {
            GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        }
        fun send(raw: String) {
            val parsed = DeviceLinkHost.parse(raw)
            val token = aniListAuth.accessToken
            if (parsed == null) {
                onStatus("That code is not an AniKitty TV")
                return
            }
            if (token.isNullOrBlank()) {
                onStatus("Sign in on this phone first")
                return
            }
            scope.launch {
                busy = true
                onStatus(
                    runCatching {
                        withContext(Dispatchers.IO) {
                            DeviceLinkHost.send(parsed, token, latestHistory)
                        }
                        "Sent your account and library to the TV"
                    }.getOrElse { friendlyFailure(it.message ?: "Could not reach the TV") },
                )
                busy = false
            }
        }
        LaunchedEffect(pendingPairUri) {
            val raw = pendingPairUri ?: return@LaunchedEffect
            onConsumedPairUri()
            send(raw)
        }
        val permission = rememberLauncherForActivityResult(
            ActivityResultContracts.RequestPermission(),
        ) { granted ->
            if (!granted) {
                onStatus("Camera permission is needed to scan the TV")
                return@rememberLauncherForActivityResult
            }
            GmsBarcodeScanning.getClient(context, scanOptions)
                .startScan()
                .addOnSuccessListener { barcode -> barcode.rawValue?.let(::send) }
                .addOnCanceledListener { }
                .addOnFailureListener { error ->
                    onStatus(friendlyFailure(error.message ?: "Could not open the camera"))
                }
        }
        Button(
            onClick = {
                val granted = ContextCompat.checkSelfPermission(
                    context,
                    Manifest.permission.CAMERA,
                ) == PackageManager.PERMISSION_GRANTED
                if (granted) {
                    GmsBarcodeScanning.getClient(context, scanOptions)
                        .startScan()
                        .addOnSuccessListener { barcode -> barcode.rawValue?.let(::send) }
                        .addOnCanceledListener { }
                        .addOnFailureListener { error ->
                            onStatus(friendlyFailure(error.message ?: "Could not open the camera"))
                        }
                } else {
                    permission.launch(Manifest.permission.CAMERA)
                }
            },
            enabled = !busy,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = KittyAccent,
                contentColor = KittyOnAccent,
            ),
        ) {
            Text(if (busy) "Sending…" else "Scan TV code", fontWeight = FontWeight.Bold)
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Point the camera at the code on the TV. This phone’s AniList account and watch progress are copied there.",
            color = KittyMuted,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(bottom = 4.dp),
        )
    }
}
