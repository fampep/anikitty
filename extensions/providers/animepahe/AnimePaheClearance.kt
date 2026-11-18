// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.view.ContextThemeWrapper
import android.view.ViewGroup
import android.webkit.CookieManager
import android.webkit.WebView
import android.webkit.WebViewClient
import java.util.concurrent.CountDownLatch
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/** Saved Cloudflare pass for one host. [cookieHeader] is sent on the next request. */
internal data class AnimePahePass(
    val cookieHeader: String,
    val userAgent: String,
    val token: String,
)

/** Remembers the clearance cookie so the next animepahe or kwik request can skip the check. */
internal interface AnimePaheClearance {
    fun read(host: String): AnimePahePass?
    fun save(host: String, cookieHeader: String, userAgent: String)
}

/** Opens the site once, waits for `cf_clearance`, and stores it. */
internal fun interface AnimePaheVerifier {
    fun verify(url: String): Boolean
}

internal class MemoryAnimePaheClearance : AnimePaheClearance {
    private val saved = HashMap<String, AnimePahePass>()

    override fun read(host: String): AnimePahePass? = synchronized(saved) { saved[host.lowercase()] }

    override fun save(host: String, cookieHeader: String, userAgent: String) {
        val pass = animepahePass(cookieHeader, userAgent) ?: return
        synchronized(saved) { saved[host.lowercase()] = pass }
    }
}

internal class AnimePaheClearanceStore(context: Context) : AnimePaheClearance {
    private val prefs = context.applicationContext.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val memory = HashMap<String, AnimePahePass>()

    override fun read(host: String): AnimePahePass? {
        val key = host.lowercase()
        synchronized(memory) { memory[key] }?.let { return it }
        val cookie = prefs.getString("$key.cookie", null) ?: return null
        val userAgent = prefs.getString("$key.ua", null) ?: AnimePaheServer.USER_AGENT
        val pass = animepahePass(cookie, userAgent) ?: return null
        synchronized(memory) { memory[key] = pass }
        return pass
    }

    override fun save(host: String, cookieHeader: String, userAgent: String) {
        val pass = animepahePass(cookieHeader, userAgent) ?: return
        val key = host.lowercase()
        synchronized(memory) { memory[key] = pass }
        prefs.edit()
            .putString("$key.cookie", pass.cookieHeader)
            .putString("$key.ua", pass.userAgent)
            .putString("$key.token", pass.token)
            .putLong("$key.at", System.currentTimeMillis())
            .apply()
    }

    private companion object {
        const val PREFS = "anikitty_animepahe_clearance"
    }
}

/**
 * The screen that is in front. A clearance page has to be attached to it or
 * Cloudflare treats the check as a headless browser.
 */
internal object AnimePaheForeground {
    @Volatile
    var activity: Activity? = null

    private val installed = AtomicBoolean(false)

    fun install(context: Context) {
        if (!installed.compareAndSet(false, true)) return
        val app = context.applicationContext as? Application ?: return
        app.registerActivityLifecycleCallbacks(object : Application.ActivityLifecycleCallbacks {
            override fun onActivityResumed(activity: Activity) {
                AnimePaheForeground.activity = activity
            }

            override fun onActivityPaused(activity: Activity) {
                if (AnimePaheForeground.activity == activity) AnimePaheForeground.activity = null
            }

            override fun onActivityDestroyed(activity: Activity) {
                if (AnimePaheForeground.activity == activity) AnimePaheForeground.activity = null
            }

            override fun onActivityCreated(activity: Activity, savedInstanceState: Bundle?) = Unit
            override fun onActivityStarted(activity: Activity) = Unit
            override fun onActivityStopped(activity: Activity) = Unit
            override fun onActivitySaveInstanceState(activity: Activity, outState: Bundle) = Unit
        })
    }
}

internal class AnimePaheWebVerifier(
    context: Context,
    private val clearance: AnimePaheClearance,
) : AnimePaheVerifier {
    private val appContext = context.applicationContext
    private val gate = Any()
    private val failedAt = HashMap<String, Long>()

    override fun verify(url: String): Boolean = synchronized(gate) {
        val host = animepaheHost(url) ?: return false
        val now = System.currentTimeMillis()
        val failed = failedAt[host]
        if (failed != null && now - failed < FAILURE_WINDOW_MS) return false
        val found = load("https://$host/")
        if (found == null) {
            failedAt[host] = now
            return false
        }
        clearance.save(host, found.cookie, found.userAgent)
        val saved = clearance.read(host)?.token?.isNotBlank() == true
        if (saved) failedAt.remove(host) else failedAt[host] = now
        saved
    }

    private fun load(page: String): Loaded? {
        if (Looper.myLooper() == Looper.getMainLooper()) return null
        val latch = CountDownLatch(1)
        val holder = arrayOfNulls<Loaded>(1)
        val main = Handler(Looper.getMainLooper())
        main.post {
            val activity = AnimePaheForeground.activity
            val web = if (activity != null) {
                WebView(activity)
            } else {
                WebView(ContextThemeWrapper(appContext, android.R.style.Theme_DeviceDefault))
            }
            val root = activity?.findViewById<ViewGroup>(android.R.id.content)
            if (root != null) {
                web.alpha = 0f
                root.addView(
                    web,
                    0,
                    ViewGroup.LayoutParams(
                        ViewGroup.LayoutParams.MATCH_PARENT,
                        ViewGroup.LayoutParams.MATCH_PARENT,
                    ),
                )
            }
            val cookies = CookieManager.getInstance()
            cookies.setAcceptCookie(true)
            cookies.setAcceptThirdPartyCookies(web, true)
            web.settings.javaScriptEnabled = true
            web.settings.domStorageEnabled = true
            web.settings.userAgentString = AnimePaheServer.USER_AGENT
            val userAgent = web.settings.userAgentString ?: AnimePaheServer.USER_AGENT
            web.webViewClient = WebViewClient()
            var polls = 40
            val poll = object : Runnable {
                override fun run() {
                    val raw = cookies.getCookie(page).orEmpty()
                    polls -= 1
                    if (animepaheClearanceToken(raw) != null || polls <= 0) {
                        if (animepaheClearanceToken(raw) != null) holder[0] = Loaded(raw, userAgent)
                        cookies.flush()
                        runCatching { web.stopLoading() }
                        runCatching { root?.removeView(web) }
                        runCatching { web.destroy() }
                        latch.countDown()
                    } else {
                        main.postDelayed(this, 500)
                    }
                }
            }
            runCatching { web.loadUrl(page) }.onFailure {
                runCatching { root?.removeView(web) }
                runCatching { web.destroy() }
                latch.countDown()
                return@post
            }
            main.postDelayed(poll, 500)
        }
        latch.await(22, TimeUnit.SECONDS)
        return holder[0]
    }

    private data class Loaded(val cookie: String, val userAgent: String)

    private companion object {
        const val FAILURE_WINDOW_MS = 60_000L
    }
}

internal fun animepaheHost(url: String): String? {
    val host = Regex("""^https://([^/:]+)""", RegexOption.IGNORE_CASE)
        .find(url)
        ?.groupValues
        ?.get(1)
        ?: return null
    return host.lowercase()
}

internal fun animepaheClearanceToken(cookieHeader: String?): String? {
    if (cookieHeader.isNullOrBlank()) return null
    val pair = cookieHeader.split(';')
        .map { it.trim() }
        .firstOrNull { it.startsWith("cf_clearance=") }
        ?: return null
    return pair.substringAfter("cf_clearance=").trim().takeIf { it.isNotEmpty() }
}

internal fun animepaheCookieHeader(setCookies: List<String>): String? {
    val pairs = ArrayList<String>()
    for (raw in setCookies) {
        val pair = raw.substringBefore(';').trim()
        if ('=' !in pair) continue
        if (pair.substringBefore('=').isBlank()) continue
        pairs += pair
    }
    return animepahePass(pairs.joinToString("; "), AnimePaheServer.USER_AGENT)?.cookieHeader
}

internal fun animepahePass(cookieHeader: String, userAgent: String): AnimePahePass? {
    val token = animepaheClearanceToken(cookieHeader) ?: return null
    val ua = userAgent.trim().ifBlank { AnimePaheServer.USER_AGENT }
    return AnimePahePass(cookieHeader.trim(), ua, token)
}

internal fun animepaheNeedsClearance(code: Int, body: String): Boolean {
    val probe = body.take(1500).lowercase()
    val challenge = "just a moment" in probe ||
        "cf-mitigated" in probe ||
        "challenge-platform" in probe ||
        "attention required" in probe ||
        "you have been blocked" in probe ||
        "performing security verification" in probe ||
        "cf-browser-verification" in probe
    if (challenge) return true
    return (code == 403 || code == 503) && "<html" in probe && !probe.trimStart().startsWith("{")
}

internal fun animepaheRequestHeaders(
    referer: String,
    accept: String,
    api: Boolean,
    pass: AnimePahePass?,
): Map<String, String> {
    val headers = linkedMapOf(
        "Accept" to accept,
        "Referer" to referer,
        "User-Agent" to (pass?.userAgent?.takeIf { it.isNotBlank() } ?: AnimePaheServer.USER_AGENT),
    )
    if (api) headers["X-Requested-With"] = "XMLHttpRequest"
    if (pass != null && pass.token.isNotBlank()) headers["Cookie"] = pass.cookieHeader
    return headers
}
