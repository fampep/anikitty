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
import androidx.compose.ui.draw.shadow
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val KittyGlassShape = RoundedCornerShape(18.dp)
val KittyGlassShapeTight = RoundedCornerShape(12.dp)
val KittyGlassShapePill = RoundedCornerShape(999.dp)

/** Mirror sheen — cool top edge highlight over frosted fill. */
private val KittyMirrorSheen: Brush
    get() = Brush.verticalGradient(
        0f to Color.White.copy(alpha = 0.14f),
        0.18f to Color.White.copy(alpha = 0.05f),
        0.55f to Color.Transparent,
        1f to Color.Black.copy(alpha = 0.18f),
    )

private val KittyMirrorEdge: Brush
    get() = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.28f),
            Color.White.copy(alpha = 0.08f),
            KittyAccentGlow.copy(alpha = 0.12f),
            Color.White.copy(alpha = 0.10f),
        ),
    )

/** Frosted panel: translucent fill + hairline mirror border + soft depth. */
fun Modifier.kittyGlass(
    shape: Shape = KittyGlassShape,
    elevated: Boolean = false,
): Modifier = this
    .shadow(
        elevation = if (elevated) 18.dp else 10.dp,
        shape = shape,
        clip = false,
        ambientColor = Color.Black.copy(alpha = 0.45f),
        spotColor = KittyAccentGlow.copy(alpha = 0.12f),
    )
    .clip(shape)
    .background(if (elevated) KittySurfaceElevated else KittySurface)
    .background(KittyMirrorSheen)
    .border(1.dp, KittyMirrorEdge, shape)

fun Modifier.kittyGlassSoft(shape: Shape = KittyGlassShape): Modifier = this
    .clip(shape)
    .background(KittyGlass)
    .background(KittyMirrorSheen)
    .border(1.dp, KittyOutlineSoft, shape)

/** Stronger frosted overlay — player discs, floating chrome. */
fun Modifier.kittyGlassMirror(
    shape: Shape = KittyGlassShape,
    elevation: Dp = 14.dp,
): Modifier = this
    .shadow(
        elevation = elevation,
        shape = shape,
        clip = false,
        ambientColor = Color.Black.copy(alpha = 0.5f),
        spotColor = KittyAccentGlow.copy(alpha = 0.18f),
    )
    .clip(shape)
    .background(KittyGlassStrong)
    .background(KittyMirrorSheen)
    .border(1.dp, KittyMirrorEdge, shape)

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
                            KittyAccentGlow.copy(alpha = 0.18f),
                            Color.Transparent,
                        ),
                        radius = 1200f,
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color.White.copy(alpha = 0.04f),
                            Color.Transparent,
                        ),
                        radius = 900f,
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
                        1f to Color.Black.copy(alpha = 0.42f),
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
