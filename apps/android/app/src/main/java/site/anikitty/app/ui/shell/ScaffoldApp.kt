package site.anikitty.app.ui.shell

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.anikitty.app.BuildConfig
import site.anikitty.app.data.api.AnikittyApiClient
import site.anikitty.app.data.auth.TokenStore

/** Scaffold shell only - proves API wiring. Not a feature-complete client. */
@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun ScaffoldApp(
    api: AnikittyApiClient,
    tokenStore: TokenStore,
) {
    val scope = rememberCoroutineScope()
    var passphrase by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Ready. Pointed at ${BuildConfig.API_BASE_URL}") }
    var busy by remember { mutableStateOf(false) }
    var signedIn by remember { mutableStateOf(tokenStore.isSignedIn) }

    fun run(label: String, block: suspend () -> String) {
        scope.launch {
            busy = true
            status = "$label..."
            status = runCatching { block() }
                .getOrElse { e -> "Error: ${e.message ?: e::class.java.simpleName}" }
            signedIn = tokenStore.isSignedIn
            busy = false
        }
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("AniKitty Android") },
            )
        },
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding)
                .padding(16.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(12.dp),
        ) {
            Text(
                text = "Native scaffold (Kotlin / Compose). Product surface is this APK; the website remains the API backend.",
                style = MaterialTheme.typography.bodyMedium,
            )

            Card(colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    Text("API base", style = MaterialTheme.typography.titleSmall)
                    Text(BuildConfig.API_BASE_URL, fontFamily = FontFamily.Monospace)
                    Text(
                        if (signedIn) {
                            "Session: signed in (Bearer JWT stored)"
                        } else {
                            "Session: signed out"
                        },
                        style = MaterialTheme.typography.bodySmall,
                    )
                }
            }

            OutlinedTextField(
                value = passphrase,
                onValueChange = { passphrase = it },
                modifier = Modifier.fillMaxWidth(),
                label = { Text("Passphrase") },
                singleLine = true,
                visualTransformation = PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                enabled = !busy,
            )

            Button(
                onClick = {
                    run("Checking /api/health") {
                        val result = api.health()
                        "Health HTTP ok=${result.ok}: ${result.raw.take(240)}"
                    }
                },
                enabled = !busy,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Ping /api/health")
            }

            Button(
                onClick = {
                    run("Logging in") {
                        when (val result = api.loginWithPassphrase(passphrase.trim())) {
                            is AnikittyApiClient.LoginResult.Success -> {
                                tokenStore.token = result.token
                                "Logged in as ${result.username ?: "(unknown)"} - token stored"
                            }
                            is AnikittyApiClient.LoginResult.Requires2fa -> {
                                // Full TOTP UI comes later; surface the challenge clearly for now.
                                "2FA required - pendingToken received (${result.pendingToken.take(12)}...). " +
                                    "Complete via POST /api/account/auth/2fa-verify (not wired in this scaffold)."
                            }
                        }
                    }
                },
                enabled = !busy && passphrase.isNotBlank(),
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Login (passphrase to Bearer token)")
            }

            Button(
                onClick = {
                    run("Fetching /api/account/me") {
                        val result = api.me()
                        "Me: ${result.username ?: "(see raw)"}\n${result.raw.take(400)}"
                    }
                },
                enabled = !busy && signedIn,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("GET /api/account/me")
            }

            OutlinedButton(
                onClick = {
                    tokenStore.clear()
                    signedIn = false
                    status = "Signed out - token cleared"
                },
                enabled = !busy && signedIn,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text("Sign out")
            }

            Spacer(modifier = Modifier.height(8.dp))
            Text("Status", style = MaterialTheme.typography.titleSmall)
            Text(status, fontFamily = FontFamily.Monospace, style = MaterialTheme.typography.bodySmall)

            Spacer(modifier = Modifier.height(8.dp))
            Text("Next ports (not in this PR)", style = MaterialTheme.typography.titleSmall)
            Text(
                "- Catalog / search / anime detail\n" +
                    "- Media3 HLS playback via Kitty stream APIs\n" +
                    "- Continue watching + watchlist\n" +
                    "- Passkeys via Credential Manager + Digital Asset Links\n" +
                    "- Release signing + Play / sideload pipeline",
                style = MaterialTheme.typography.bodySmall,
            )
        }
    }
}
