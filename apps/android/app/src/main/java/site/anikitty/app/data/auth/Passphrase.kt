// Copyright 2026 fampep. AniKitty is owned by fampep.
// PolyForm Noncommercial License 1.0.0. https://polyformproject.org/licenses/noncommercial/1.0.0

package site.anikitty.app.data.auth

import java.security.SecureRandom

/**
 * Generates a fresh memorable passphrase each time from random syllables
 * (no fixed word dictionary). Used as the dedicated-server password (≥10 chars).
 */
object Passphrase {
    private val random = SecureRandom()

    // Building blocks only — combinations are random every call, not a word list.
    private val onsets = charArrayOf(
        'b', 'c', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm',
        'n', 'p', 'r', 's', 't', 'v', 'w', 'z',
    )
    private val vowels = charArrayOf('a', 'e', 'i', 'o', 'u')
    private val codas = charArrayOf(
        'b', 'd', 'f', 'g', 'k', 'l', 'm', 'n', 'p', 'r', 's', 't', 'x', 'z',
    )

    /** Six random syllable-words joined by `-`. */
    fun generate(parts: Int = 6): String {
        val n = parts.coerceIn(5, 8)
        return (1..n).joinToString("-") { randomWord() }
    }

    private fun randomWord(): String {
        val syllables = 2 + random.nextInt(2) // 2–3 syllables
        val sb = StringBuilder(syllables * 3)
        repeat(syllables) {
            if (random.nextBoolean()) sb.append(onsets[random.nextInt(onsets.size)])
            sb.append(vowels[random.nextInt(vowels.size)])
            if (random.nextFloat() < 0.65f) sb.append(codas[random.nextInt(codas.size)])
        }
        return sb.toString()
    }
}
