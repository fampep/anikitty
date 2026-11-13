package site.anikitty.app.ui.app

import android.content.Context
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Switch
import androidx.compose.material3.SwitchDefaults
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import site.anikitty.app.ui.components.KittySectionHeading
import site.anikitty.app.ui.theme.KittyAccent
import site.anikitty.app.ui.theme.KittyFaint
import site.anikitty.app.ui.theme.KittyGlassShape
import site.anikitty.app.ui.theme.KittyMuted
import site.anikitty.app.ui.theme.KittyOnAccent
import site.anikitty.app.ui.theme.KittyOutlineSoft
import site.anikitty.app.ui.theme.KittySurface
import site.anikitty.app.ui.theme.KittyText

enum class HomeSurface(val key: String, val title: String) {
    Phone("phone", "Phone"),
    Television("tv", "Television"),
}

data class HomeSection(
    val id: String,
    val title: String,
)

data class HomeSectionState(
    val id: String,
    val title: String,
    val enabled: Boolean,
)

object HomeCatalog {
    val phone = listOf(
        HomeSection("resume", "Resume"),
        HomeSection("featured", "Featured"),
        HomeSection("genres", "Genres"),
        HomeSection("airing", "Airing today"),
        HomeSection("trending", "Trending"),
        HomeSection("top10", "Top 10"),
        HomeSection("popular", "Most popular"),
        HomeSection("continue", "Continue watching"),
        HomeSection("foryou", "For you"),
        HomeSection("plan", "Plan to watch"),
        HomeSection("completed", "Completed"),
        HomeSection("season", "This season"),
    )
    val television = listOf(
        HomeSection("continue", "Continue watching"),
        HomeSection("starting", "Starting soon"),
        HomeSection("airing", "Airing today"),
        HomeSection("trending", "Trending"),
        HomeSection("foryou", "For you"),
        HomeSection("favourites", "Favourites"),
        HomeSection("plan", "Plan to watch"),
        HomeSection("popular", "Most popular"),
        HomeSection("season", "This season"),
    )

    fun catalog(surface: HomeSurface): List<HomeSection> = when (surface) {
        HomeSurface.Phone -> phone
        HomeSurface.Television -> television
    }
}

/**
 * Order and visibility of home rows. Phone and television each keep their own list.
 * Missing ids from a newer build are appended so a saved layout does not drop them.
 */
class HomeLayoutStore(context: Context) {
    private val prefs = context.applicationContext.getSharedPreferences("anikitty_home", Context.MODE_PRIVATE)
    private var tick by mutableIntStateOf(0)

    fun sections(surface: HomeSurface): List<HomeSectionState> {
        tick
        val catalog = HomeCatalog.catalog(surface)
        val known = catalog.map { it.id }
        val hidden = hidden(surface)
        val saved = prefs.getString(orderKey(surface), null)
            ?.split(',')
            ?.map { it.trim() }
            ?.filter { it in known }
            .orEmpty()
        val ids = if (saved.isEmpty()) known else saved + known.filter { it !in saved }
        val titles = catalog.associate { it.id to it.title }
        return ids.map { id ->
            HomeSectionState(id = id, title = titles.getValue(id), enabled = id !in hidden)
        }
    }

    fun setEnabled(surface: HomeSurface, id: String, enabled: Boolean) {
        val next = hidden(surface).toMutableSet()
        if (enabled) next.remove(id) else next.add(id)
        prefs.edit().putString(hiddenKey(surface), next.joinToString(",")).apply()
        tick++
    }

    fun move(surface: HomeSurface, id: String, delta: Int) {
        val ids = sections(surface).map { it.id }.toMutableList()
        val index = ids.indexOf(id)
        val target = index + delta
        if (index < 0 || target !in ids.indices) return
        val displaced = ids[target]
        ids[target] = id
        ids[index] = displaced
        prefs.edit().putString(orderKey(surface), ids.joinToString(",")).apply()
        tick++
    }

    fun reset(surface: HomeSurface) {
        prefs.edit()
            .remove(orderKey(surface))
            .remove(hiddenKey(surface))
            .apply()
        tick++
    }

    private fun hidden(surface: HomeSurface): Set<String> =
        prefs.getString(hiddenKey(surface), null)
            ?.split(',')
            ?.map { it.trim() }
            ?.filter { it.isNotEmpty() }
            ?.toSet()
            .orEmpty()

    private fun orderKey(surface: HomeSurface) = "order_${surface.key}"

    private fun hiddenKey(surface: HomeSurface) = "hidden_${surface.key}"
}

@Composable
fun HomeLayoutSettings(store: HomeLayoutStore) {
    Column(verticalArrangement = Arrangement.spacedBy(14.dp)) {
        KittySectionHeading(
            title = "Home",
            subtitle = "Turn rows on or off, and move them up or down",
            padded = false,
        )
        HomeSurface.entries.forEach { surface ->
            val sections = store.sections(surface)
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(KittySurface, KittyGlassShape)
                    .border(1.dp, KittyOutlineSoft, KittyGlassShape)
                    .padding(12.dp),
            ) {
                Text(surface.title, color = KittyText, fontWeight = FontWeight.Bold, fontSize = 16.sp)
                Spacer(modifier = Modifier.height(8.dp))
                sections.forEachIndexed { index, section ->
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(vertical = 2.dp),
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Text(
                            section.title,
                            color = if (section.enabled) KittyText else KittyFaint,
                            fontWeight = FontWeight.SemiBold,
                            fontSize = 14.sp,
                            modifier = Modifier.weight(1f),
                        )
                        TextButton(
                            onClick = { store.move(surface, section.id, -1) },
                            enabled = index > 0,
                        ) { Text("Up") }
                        TextButton(
                            onClick = { store.move(surface, section.id, 1) },
                            enabled = index < sections.lastIndex,
                        ) { Text("Down") }
                        Spacer(modifier = Modifier.width(4.dp))
                        Switch(
                            checked = section.enabled,
                            onCheckedChange = { store.setEnabled(surface, section.id, it) },
                            colors = SwitchDefaults.colors(
                                checkedThumbColor = KittyOnAccent,
                                checkedTrackColor = KittyAccent,
                                uncheckedThumbColor = Color.White,
                                uncheckedTrackColor = Color.White.copy(alpha = 0.24f),
                                uncheckedBorderColor = Color.White.copy(alpha = 0.35f),
                            ),
                        )
                    }
                }
                OutlinedButton(
                    onClick = { store.reset(surface) },
                    shape = RoundedCornerShape(12.dp),
                    colors = ButtonDefaults.outlinedButtonColors(contentColor = KittyMuted),
                ) { Text("Reset ${surface.title.lowercase()}") }
            }
        }
    }
}
