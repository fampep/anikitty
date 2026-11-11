package site.anikitty.app.ui.shell

import android.content.Intent
import android.net.Uri
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Checkbox
import androidx.compose.material3.CheckboxDefaults
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.anikitty.app.R
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.auth.Passphrase
import site.anikitty.app.data.auth.SavedPassphraseStore
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.servers.ServerCatalog
import site.anikitty.app.ui.theme.KittyInk

/** AniList and/or password account gate → anime browse + on-device streams. */
@Composable
fun AppRoot(
    api: DedicatedApiClient,
    session: SessionStore,
    savedPassphrase: SavedPassphraseStore,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
    pendingAniListToken: String? = null,
    pendingAniListError: String? = null,
    onConsumedAniListToken: () -> Unit = {},
) {
    var signedIn by remember {
        mutableStateOf(session.isSignedIn || aniListAuth.isLinked)
    }
    val scope = rememberCoroutineScope()

    if (!signedIn) {
        LoginScreen(
            api = api,
            session = session,
            savedPassphrase = savedPassphrase,
            aniList = aniList,
            aniListAuth = aniListAuth,
            aniListSync = aniListSync,
            pendingAniListToken = pendingAniListToken,
            pendingAniListError = pendingAniListError,
            onConsumedAniListToken = onConsumedAniListToken,
            onSignedIn = { signedIn = true },
        )
    } else {
        LocalFirstApp(
            aniList = aniList,
            aniListAuth = aniListAuth,
            aniListSync = aniListSync,
            historyDao = historyDao,
            streamServers = streamServers,
            api = api,
            accountLabel = when {
                aniListAuth.isLinked -> "@${aniListAuth.username ?: "anilist"}"
                else -> session.userId?.takeLast(8)?.let { "••••$it" } ?: "signed in"
            },
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
    api: DedicatedApiClient,
    session: SessionStore,
    savedPassphrase: SavedPassphraseStore,
    aniList: AniListClient,
    aniListAuth: AniListAuthStore,
    aniListSync: AniListSync,
    pendingAniListToken: String?,
    pendingAniListError: String?,
    onConsumedAniListToken: () -> Unit,
    onSignedIn: () -> Unit,
) {
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var saveOnDevice by remember { mutableStateOf(true) }
    var generated by remember { mutableStateOf<String?>(null) }
    var aniToken by remember { mutableStateOf("") }
    var showTokenPaste by remember { mutableStateOf(!AniListOAuth.isConfigured()) }
    var status by remember {
        mutableStateOf("Sign in with AniList to sync your list — or use a password account.")
    }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
    val context = LocalContext.current
    val hasSaved = savedPassphrase.hasSaved

    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = MaterialTheme.colorScheme.primary,
        unfocusedBorderColor = MaterialTheme.colorScheme.outline,
        focusedLabelColor = MaterialTheme.colorScheme.primary,
        cursorColor = MaterialTheme.colorScheme.primary,
        focusedTextColor = MaterialTheme.colorScheme.onSurface,
        unfocusedTextColor = MaterialTheme.colorScheme.onSurface,
    )

    fun run(label: String, block: suspend () -> String) {
        scope.launch {
            busy = true
            status = label
            status = runCatching { block() }.getOrElse { e -> "Error: ${e.message}" }
            busy = false
        }
    }

    fun persistIfNeeded(pass: String) {
        if (saveOnDevice) savedPassphrase.save(pass)
    }

    suspend fun completeAniList(token: String): String {
        val viewer = aniList.viewer(token) ?: error("Invalid AniList token")
        aniListAuth.saveViewer(token, viewer)
        val synced = runCatching { aniListSync.pull() }.getOrNull()
        onSignedIn()
        return if (synced != null) {
            "Welcome @${viewer.name} · synced ${synced.imported} titles"
        } else {
            "Welcome @${viewer.name}"
        }
    }

    LaunchedEffect(pendingAniListToken, pendingAniListError) {
        when {
            !pendingAniListError.isNullOrBlank() -> {
                status = "AniList: $pendingAniListError"
                onConsumedAniListToken()
            }
            !pendingAniListToken.isNullOrBlank() -> {
                busy = true
                status = "Connecting AniList…"
                status = runCatching { completeAniList(pendingAniListToken) }
                    .getOrElse { e -> "Error: ${e.message}" }
                busy = false
                onConsumedAniListToken()
            }
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(KittyInk)
            .background(
                Brush.radialGradient(
                    colors = listOf(
                        Color.White.copy(alpha = 0.08f),
                        Color.Transparent,
                    ),
                    radius = 900f,
                ),
            ),
    ) {
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
                    .clip(RoundedCornerShape(22.dp)),
                contentScale = ContentScale.Fit,
            )
            Spacer(modifier = Modifier.height(14.dp))
            Text(
                "AniKitty",
                style = MaterialTheme.typography.displaySmall,
                fontWeight = FontWeight.Black,
                color = Color.White,
            )
            Spacer(modifier = Modifier.height(8.dp))
            Text(
                "Your AniList · cinema on your phone",
                style = MaterialTheme.typography.bodyMedium,
                color = Color.White.copy(alpha = 0.55f),
                textAlign = TextAlign.Center,
            )

            Spacer(modifier = Modifier.height(28.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color(0xFF1A2332))
                    .border(1.dp, Color(0xFF3D5A80).copy(alpha = 0.55f), RoundedCornerShape(16.dp))
                    .padding(16.dp),
            ) {
                Text(
                    "AniList",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = Color.White,
                )
                Text(
                    "Import watching / completed / planning and keep progress synced.",
                    style = MaterialTheme.typography.bodySmall,
                    color = Color.White.copy(alpha = 0.62f),
                )
                Spacer(modifier = Modifier.height(14.dp))
                if (AniListOAuth.isConfigured()) {
                    Button(
                        onClick = {
                            runCatching { AniListOAuth.openAuthorize(context) }
                                .onFailure { e -> status = "Error: ${e.message}" }
                        },
                        enabled = !busy,
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color(0xFF02A9FF),
                            contentColor = Color.White,
                        ),
                    ) {
                        Text("Continue with AniList", fontWeight = FontWeight.Bold)
                    }
                    TextButton(
                        onClick = { showTokenPaste = !showTokenPaste },
                        enabled = !busy,
                    ) {
                        Text(
                            if (showTokenPaste) "Hide token paste" else "Paste access token instead",
                            color = Color.White.copy(alpha = 0.7f),
                        )
                    }
                } else {
                    Text(
                        "Paste an AniList access token to link your account. Create an API client at anilist.co → Settings → Developer (redirect anikitty://anilist), authorize with response_type=token, then paste the token.",
                        style = MaterialTheme.typography.bodySmall,
                        color = Color.White.copy(alpha = 0.62f),
                    )
                    Spacer(modifier = Modifier.height(8.dp))
                    TextButton(
                        onClick = {
                            context.startActivity(
                                Intent(
                                    Intent.ACTION_VIEW,
                                    Uri.parse("https://anilist.co/settings/developer"),
                                ),
                            )
                        },
                        enabled = !busy,
                    ) {
                        Text("Open AniList developer settings", color = Color(0xFF02A9FF))
                    }
                    showTokenPaste = true
                }

                if (showTokenPaste) {
                    Spacer(modifier = Modifier.height(8.dp))
                    OutlinedTextField(
                        value = aniToken,
                        onValueChange = { aniToken = it },
                        modifier = Modifier.fillMaxWidth(),
                        singleLine = true,
                        label = { Text("AniList access token") },
                        enabled = !busy,
                        shape = RoundedCornerShape(12.dp),
                        colors = fieldColors,
                    )
                    Spacer(modifier = Modifier.height(10.dp))
                    Button(
                        onClick = {
                            run("Linking AniList…") {
                                completeAniList(aniToken.trim())
                            }
                        },
                        enabled = !busy && aniToken.isNotBlank(),
                        modifier = Modifier
                            .fillMaxWidth()
                            .height(48.dp),
                        shape = RoundedCornerShape(10.dp),
                        colors = ButtonDefaults.buttonColors(
                            containerColor = Color.White,
                            contentColor = Color.Black,
                        ),
                    ) {
                        Text("Link AniList token", fontWeight = FontWeight.Bold)
                    }
                }
            }

            Spacer(modifier = Modifier.height(22.dp))
            Text(
                "Or password account",
                style = MaterialTheme.typography.labelLarge,
                color = Color.White.copy(alpha = 0.72f),
                fontWeight = FontWeight.SemiBold,
            )
            Spacer(modifier = Modifier.height(10.dp))

            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .clip(RoundedCornerShape(16.dp))
                    .background(Color.White.copy(alpha = 0.04f))
                    .border(1.dp, Color.White.copy(alpha = 0.08f), RoundedCornerShape(16.dp))
                    .padding(16.dp),
            ) {
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    modifier = Modifier.fillMaxWidth(),
                    singleLine = true,
                    label = { Text("Password") },
                    visualTransformation = if (showPassword) {
                        VisualTransformation.None
                    } else {
                        PasswordVisualTransformation()
                    },
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                    enabled = !busy,
                    shape = RoundedCornerShape(12.dp),
                    colors = fieldColors,
                )
                TextButton(onClick = { showPassword = !showPassword }, enabled = !busy) {
                    Text(
                        if (showPassword) "Hide password" else "Show password",
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Row(
                    verticalAlignment = Alignment.CenterVertically,
                    modifier = Modifier.fillMaxWidth(),
                ) {
                    Checkbox(
                        checked = saveOnDevice,
                        onCheckedChange = { saveOnDevice = it },
                        enabled = !busy,
                        colors = CheckboxDefaults.colors(
                            checkedColor = MaterialTheme.colorScheme.primary,
                        ),
                    )
                    Text(
                        "Save password on this device",
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant,
                    )
                }

                Spacer(modifier = Modifier.height(12.dp))
                Button(
                    onClick = {
                        run("Signing in…") {
                            val pass = password.trim()
                            require(pass.length >= 10) { "password must be at least 10 characters" }
                            val res = api.login(pass)
                            session.token = res.token
                            session.userId = res.userId
                            persistIfNeeded(pass)
                            onSignedIn()
                            "Welcome back"
                        }
                    },
                    enabled = !busy && password.length >= 10,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                ) {
                    Text("Sign in", fontWeight = FontWeight.Bold)
                }

                if (hasSaved) {
                    Spacer(modifier = Modifier.height(10.dp))
                    OutlinedButton(
                        onClick = {
                            run("Signing in with saved password…") {
                                val pass = savedPassphrase.password ?: error("no saved password")
                                val res = api.login(pass)
                                session.token = res.token
                                session.userId = res.userId
                                password = pass
                                onSignedIn()
                                "Welcome back"
                            }
                        },
                        enabled = !busy,
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                    ) { Text("Continue with saved password") }
                }

                Spacer(modifier = Modifier.height(12.dp))
                OutlinedButton(
                    onClick = {
                        val pass = Passphrase.generate()
                        generated = pass
                        password = pass
                        showPassword = true
                        status = "Random password ready — create your account next."
                    },
                    enabled = !busy,
                    modifier = Modifier.fillMaxWidth(),
                    shape = RoundedCornerShape(10.dp),
                ) { Text("Generate password") }

                if (generated != null) {
                    Spacer(modifier = Modifier.height(10.dp))
                    Text(
                        generated!!,
                        style = MaterialTheme.typography.titleSmall,
                        fontFamily = FontFamily.Monospace,
                        color = MaterialTheme.colorScheme.primary,
                        textAlign = TextAlign.Center,
                    )
                }

                Spacer(modifier = Modifier.height(10.dp))
                Button(
                    onClick = {
                        run("Creating account…") {
                            val pass = password.trim().ifBlank {
                                Passphrase.generate().also {
                                    generated = it
                                    password = it
                                    showPassword = true
                                }
                            }
                            require(pass.length >= 10) { "password too short" }
                            val res = api.signup(pass)
                            session.token = res.token
                            session.userId = res.userId
                            persistIfNeeded(pass)
                            onSignedIn()
                            "Account created. You’re in."
                        }
                    },
                    enabled = !busy,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(48.dp),
                    shape = RoundedCornerShape(10.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                ) {
                    Text("Create password account", fontWeight = FontWeight.Bold)
                }
            }

            Spacer(modifier = Modifier.height(20.dp))
            Text(
                status,
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center,
            )
        }
    }
}
