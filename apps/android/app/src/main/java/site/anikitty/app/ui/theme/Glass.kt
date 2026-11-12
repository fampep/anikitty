package site.anikitty.app.ui.theme

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.BoxScope
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.dp

val KittyGlassShape = RoundedCornerShape(18.dp)
val KittyGlassShapeTight = RoundedCornerShape(12.dp)
val KittyGlassShapePill = RoundedCornerShape(999.dp)

/** Frosted panel: translucent fill + hairline highlight border. */
fun Modifier.kittyGlass(
    shape: Shape = KittyGlassShape,
    elevated: Boolean = false,
): Modifier = this
    .clip(shape)
    .background(if (elevated) KittySurfaceElevated else KittySurface)
    .border(1.dp, KittyOutline, shape)

fun Modifier.kittyGlassSoft(shape: Shape = KittyGlassShape): Modifier = this
    .clip(shape)
    .background(KittyGlass)
    .border(1.dp, KittyOutlineSoft, shape)

@Composable
fun KittyAtmosphere(modifier: Modifier = Modifier) {
    Box(
        modifier = modifier
            .fillMaxSize()
            .background(KittyPageBrush),
    ) {
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            KittyAccentGlow.copy(alpha = 0.16f),
                            Color.Transparent,
                        ),
                        radius = 1100f,
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.verticalGradient(
                        0f to Color.Transparent,
                        0.55f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.35f),
                    ),
                ),
        )
    }
}

@Composable
fun KittyGlassPanel(
    modifier: Modifier = Modifier,
    shape: Shape = KittyGlassShape,
    elevated: Boolean = false,
    content: @Composable BoxScope.() -> Unit,
) {
    Box(
        modifier = modifier.kittyGlass(shape = shape, elevated = elevated),
        content = content,
    )
}
