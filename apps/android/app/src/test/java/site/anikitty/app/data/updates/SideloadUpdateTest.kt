// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.data.updates

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test

class SideloadUpdateTest {
    @Test
    fun aLaterDevCounterIsNewerOnTheSameRelease() {
        assertTrue(isNewerAppBuild("1.2.10-dev.19", "1.2.10-dev.18"))
        assertFalse(isNewerAppBuild("1.2.10-dev.18", "1.2.10-dev.19"))
        assertFalse(isNewerAppBuild("1.2.10-dev.19", "1.2.10-dev.19"))
    }

    @Test
    fun stableOfTheSameLineIsNewerThanItsDevBuilds() {
        assertTrue(isNewerAppBuild("1.2.10", "1.2.10-dev.19"))
        assertFalse(isNewerAppBuild("1.2.10-dev.1", "1.2.10"))
        assertTrue(isNewerAppBuild("1.2.11-dev.1", "1.2.10"))
        assertFalse(isNewerAppBuild("dev", "1.2.10-dev.19"))
    }

    @Test
    fun homeBannerFollowsTheSelectedChannel() {
        val releases = listOf(
            build("1.2.9", prerelease = false, at = "2026-11-01T00:00:00Z"),
            build("1.2.10-dev.18", prerelease = true, at = "2026-11-20T20:40:17Z"),
            build("dev", prerelease = true, at = "2026-11-20T20:51:56Z"),
            build("1.2.10-dev.19", prerelease = true, at = "2026-11-20T20:51:59Z"),
        )
        assertEquals(
            "1.2.10-dev.19",
            sideloadUpdate("1.2.10-dev.18", BuildChannel.Dev, releases)?.versionName,
        )
        assertNull(sideloadUpdate("1.2.10-dev.19", BuildChannel.Dev, releases))
        assertNull(sideloadUpdate("1.2.9", BuildChannel.Stable, releases))
        assertEquals(
            "1.2.9",
            sideloadUpdate("1.2.8", BuildChannel.Stable, releases)?.versionName,
        )
        assertEquals(
            "1.2.10-dev.19",
            sideloadUpdate("1.2.9", BuildChannel.Dev, releases)?.versionName,
        )
        val floatingLater = listOf(
            build("1.2.10-dev.19", prerelease = true, at = "2026-11-20T20:51:59Z"),
            build("dev", prerelease = true, at = "2026-11-20T21:00:00Z"),
        )
        assertEquals(
            "1.2.10-dev.19",
            sideloadUpdate("1.2.10-dev.18", BuildChannel.Dev, floatingLater)?.versionName,
        )
    }

    @Test
    fun aDismissedVersionStaysHiddenUntilSomethingNewerExists() {
        val releases = listOf(
            build("1.2.10-dev.19", prerelease = true, at = "2026-11-20T20:51:59Z"),
        )
        assertNull(
            sideloadUpdate("1.2.10-dev.18", BuildChannel.Dev, releases, dismissedVersion = "1.2.10-dev.19"),
        )
        val later = releases + build("1.2.10-dev.20", prerelease = true, at = "2026-11-20T21:10:00Z")
        assertEquals(
            "1.2.10-dev.20",
            sideloadUpdate("1.2.10-dev.18", BuildChannel.Dev, later, dismissedVersion = "1.2.10-dev.19")?.versionName,
        )
    }

    @Test
    fun theSavedChannelWinsAndDevIsTheDefaultForADevInstall() {
        assertEquals(BuildChannel.Dev, installedBuildChannel("1.2.10-dev.19"))
        assertEquals(BuildChannel.Stable, installedBuildChannel("1.2.9"))
        assertEquals(BuildChannel.Stable, selectedBuildChannel(BuildChannel.Stable, "1.2.10-dev.19"))
        assertEquals(BuildChannel.Dev, selectedBuildChannel(null, "1.2.10-dev.19"))
    }

    private fun build(name: String, prerelease: Boolean, at: String) = PublishedBuild(
        versionName = name,
        tag = if (name == "dev") "dev" else "v$name",
        prerelease = prerelease,
        publishedAt = at,
        notes = "",
        apkUrl = "https://example.com/$name.apk",
        pullRequests = emptyList(),
    )
}
