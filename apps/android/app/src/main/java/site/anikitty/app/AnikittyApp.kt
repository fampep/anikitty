package site.anikitty.app

import android.app.Application
import site.anikitty.app.data.api.AnikittyApiClient
import site.anikitty.app.data.auth.TokenStore

class AnikittyApp : Application() {
    lateinit var tokenStore: TokenStore
        private set
    lateinit var api: AnikittyApiClient
        private set

    override fun onCreate() {
        super.onCreate()
        tokenStore = TokenStore(this)
        api = AnikittyApiClient(
            baseUrl = BuildConfig.API_BASE_URL,
            tokenProvider = { tokenStore.token },
        )
    }
}
