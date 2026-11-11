package site.anikitty.app

import android.app.Application
import site.anikitty.app.data.anilist.AniListClient
import site.anikitty.app.data.extensions.ExtensionRegistry
import site.anikitty.app.data.local.AppDatabase

class AnikittyApp : Application() {
    lateinit var database: AppDatabase
        private set
    lateinit var aniList: AniListClient
        private set
    lateinit var extensions: ExtensionRegistry
        private set

    override fun onCreate() {
        super.onCreate()
        database = AppDatabase.create(this)
        aniList = AniListClient()
        extensions = ExtensionRegistry(this)
    }
}
