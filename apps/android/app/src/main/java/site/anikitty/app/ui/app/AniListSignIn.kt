package site.anikitty.app.ui.app

import android.annotation.SuppressLint
import android.webkit.CookieManager
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
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.window.Dialog
import androidx.compose.ui.window.DialogProperties
import org.json.JSONTokener
import site.anikitty.app.data.anilist.AniListOAuth
import site.anikitty.app.ui.theme.KittyText
import java.util.UUID

/**
 * AniList account login. The user signs in on AniList's page.
 * The access token comes back in the redirect fragment. No token to copy.
 */
@Composable
fun AniListSignIn(
    onToken: (String) -> Unit,
    onError: (String) -> Unit,
    onDismiss: () -> Unit,
) {
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
                onToken = onToken,
                onError = onError,
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
    onToken: (String) -> Unit,
    onError: (String) -> Unit,
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
                    override fun onPageFinished(view: WebView?, finishedUrl: String?) {
                        val page = view ?: return
                        if (page.tag == "anikitty-oauth-done") return
                        page.evaluateJavascript(
                            "(function(){return location.hash || '';})()",
                        ) { raw ->
                            if (page.tag == "anikitty-oauth-done") return@evaluateJavascript
                            val hash = decodeJsString(raw).orEmpty()
                            if (!hash.contains("access_token=") && !hash.contains("error=")) {
                                return@evaluateJavascript
                            }
                            page.tag = "anikitty-oauth-done"
                            runCatching { tokenFromFragment(hash, expectedState) }
                                .onSuccess(onToken)
                                .onFailure { e -> onError(e.message ?: "AniList sign-in failed") }
                        }
                    }
                }
                loadUrl(url)
            }
        },
    )
}

private fun decodeJsString(raw: String?): String? {
    if (raw.isNullOrBlank() || raw == "null") return null
    return runCatching { JSONTokener(raw).nextValue() as? String }.getOrNull()
}

private fun tokenFromFragment(hash: String, expectedState: String): String {
    val body = hash.removePrefix("#")
    val map = body.split('&').mapNotNull { part ->
        val i = part.indexOf('=')
        if (i <= 0) null else {
            part.substring(0, i) to android.net.Uri.decode(part.substring(i + 1))
        }
    }.toMap()
    map["error"]?.let { err -> error(map["error_description"] ?: err) }
    val returned = map["state"]
    if (!returned.isNullOrBlank() && returned != expectedState) {
        error("AniList sign-in did not match this attempt")
    }
    return map["access_token"]?.takeIf { it.isNotBlank() }
        ?: error("AniList did not finish sign-in")
}
