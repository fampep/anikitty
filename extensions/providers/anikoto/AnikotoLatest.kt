// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.servers

/**
 * One card from Anikoto's home "Latest Episode" widgets
 * (`updated-all` / `updated-sub` / `updated-dub`).
 *
 * [latestSub] / [latestDub] are the true download counts on the scrape site
 * (not AniList air dates). Prefer those when opening Sub vs Dub.
 */
data class AnikotoLatestItem(
    val siteId: String,
    val slug: String,
    val title: String,
    val posterUrl: String?,
    val hrefEpisode: Int,
    val latestSub: Int,
    val latestDub: Int,
) {
    fun episodeFor(audio: String): Int {
        val dub = audio.equals("dub", ignoreCase = true)
        return if (dub) {
            latestDub.takeIf { it > 0 } ?: hrefEpisode
        } else {
            latestSub.takeIf { it > 0 } ?: hrefEpisode
        }
    }
}

data class AnikotoAudioAvailability(
    val latestSub: Int,
    val latestDub: Int,
) {
    val hasSub: Boolean get() = latestSub > 0
    val hasDub: Boolean get() = latestDub > 0

    fun label(): String {
        val parts = buildList {
            if (hasSub) add("$latestSub Sub")
            if (hasDub) add("$latestDub Dub")
        }
        return parts.joinToString(" · ")
    }
}

/** Pure HTML parse of Anikoto home widget markup — unit-tested without network. */
object AnikotoLatestParser {
    private val ITEM = Regex(
        """(?is)<div\s+class=["']item["']>(.*?)</div>\s*</div>\s*(?=<div\s+class=["']item["']>|</div>\s*$)""",
    )
    private val HREF = Regex(
        """(?i)href=["']https?://[^"']*/watch/([^"/]+)/ep-(\d+)["']""",
    )
    private val TIP = Regex("""(?i)data-tip=["'](\d+)["']""")
    private val NAME = Regex(
        """(?is)<a\s+class=["'][^"']*\bname\b[^"']*["'][^>]*>(.*?)</a>""",
    )
    private val POSTER = Regex("""(?is)<img\b[^>]*\bsrc=["']([^"']+)["']""")
    private val SUB = Regex(
        """(?is)ep-status\s+sub["'][^>]*>\s*<span>\s*(\d+)\s*</span>""",
    )
    private val DUB = Regex(
        """(?is)ep-status\s+dub["'][^>]*>\s*<span>\s*(\d+)\s*</span>""",
    )
    private val TAG = Regex("""<[^>]+>""")

    fun parseWidgetHtml(html: String): List<AnikotoLatestItem> {
        if (html.isBlank()) return emptyList()
        val out = ArrayList<AnikotoLatestItem>()
        val seen = HashSet<String>()
        val blocks = if (ITEM.containsMatchIn(html)) {
            ITEM.findAll(html).map { it.groupValues[1] }.toList()
        } else {
            html.split(Regex("""(?i)<div\s+class=["']item["']>""")).drop(1)
        }
        for (block in blocks) {
            val href = HREF.find(block) ?: continue
            val slug = href.groupValues[1]
            if (!seen.add(slug)) continue
            val tip = TIP.find(block)?.groupValues?.get(1).orEmpty()
            if (tip.isBlank()) continue
            val ep = href.groupValues[2].toIntOrNull() ?: continue
            val sub = SUB.find(block)?.groupValues?.get(1)?.toIntOrNull() ?: 0
            val dub = DUB.find(block)?.groupValues?.get(1)?.toIntOrNull() ?: 0
            val title = NAME.find(block)?.groupValues?.get(1)
                ?.let { htmlUnescape(stripTags(it)).trim() }
                .orEmpty()
                .ifBlank { slug.replace('-', ' ') }
            val poster = POSTER.find(block)?.groupValues?.get(1)?.let(::htmlUnescape)
            out += AnikotoLatestItem(
                siteId = tip,
                slug = slug,
                title = title,
                posterUrl = poster,
                hrefEpisode = ep,
                latestSub = sub,
                latestDub = dub,
            )
        }
        return out
    }

    private fun stripTags(raw: String): String = TAG.replace(raw, "")

    private fun htmlUnescape(raw: String): String =
        raw.replace("&amp;", "&")
            .replace("&quot;", "\"")
            .replace("&#039;", "'")
            .replace("&apos;", "'")
            .replace("&lt;", "<")
            .replace("&gt;", ">")
            .replace("&nbsp;", " ")
}
