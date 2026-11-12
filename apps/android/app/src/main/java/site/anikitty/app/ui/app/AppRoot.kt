package site.anikitty.app.ui.app

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
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
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
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.auth.Passphrase
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
 * Password-account gate → anime browse + on-device streams.
 * AniList is optional and linked later from Account — never required to sign in.
 */
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
    var signedIn by remember { mutableStateOf(session.isSignedIn) }
    val scope = rememberCoroutineScope()

    if (!signedIn) {
        LoginScreen(
            api = api,
            session = session,
            savedPassphrase = savedPassphrase,
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
            pendingAniListToken = pendingAniListToken,
            pendingAniListError = pendingAniListError,
            onConsumedAniListToken = onConsumedAniListToken,
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
    onSignedIn: () -> Unit,
) {
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    var saveOnDevice by remember { mutableStateOf(true) }
    var generated by remember { mutableStateOf<String?>(null) }
    var status by remember {
        mutableStateOf("Sign in with your AniKitty password — AniList linking is optional later.")
    }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()
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
                "On your phone · black UI · by fampep",
                style = MaterialTheme.typography.bodyMedium,
                color = KittyMuted,
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
                    "Welcome",
                    style = MaterialTheme.typography.titleMedium,
                    fontWeight = FontWeight.Bold,
                    color = KittyText,
                )
                Spacer(modifier = Modifier.height(4.dp))
                Text(
                    "Password sign-in. Catalog, extensions, and playback run on this phone — link AniList later from Account if you want list sync.",
                    style = MaterialTheme.typography.bodySmall,
                    color = KittyMuted,
                )
                Spacer(modifier = Modifier.height(14.dp))

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
                    shape = RoundedCornerShape(14.dp),
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
                    shape = RoundedCornerShape(14.dp),
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
                        shape = RoundedCornerShape(14.dp),
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
                    shape = RoundedCornerShape(14.dp),
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
                    shape = RoundedCornerShape(14.dp),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = MaterialTheme.colorScheme.primary,
                        contentColor = MaterialTheme.colorScheme.onPrimary,
                    ),
                ) {
                    Text("Create account", fontWeight = FontWeight.Bold)
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
