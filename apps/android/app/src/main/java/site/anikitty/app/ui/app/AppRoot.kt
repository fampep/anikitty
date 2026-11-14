// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.ui.app

import androidx.compose.animation.core.FastOutSlowInEasing
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
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
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.LocalView
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import java.util.Locale
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.auth.SavedPassphraseStore
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.components.KittyFace
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyHaptics
import site.anikitty.app.ui.theme.LookState
import site.anikitty.app.ui.theme.prefersReducedMotion
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
    var showSplash by rememberSaveable { mutableStateOf(true) }
    val showApp = signedIn || !pendingAniListToken.isNullOrBlank()

    if (showSplash) {
        SplashScreen(onFinished = { showSplash = false })
        return
    }

    val context = LocalContext.current
    LookState.ensure(context)
    Box(modifier = Modifier.fillMaxSize()) {
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
            accountLabel = aniListAuth.username?.takeIf { it.isNotBlank() }?.let { "@$it" }
                ?: "@anilist",
            pendingAniListToken = pendingAniListToken,
            pendingAniListError = pendingAniListError,
            onConsumedAniListToken = onConsumedAniListToken,
            onAniListReady = { signedIn = true },
            onSignOut = {
                session.clear()
                aniListAuth.clear()
                signedIn = false
            },
        )
    }
        if (!LookState.welcomed) {
            WelcomeOverlay(onDismiss = { LookState.setWelcomed(context) })
        }
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
            KittyFace(
                modifier = Modifier.size(96.dp),
                waving = true,
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
                "Copyright 2026 fampep",
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
                    "Your watching list, completed shows, and profile come from AniList. In the AniList app settings, set the redirect to anikitty://anilist.",
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

@Composable
private fun WelcomeOverlay(onDismiss: () -> Unit) {
    val reduced = prefersReducedMotion()
    val view = LocalView.current
    var shown by remember { mutableStateOf(reduced) }
    androidx.compose.runtime.LaunchedEffect(Unit) { shown = true }
    val rise by animateFloatAsState(
        targetValue = if (shown) 0f else 28f,
        animationSpec = tween(320, easing = FastOutSlowInEasing),
        label = "welcome",
    )
    val danish = Locale.getDefault().language == "da"
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
            .clickable(onClick = {
                KittyHaptics.perform(view, KittyHaptics.Kind.Confirm)
                onDismiss()
            }),
        contentAlignment = Alignment.Center,
    ) {
        Column(
            modifier = Modifier
                .padding(horizontal = 32.dp)
                .graphicsLayer {
                    translationY = if (reduced) 0f else rise
                    alpha = if (reduced) 1f else (1f - (rise / 28f)).coerceIn(0f, 1f)
                }
                .clip(RoundedCornerShape(20.dp))
                .background(Color(0xFF101012))
                .clickable(onClick = {})
                .padding(horizontal = 22.dp, vertical = 24.dp),
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            KittyFace(modifier = Modifier.size(88.dp), waving = true)
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                if (danish) "Hej. Klar til næste episode?" else "Hi. Ready for the next episode?",
                color = Color.White,
                fontWeight = FontWeight.SemiBold,
                textAlign = TextAlign.Center,
                style = MaterialTheme.typography.titleMedium,
            )
            Spacer(modifier = Modifier.height(16.dp))
            Button(
                onClick = {
                    KittyHaptics.perform(view, KittyHaptics.Kind.Confirm)
                    onDismiss()
                },
                shape = RoundedCornerShape(14.dp),
                colors = ButtonDefaults.buttonColors(
                    containerColor = KittyAccent,
                    contentColor = KittyOnAccent,
                ),
            ) {
                Text(if (danish) "Lad os" else "Let's go", fontWeight = FontWeight.Bold)
            }
        }
    }
}
