package site.anikitty.app.ui.app

import android.annotation.SuppressLint
import android.net.Uri
import android.webkit.CookieManager
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.theme.KittyText
import java.util.UUID

/**
 * AniList account login. The user signs in on AniList's page.
 * AniList redirects with an authorization code, which is exchanged here.
 */
@Composable
fun AniListSignIn(
    onToken: (String) -> Unit,
    onError: (String) -> Unit,
    onDismiss: () -> Unit,
) {
    val scope = rememberCoroutineScope()
    val state = remember { UUID.randomUUID().toString() }
    Dialog(
        onDismissRequest = onDismiss,
        properties = DialogProperties(usePlatformDefaultWidth = false, decorFitsSystemWindows = false),
    ) {
        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(Color.Black),
        ) {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .statusBarsPadding()
                    .padding(horizontal = 8.dp),
            ) {
                TextButton(onClick = onDismiss) {
                    Text("Close", color = KittyText)
                }
            }
            AniListLoginWebView(
                url = AniListOAuth.authorizeUrl(state = state),
                expectedState = state,
                modifier = Modifier
                    .fillMaxWidth()
                    .weight(1f),
                onError = onError,
                onExchange = { code, returnedState ->
                    scope.launch {
                        val result = withContext(Dispatchers.IO) {
                            runCatching {
                                AniListOAuth.exchangeCode(
                                    code = code,
                                    expectedState = state,
                                    returnedState = returnedState,
                                )
                            }
                        }
                        result.onSuccess(onToken).onFailure { error ->
                            onError(error.message ?: "AniList sign-in failed")
                        }
                    }
                },
            )
        }
    }
}

@SuppressLint("SetJavaScriptEnabled")
@Composable
private fun AniListLoginWebView(
    url: String,
    expectedState: String,
    modifier: Modifier,
    onError: (String) -> Unit,
    onExchange: (code: String, returnedState: String?) -> Unit,
) {
    AndroidView(
        modifier = modifier,
        factory = { context ->
            WebView(context).apply {
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.userAgentString = settings.userAgentString.replace("; wv", "")
                CookieManager.getInstance().setAcceptCookie(true)
                CookieManager.getInstance().setAcceptThirdPartyCookies(this, true)
                webViewClient = object : WebViewClient() {
                    override fun shouldOverrideUrlLoading(
                        view: WebView?,
                        request: WebResourceRequest?,
                    ): Boolean {
                        val uri = request?.url ?: return false
                        return consumeRedirect(view, uri, expectedState, onError, onExchange)
                    }
                }
                loadUrl(url)
            }
        },
    )
}

private fun consumeRedirect(
    view: WebView?,
    uri: Uri,
    expectedState: String,
    onError: (String) -> Unit,
    onExchange: (code: String, returnedState: String?) -> Unit,
): Boolean {
    if (!AniListOAuth.isAniListRedirect(uri)) return false
    if (view?.tag == "anikitty-oauth-done") return true
    val errorName = uri.getQueryParameter("error")
    val code = uri.getQueryParameter("code")
    if (errorName.isNullOrBlank() && code.isNullOrBlank()) return false
    view?.tag = "anikitty-oauth-done"
    view?.stopLoading()
    if (!errorName.isNullOrBlank()) {
        onError(uri.getQueryParameter("error_description") ?: errorName)
        return true
    }
    if (code.isNullOrBlank()) {
        onError("AniList did not finish sign-in")
        return true
    }
    val returned = uri.getQueryParameter("state")
    if (!returned.isNullOrBlank() && returned != expectedState) {
        onError("AniList sign-in did not match this attempt")
        return true
    }
    onExchange(code, returned)
    return true
}
