// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app.cast

import com.google.android.gms.common.ConnectionResult
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CastReadinessTest {
    @Test
    fun playServicesSuccessLeavesCastAvailable() {
        assertNull(castUnavailableReason(ConnectionResult.SUCCESS))
    }

    @Test
    fun missingOrDisabledPlayServicesExplainsWhyCastIsOff() {
        assertEquals(
            "Google Play services isn't installed, so Cast is off",
            castUnavailableReason(ConnectionResult.SERVICE_MISSING),
        )
        assertEquals(
            "Google Play services is turned off, so Cast is off",
            castUnavailableReason(ConnectionResult.SERVICE_DISABLED),
        )
        assertEquals(
            "Update Google Play services to use Cast",
            castUnavailableReason(ConnectionResult.SERVICE_VERSION_UPDATE_REQUIRED),
        )
    }

    @Test
    fun anyOtherPlayServicesStatusKeepsAShortReason() {
        assertEquals(CAST_UNAVAILABLE, castUnavailableReason(ConnectionResult.SERVICE_INVALID))
        assertEquals(CAST_UNAVAILABLE, castUnavailableReason(ConnectionResult.INTERNAL_ERROR))
        assertEquals(CAST_UNAVAILABLE, castUnavailableReason(-1))
    }
}
