package site.anikitty.app.ui.app

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.foundation.rememberScrollState
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.anikitty.app.R
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.auth.SavedPassphraseStore
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyAtmosphere
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText

/**
 * AniList sign-in is the account. Lists, progress, and profile come from AniList.
 */
@Composable
fun AppRoot(
    api: DedicatedApiClient,
    session: SessionStore,
    @Suppress("UNUSED_PARAMETER") savedPassphrase: SavedPassphraseStore,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    pendingAniListToken: String? = null,
    pendingAniListError: String? = null,
    onConsumedAniListToken: () -> Unit = {},
) {
    var signedIn by remember { mutableStateOf(aniListAuth.isLinked) }
    val showApp = signedIn || !pendingAniListToken.isNullOrBlank()
    val scope = rememberCoroutineScope()

    if (!showApp) {
        LoginScreen(
            statusMessage = pendingAniListError,
            onClearStatus = onConsumedAniListToken,
        )
    } else {
        LocalFirstApp(
            aniList = aniList,
            aniListAuth = aniListAuth,
            aniListSync = aniListSync,
            historyDao = historyDao,
            streamServers = streamServers,
            api = api,
            accountLabel = "@${aniListAuth.username ?: "anilist"}",
            pendingAniListToken = pendingAniListToken,
            pendingAniListError = pendingAniListError,
            onConsumedAniListToken = onConsumedAniListToken,
            onAniListReady = { signedIn = true },
            onSignOut = {
                val token = session.token
                session.clear()
                aniListAuth.clear()
                signedIn = false
                if (!token.isNullOrBlank()) {
                    scope.launch { runCatching { api.logout(token) } }
                }
            },
        )
    }
}

@Composable
private fun LoginScreen(
    statusMessage: String?,
    onClearStatus: () -> Unit,
) {
    val context = LocalContext.current
    Box(modifier = Modifier.fillMaxSize()) {
        KittyAtmosphere()
        Column(
            modifier = Modifier
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 28.dp, vertical = 40.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(
                painter = painterResource(R.drawable.anikitty_logo),
                contentDescription = "AniKitty",
                modifier = Modifier
                    .size(96.dp)
                    .clip(RoundedCornerShape(24.dp)),
                contentScale = ContentScale.Fit,
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                "AniKitty",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Black,
                color = KittyText,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "On your phone · by fampep",
                style = MaterialTheme.typography.bodyMedium,
                color = KittyMuted,
                fontWeight = FontWeight.Medium,
                textAlign = TextAlign.Center,
            )
            Spacer(modifier = Modifier.height(28.dp))
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(KittyGlassShape)
                    .background(KittySurface)
                    .border(1.dp, KittyOutlineSoft, KittyGlassShape)
                    .padding(18.dp),
            ) {
                Text(
                    "Sign in with AniList",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = KittyText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Your watching list, completed shows, and profile come from AniList. No password.",
                    style = MaterialTheme.typography.bodySmall,
                    color = KittyMuted,
                )
                Spacer(modifier = Modifier.height(16.dp))
                Button(
                    onClick = {
                        if (!statusMessage.isNullOrBlank()) onClearStatus()
                        AniListOAuth.openAuthorize(context)
                    },
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = KittyAccent,
                        contentColor = KittyOnAccent,
                    ),
                ) {
                    Text("Sign in with AniList", fontWeight = FontWeight.Bold)
                }
            }
            if (!statusMessage.isNullOrBlank()) {
                Spacer(modifier = Modifier.height(20.dp))
                Text(
                    statusMessage,
                    style = MaterialTheme.typography.bodySmall,
                    color = KittyMuted,
                    textAlign = TextAlign.Center,
                )
            }
        }
    }
}
