package site.anikitty.app.data.servers

import android.content.Context
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update

/**
 * First-party watch servers shipped in the APK.
 * Users select one — no GitHub / third-party extension install.
 */
class ServerCatalog(context: Context) {
    private val prefs = context.getSharedPreferences("anikitty_servers", Context.MODE_PRIVATE)

    private val resolvers: List<StreamResolver> = listOf(
        AnikotoServer(),
    )

    private val _selectedId = MutableStateFlow(
        prefs.getString(KEY_SELECTED, AnikotoServer.ID) ?: AnikotoServer.ID,
    )
    val selectedId: StateFlow<String> = _selectedId.asStateFlow()

    val servers: List<StreamServer> get() = resolvers.map { it.server }

    fun select(id: String) {
        if (resolvers.none { it.server.id == id }) return
        prefs.edit().putString(KEY_SELECTED, id).apply()
        _selectedId.update { id }
    }

    fun selectedResolver(): StreamResolver =
        resolvers.firstOrNull { it.server.id == _selectedId.value } ?: resolvers.first()

    private companion object {
        const val KEY_SELECTED = "selected_server_id"
    }
}
