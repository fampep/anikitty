// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.local

import kotlinx.coroutines.runBlocking
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import site.anikitty.app.data.demo.DemoLibrary

class WatchBackupTest {
    @Test
    fun olderBackupDoesNotRollBackLocalProgress() {
        val local = row(episode = 8, positionMs = 40_000L, updatedAtEpochMs = 200)
        val file = readWatchProgressBackup(
            backup(
                episode = 3,
                positionMs = 1_000L,
                updatedAtEpochMs = 100,
                listStatus = "CURRENT",
            ),
        )
        val merge = mergeWatchProgress(listOf(local), file!!.entries)
        assertNull(file.entries.single().malId)
        assertEquals(0, merge.updated)
        assertEquals(1, merge.kept)
        assertEquals(emptyList<WatchHistoryEntity>(), merge.writes)
        assertEquals(8, mergedWatchEntry(local, file.entries.single()).episode)
        assertEquals(40_000L, mergedWatchEntry(local, file.entries.single()).positionMs)
    }

    @Test
    fun newerBackupReplacesProgressAndKeepsTheCover() {
        val local = row(
            episode = 4,
            positionMs = 90_000L,
            updatedAtEpochMs = 100,
            cover = "https://cover",
            listStatus = "CURRENT",
        )
        val incoming = entry(
            episode = 2,
            positionMs = 0L,
            updatedAtEpochMs = 300,
            listStatus = null,
            malId = 55,
        )
        val merged = mergedWatchEntry(local, incoming)
        assertEquals(2, merged.episode)
        assertEquals(0L, merged.positionMs)
        assertEquals(300L, merged.updatedAtEpochMs)
        assertEquals("https://cover", merged.coverImageUrl)
        assertEquals("CURRENT", merged.listStatus)
        assertEquals(55, merged.malId)
    }

    @Test
    fun equalTimestampKeepsLocalProgressAndFillsAMissingMalId() {
        val local = row(episode = 6, positionMs = 10L, updatedAtEpochMs = 50, malId = null)
        val merged = mergedWatchEntry(
            local,
            entry(episode = 9, positionMs = 0L, updatedAtEpochMs = 50, malId = 12),
        )
        assertEquals(6, merged.episode)
        assertEquals(10L, merged.positionMs)
        assertEquals(12, merged.malId)
        val merge = mergeWatchProgress(listOf(local), listOf(entry(episode = 9, positionMs = 0L, updatedAtEpochMs = 50, malId = 12)))
        assertEquals(0, merge.updated)
        assertEquals(1, merge.kept)
        assertEquals(1, merge.writes.size)
        assertEquals(12, merge.writes.single().malId)
    }

    @Test
    fun missingLocalRowIsAdded() {
        val merge = mergeWatchProgress(
            emptyList(),
            listOf(entry(episode = 1, positionMs = 5L, updatedAtEpochMs = 10)),
        )
        assertEquals(1, merge.added)
        assertEquals(0, merge.updated)
        assertNull(merge.writes.single().malId)
        assertEquals("Serial", merge.writes.single().title)
    }

    @Test
    fun anOlderDuplicateDoesNotUndoTheNewerRow() {
        val older = entry(episode = 1, positionMs = 0L, updatedAtEpochMs = 10)
        val newer = entry(episode = 4, positionMs = 20L, updatedAtEpochMs = 40)
        val merge = mergeWatchProgress(emptyList(), listOf(newer, older))
        assertEquals(1, merge.added)
        assertEquals(0, merge.updated)
        assertEquals(4, merge.writes.single().episode)
    }

    @Test
    fun unreadableAndForeignFilesAreRejected() {
        assertNull(readWatchProgressBackup("not json"))
        assertNull(readWatchProgressBackup("""{"app":"other","progress":[]}"""))
        val empty = readWatchProgressBackup("""{"app":"anikitty","progress":[]}""")
        assertEquals(0, empty!!.entries.size)
        val skipped = readWatchProgressBackup(
            """{"progress":[{"anilistId":0,"title":"No"},{"title":"Missing id"}]}""",
        )
        assertEquals(0, skipped!!.entries.size)
        assertEquals(2, skipped.skipped)
        assertEquals("Skipped 2", watchImportSummary(0, 0, 0, skipped.skipped))
        assertEquals("No watch progress found in that file", watchImportSummary(0, 0, 0, 0))
    }

    @Test
    fun importUsesTheStoredRowSoALaterPlayheadIsNotReplaced() = runBlocking {
        val storedNow = row(
            episode = 9,
            positionMs = 50_000L,
            updatedAtEpochMs = 200,
            cover = "https://cover",
        )
        var stored: WatchHistoryEntity? = storedNow
        val merge = applyWatchImport(
            entries = listOf(entry(episode = 4, positionMs = 1_000L, updatedAtEpochMs = 150)),
            current = { stored },
            write = { stored = it },
            skip = { false },
        )
        assertEquals(0, merge.updated)
        assertTrue(merge.writes.isEmpty())
        assertEquals(9, stored!!.episode)
        assertEquals(50_000L, stored!!.positionMs)
        assertEquals("https://cover", stored!!.coverImageUrl)
    }

    @Test
    fun fillingMalIdWritesTheFreshRow() = runBlocking {
        var stored: WatchHistoryEntity? = row(
            episode = 8,
            positionMs = 40_000L,
            updatedAtEpochMs = 200,
            cover = "https://cover",
            malId = null,
        )
        applyWatchImport(
            entries = listOf(entry(episode = 3, positionMs = 1_000L, updatedAtEpochMs = 100, malId = 12)),
            current = { stored },
            write = { stored = it },
            skip = { false },
        )
        assertEquals(8, stored!!.episode)
        assertEquals(40_000L, stored!!.positionMs)
        assertEquals(200L, stored!!.updatedAtEpochMs)
        assertEquals("https://cover", stored!!.coverImageUrl)
        assertEquals(12, stored!!.malId)
    }

    @Test
    fun demoTitlesAreNotWrittenIntoHistory() = runBlocking {
        val demoId = DemoLibrary.harbor.id
        var writes = 0
        val merge = applyWatchImport(
            entries = listOf(entry(episode = 4, positionMs = 1_000L, updatedAtEpochMs = 10).copy(anilistId = demoId)),
            current = { null },
            write = { writes++ },
            skip = { DemoLibrary.find(it) != null },
        )
        assertEquals(0, writes)
        assertEquals(0, merge.added)
        assertEquals(1, merge.skipped)
        assertEquals(910001, demoId)
    }

    @Test
    fun summaryNamesWhatChanged() {
        assertEquals(
            "Imported 2 new, 1 updated. Kept 4 already newer, skipped 1",
            watchImportSummary(2, 1, 4, 1),
        )
        assertEquals(
            "Nothing to change. Kept 3 already newer",
            watchImportSummary(0, 0, 3, 0),
        )
    }

    private fun backup(
        episode: Int,
        positionMs: Long,
        updatedAtEpochMs: Long,
        listStatus: String = "",
    ) = """
        {
          "app": "anikitty",
          "exportedAtEpochMs": 1,
          "progress": [{
            "anilistId": 7,
            "title": "Serial",
            "episode": $episode,
            "positionMs": $positionMs,
            "durationMs": 1400000,
            "updatedAtEpochMs": $updatedAtEpochMs,
            "listStatus": "$listStatus",
            "malId": 0
          }]
        }
    """.trimIndent()

    private fun entry(
        episode: Int,
        positionMs: Long,
        updatedAtEpochMs: Long,
        listStatus: String? = null,
        malId: Int? = null,
    ) = WatchProgressBackupEntry(
        anilistId = 7,
        title = "Serial",
        episode = episode,
        positionMs = positionMs,
        durationMs = 1_400_000L,
        updatedAtEpochMs = updatedAtEpochMs,
        listStatus = listStatus,
        malId = malId,
    )

    private fun row(
        episode: Int,
        positionMs: Long,
        updatedAtEpochMs: Long,
        cover: String? = null,
        listStatus: String? = "CURRENT",
        malId: Int? = null,
    ) = WatchHistoryEntity(
        anilistId = 7,
        title = "Serial",
        coverImageUrl = cover,
        episode = episode,
        positionMs = positionMs,
        durationMs = 1_400_000L,
        updatedAtEpochMs = updatedAtEpochMs,
        listStatus = listStatus,
        malId = malId,
    )
}
