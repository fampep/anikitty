// Copyright 2026 fampep
// Licensed under the Apache License, Version 2.0. See the LICENSE file.

package site.anikitty.app

import android.app.Application
import android.os.Handler
import android.os.Looper
import android.util.Log
import coil.ImageLoader
import coil.ImageLoaderFactory
import coil.disk.DiskCache
import coil.memory.MemoryCache
import com.google.android.gms.cast.framework.CastContext
import site.anikitty.app.data.anilist.AniListAuthStore
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.anilist.AniListSync
import site.anikitty.app.data.auth.SavedPassphraseStore
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.AppDatabase
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.server.ServerConfig
import site.anikitty.app.data.servers.ServerCatalog

class AnikittyApp : Application(), ImageLoaderFactory {
    lateinit var database: AppDatabase
        private set
    lateinit var aniList: AniListClient
        private set
    lateinit var aniListAuth: AniListAuthStore
        private set
    lateinit var aniListSync: AniListSync
        private set
    lateinit var streamServers: ServerCatalog
        private set
    lateinit var serverConfig: ServerConfig
        private set
    lateinit var session: SessionStore
        private set
    lateinit var savedPassphrase: SavedPassphraseStore
        private set
    lateinit var api: DedicatedApiClient
        private set

    override fun newImageLoader(): ImageLoader =
        ImageLoader.Builder(this)
            .memoryCache {
                MemoryCache.Builder(this)
                    .maxSizePercent(0.25)
                    .build()
            }
            .diskCache {
                DiskCache.Builder()
                    .directory(cacheDir.resolve("image_cache"))
                    .maxSizePercent(0.04)
                    .build()
            }
            .allowHardware(true)
            .crossfade(true)
            .crossfade(180)
            .build()

    override fun onCreate() {
        super.onCreate()
        // Cast talks to Play services and is not needed for the first frame.
        Handler(Looper.getMainLooper()).post {
            runCatching { CastContext.getSharedInstance(this) }
                .onFailure { Log.w(TAG, "CastContext init skipped", it) }
        }
        database = AppDatabase.create(this)
        aniList = AniListClient(this)
        aniListAuth = AniListAuthStore(this)
        aniListSync = AniListSync(aniList, aniListAuth, database.watchHistoryDao())
        streamServers = ServerCatalog(this)
        serverConfig = ServerConfig(this)
        session = SessionStore(this)
        savedPassphrase = SavedPassphraseStore(this)
        api = DedicatedApiClient(
            baseUrlProvider = { serverConfig.baseUrl },
            tokenProvider = { session.token },
        )
    }

    private companion object {
        const val TAG = "AnikittyApp"
    }
}
