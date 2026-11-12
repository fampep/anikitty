package site.anikitty.desktop.ui.theme

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
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.Shape
import androidx.compose.ui.unit.Dp
import androidx.compose.ui.unit.dp

val KittyGlassShape = RoundedCornerShape(20.dp)
val KittyGlassShapeTight = RoundedCornerShape(14.dp)
val KittyGlassShapePill = RoundedCornerShape(999.dp)

private val KittyMirrorSheen: Brush
    get() = Brush.verticalGradient(
        0f to Color.White.copy(alpha = 0.14f),
        0.2f to Color.White.copy(alpha = 0.05f),
        0.55f to Color.Transparent,
        1f to Color.Black.copy(alpha = 0.22f),
    )

private val KittyMirrorEdge: Brush
    get() = Brush.linearGradient(
        colors = listOf(
            Color.White.copy(alpha = 0.30f),
            Color.White.copy(alpha = 0.08f),
            KittyAccentGlow.copy(alpha = 0.16f),
            Color.White.copy(alpha = 0.10f),
        ),
    )

fun Modifier.kittyGlass(
    shape: Shape = KittyGlassShape,
    elevated: Boolean = false,
): Modifier = this
    .shadow(
        elevation = if (elevated) 20.dp else 12.dp,
        shape = shape,
        clip = false,
        ambientColor = Color.Black.copy(alpha = 0.5f),
        spotColor = KittyAccentGlow.copy(alpha = 0.14f),
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

fun Modifier.kittyGlassField(shape: Shape = KittyGlassShapeTight): Modifier = this
    .clip(shape)
    .background(KittySurface)
    .background(KittyMirrorSheen)
    .border(1.dp, KittyOutlineSoft, shape)

fun Modifier.kittyGlassMirror(
    shape: Shape = KittyGlassShape,
    elevation: Dp = 14.dp,
): Modifier = this
    .shadow(
        elevation = elevation,
        shape = shape,
        clip = false,
        ambientColor = Color.Black.copy(alpha = 0.55f),
        spotColor = KittyAccentGlow.copy(alpha = 0.2f),
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
                            KittyAccentGlow.copy(alpha = 0.20f),
                            Color.Transparent,
                        ),
                        center = Offset(180f, 80f),
                        radius = 1400f,
                    ),
                ),
        )
        Box(
            modifier = Modifier
                .fillMaxSize()
                .background(
                    Brush.radialGradient(
                        colors = listOf(
                            Color(0xFF1A2840).copy(alpha = 0.35f),
                            Color.Transparent,
                        ),
                        center = Offset(1600f, 900f),
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
                        0.6f to Color.Transparent,
                        1f to Color.Black.copy(alpha = 0.55f),
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
