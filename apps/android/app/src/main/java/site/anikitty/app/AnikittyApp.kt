package site.anikitty.app

import android.app.Application
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.auth.SavedPassphraseStore
import site.anikitty.app.data.auth.SessionStore
import site.anikitty.app.data.local.AppDatabase
import site.anikitty.app.data.server.DedicatedApiClient
import site.anikitty.app.data.server.ServerConfig
import site.anikitty.app.data.servers.ServerCatalog

class AnikittyApp : Application() {
    lateinit var database: AppDatabase
        private set
    lateinit var aniList: AniListClient
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

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.create(this)
        aniList = AniListClient(this)
        streamServers = ServerCatalog(this)
        serverConfig = ServerConfig(this)
        session = SessionStore(this)
        savedPassphrase = SavedPassphraseStore(this)
        api = DedicatedApiClient(
            baseUrlProvider = { serverConfig.baseUrl },
            tokenProvider = { session.token },
        )
    }
}
