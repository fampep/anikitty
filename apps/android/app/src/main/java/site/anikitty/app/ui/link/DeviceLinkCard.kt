package site.anikitty.app.ui.link

import android.Manifest
import android.content.pm.PackageManager
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
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
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
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
import site.anikitty.app.data.link.DeviceEndpoint
import site.anikitty.app.data.link.DeviceLinkHost
import site.anikitty.app.data.link.DeviceLinkOffer
import site.anikitty.app.data.link.mergeWatchHistory
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.local.WatchHistoryEntity
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
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
    var showCode by remember { mutableStateOf(!isLinked) }
    LaunchedEffect(isLinked) {
        if (!isLinked) showCode = true
    }

    if (forTelevision && showCode) {
        DisposableEffect(Unit) {
            val host = DeviceLinkHost()
            offer = host.start(context) { payload ->
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
                        showCode = false
                        onLinked()
                        "Signed in as @${viewer.name}. Library updated from your phone."
                    }.getOrElse { friendlyFailure(it.message) }
                    onStatus(message)
                }
            }
            onDispose { host.stop() }
        }
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                "Link a device",
                color = KittyText,
                fontWeight = FontWeight.Bold,
                fontSize = 22.sp,
            )
            Text(
                "On your phone, open Account. Scan this code, or type it and pick the address below. Both devices need the same Wi-Fi.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodyMedium,
            )
            val current = offer
            if (current == null) {
                Text(
                    "Connect this TV to Wi-Fi, then open Account again.",
                    color = KittyFaint,
                    style = MaterialTheme.typography.bodyMedium,
                )
            } else {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    QrCodeImage(contents = current.uri, size = 168.dp)
                    Spacer(modifier = Modifier.width(22.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text(
                            "Type this code",
                            color = KittyMuted,
                            fontSize = 13.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                        Text(
                            current.code.toCharArray().joinToString(" "),
                            color = KittyText,
                            fontWeight = FontWeight.Black,
                            fontSize = 36.sp,
                            letterSpacing = 2.sp,
                        )
                        Text(
                            "This TV · ${current.host}",
                            color = KittyFaint,
                            fontSize = 14.sp,
                            fontWeight = FontWeight.SemiBold,
                        )
                    }
                }
            }
        }
        return
    }

    if (forTelevision) {
        Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
            Text(
                "This TV uses the same AniList account as your phone. Watch progress stays in sync.",
                color = KittyMuted,
                style = MaterialTheme.typography.bodyMedium,
            )
            Button(
                onClick = { showCode = true },
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittyAccent,
                    contentColor = KittyOnAccent,
                ),
            ) {
                Text("Link a phone", fontWeight = FontWeight.Bold)
            }
        }
        return
    }

    if (!forTelevision && isLinked) {
        val scanOptions = remember {
            GmsBarcodeScannerOptions.Builder()
                .setBarcodeFormats(Barcode.FORMAT_QR_CODE)
                .build()
        }
        var typed by remember { mutableStateOf("") }
        var endpoints by remember { mutableStateOf<List<DeviceEndpoint>>(emptyList()) }
        fun sendOffer(parsed: DeviceLinkOffer) {
            val token = aniListAuth.accessToken
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
                        endpoints = emptyList()
                        typed = ""
                        "Sent your account and library to the TV"
                    }.getOrElse { friendlyFailure(it.message ?: "Could not reach the TV") },
                )
                busy = false
            }
        }
        fun send(raw: String) {
            val parsed = DeviceLinkHost.parse(raw)
            if (parsed == null) {
                onStatus("That code is not an AniKitty TV")
                return
            }
            sendOffer(parsed)
        }
        fun findTv() {
            val code = DeviceLinkHost.normalizeCode(typed)
            if (code.length != 6) {
                onStatus("Type all 6 letters from the TV")
                return
            }
            scope.launch {
                busy = true
                endpoints = emptyList()
                val found = withContext(Dispatchers.IO) { DeviceLinkHost.discover(context) }
                endpoints = found
                onStatus(
                    when (found.size) {
                        0 -> "No TV is waiting on this Wi-Fi. Open Account on the TV."
                        1 -> "Found a TV at ${found[0].host}. It should match the address on the TV."
                        else -> "Found ${found.size} TVs. Pick the address shown on the TV."
                    },
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
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            "Or type the code",
            color = KittyText,
            fontWeight = FontWeight.SemiBold,
            fontSize = 13.sp,
        )
        Spacer(modifier = Modifier.height(6.dp))
        BasicTextField(
            value = typed,
            onValueChange = {
                typed = DeviceLinkHost.normalizeCode(it)
                endpoints = emptyList()
            },
            singleLine = true,
            textStyle = TextStyle(
                color = KittyText,
                fontSize = 22.sp,
                fontWeight = FontWeight.Black,
                letterSpacing = 3.sp,
            ),
            cursorBrush = SolidColor(KittyText),
            keyboardOptions = KeyboardOptions(
                capitalization = KeyboardCapitalization.Characters,
                imeAction = ImeAction.Go,
            ),
            keyboardActions = KeyboardActions(onGo = { if (!busy) findTv() }),
            modifier = Modifier
                .fillMaxWidth()
                .background(KittySurface, RoundedCornerShape(12.dp))
                .border(1.dp, KittyOutlineSoft, RoundedCornerShape(12.dp))
                .padding(horizontal = 14.dp, vertical = 12.dp),
            decorationBox = { inner ->
                Box {
                    if (typed.isEmpty()) {
                        Text("ABC234", color = KittyFaint, fontSize = 22.sp, letterSpacing = 3.sp)
                    }
                    inner()
                }
            },
        )
        Spacer(modifier = Modifier.height(8.dp))
        Button(
            onClick = { findTv() },
            enabled = !busy && typed.length == 6,
            modifier = Modifier.fillMaxWidth(),
            shape = RoundedCornerShape(12.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = KittyAccent,
                contentColor = KittyOnAccent,
            ),
        ) {
            Text(if (busy) "Looking…" else "Find the TV", fontWeight = FontWeight.Bold)
        }
        endpoints.forEach { endpoint ->
            Spacer(modifier = Modifier.height(8.dp))
            Button(
                onClick = {
                    sendOffer(DeviceLinkOffer(endpoint.host, endpoint.port, DeviceLinkHost.normalizeCode(typed)))
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
                shape = RoundedCornerShape(12.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittySurface,
                    contentColor = KittyText,
                ),
            ) {
                Text("Send to ${endpoint.host}", fontWeight = FontWeight.Bold)
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            "Scan the TV, or type its code and confirm the address matches the one on the screen. This phone’s AniList account and watch progress are copied there.",
            color = KittyMuted,
            style = MaterialTheme.typography.bodySmall,
            modifier = Modifier.padding(bottom = 4.dp),
        )
    }
}
