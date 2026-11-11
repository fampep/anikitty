package site.anikitty.app.ui.shell

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.dp
import kotlinx.coroutines.launch
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.WatchHistoryDao
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.server.ServerConfig
import site.anikitty.app.data.servers.ServerCatalog

/** Sign-in required against the dedicated Go server. No website. */
@Composable
fun AppRoot(
    api: DedicatedApiClient,
    session: SessionStore,
    serverConfig: ServerConfig,
    aniList: AniListClient,
    historyDao: WatchHistoryDao,
    streamServers: ServerCatalog,
) {
    var signedIn by remember { mutableStateOf(session.isSignedIn) }
    val scope = rememberCoroutineScope()

    if (!signedIn) {
        LoginScreen(
            api = api,
            session = session,
            serverConfig = serverConfig,
            onSignedIn = { signedIn = true },
        )
    } else {
        LocalFirstApp(
            aniList = aniList,
            historyDao = historyDao,
            streamServers = streamServers,
            username = session.username ?: "user",
            serverBaseUrl = serverConfig.baseUrl,
            onSignOut = {
                scope.launch {
                    runCatching { api.logout() }
                    session.clear()
                    signedIn = false
                }
            },
        )
    }
}

@Composable
private fun LoginScreen(
    api: DedicatedApiClient,
    session: SessionStore,
    serverConfig: ServerConfig,
    onSignedIn: () -> Unit,
) {
    var serverUrl by remember { mutableStateOf(serverConfig.baseUrl) }
    var username by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var status by remember { mutableStateOf("Sign in to your dedicated server (no Discord / AniList login).") }
    var busy by remember { mutableStateOf(false) }
    val scope = rememberCoroutineScope()

    fun run(label: String, block: suspend () -> String) {
        scope.launch {
            busy = true
            status = label
            status = runCatching {
                serverConfig.baseUrl = serverUrl
                block()
            }.getOrElse { e -> "Error: ${e.message}" }
            busy = false
        }
    }

    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(24.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("AniKitty", style = MaterialTheme.typography.headlineMedium)
        Text(
            "Dedicated APK — accounts on your Go server",
            style = MaterialTheme.typography.bodySmall,
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(20.dp))
        OutlinedTextField(
            value = serverUrl,
            onValueChange = { serverUrl = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Dedicated server URL") },
            enabled = !busy,
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = username,
            onValueChange = { username = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Username") },
            enabled = !busy,
        )
        Spacer(modifier = Modifier.height(8.dp))
        OutlinedTextField(
            value = password,
            onValueChange = { password = it },
            modifier = Modifier.fillMaxWidth(),
            singleLine = true,
            label = { Text("Password (min 10)") },
            visualTransformation = PasswordVisualTransformation(),
            keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
            enabled = !busy,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Button(
            onClick = {
                run("Logging in...") {
                    val res = api.login(username.trim(), password)
                    session.token = res.token
                    session.username = res.username
                    onSignedIn()
                    "Welcome ${res.username}"
                }
            },
            enabled = !busy && username.isNotBlank() && password.length >= 10,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Sign in") }
        OutlinedButton(
            onClick = {
                run("Creating account...") {
                    val res = api.signup(username.trim(), password)
                    session.token = res.token
                    session.username = res.username
                    onSignedIn()
                    "Account created for ${res.username}"
                }
            },
            enabled = !busy && username.isNotBlank() && password.length >= 10,
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Create account") }
        Spacer(modifier = Modifier.height(12.dp))
        Text(status, style = MaterialTheme.typography.bodySmall)
    }
}
