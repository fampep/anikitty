// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.extensions

/**
 * True when [remote] is a newer dotted version than [local].
 * "1.2.0" is newer than "1.1.9". A leading v and a -suffix are ignored.
 */
fun isNewerVersion(remote: String, local: String): Boolean {
    val a = versionParts(remote)
    val b = versionParts(local)
    val n = maxOf(a.size, b.size)
    for (i in 0 until n) {
        val diff = a.getOrElse(i) { 0 } - b.getOrElse(i) { 0 }
        if (diff != 0) return diff > 0
    }
    return false
}

private fun versionParts(raw: String): List<Int> {
    val core = raw.trim().removePrefix("v").removePrefix("V").substringBefore('-')
    if (core.isEmpty()) return emptyList()
    return core.split('.').map { piece ->
        piece.takeWhile { it.isDigit() }.toIntOrNull() ?: 0
    }
}
