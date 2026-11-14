# AniKitty – maskot-designspec (5 idéer)

> Status: klar til kodning · Ejer: Lukas · Skrevet: 14. nov. 2026 · Baseret på `main` @ `c5a5c80` (stable 1.2.5)

## 0. Note om stak

Idéerne blev formuleret med "React Native med Expo" i tankerne, men **AniKitty er en native Android-app i Kotlin + Jetpack Compose** (Compose BOM `2024.10.01`, Material3, Media3, Coil 2.7, `minSdk 26`, `targetSdk 35`). Der findes ingen RN/Expo-kode i repoet. Derfor er hele spec'en skrevet til Compose. CSS/SVG/Reanimated svarer her til:

| RN/Web-begreb | Compose-ækvivalent brugt i denne spec |
|---|---|
| CSS transition / Reanimated `withTiming` | `Animatable.animateTo(tween(...))`, `animateFloatAsState` |
| Keyframes | `keyframes { }` spec / sekventielle `animateTo` i en coroutine |
| Loop (`withRepeat`) | `rememberInfiniteTransition()` |
| SVG path | `Path()` i `Canvas`/`DrawScope` (som `drawKittyFace`), eller `ImageVector` / `AnimatedVectorDrawable` |
| `transform`, `opacity` | `Modifier.graphicsLayer { }` (ingen recomposition) |
| `backdrop-filter: blur` | `RenderEffect.createBlurEffect` (API 31+) med fallback |
| `prefers-reduced-motion` | `prefersReducedMotion()` i `ui/theme/Motion.kt` (ANIMATOR_DURATION_SCALE == 0) |
| Expo SplashScreen | `androidx.core:core-splashscreen` + eksisterende Compose `SplashScreen` |
| Haptics (expo-haptics) | `KittyHaptics.perform(view, Kind.*)` i `ui/theme/KittyHaptics.kt` |

Ingen API-nøgler eller hemmeligheder indgår i denne spec eller i den kode, den beskriver.

---

## 1. Udgangspunkt i koden (det der findes i dag)

| Område | Fil | Relevante symboler |
|---|---|---|
| Maskot (vektor) | `apps/android/app/src/main/java/site/anikitty/app/ui/components/KittyFace.kt` | `KittyFace(modifier, animated, waving, contentDescription)`, `drawKittyFace(blink, lookX, lookY)`, `KittyDock`, `KittyAttention.nudge()`, `WeekGoalRing` |
| Brand-kilde | `docs/brand/anikitty-icon.svg`, `docs/brand/anikitty-icon-512.png` | viewBox 108×108, `rect rx=24 fill=#000` (den sorte firkant), hoved, to ører med indre trekanter, øjne, mund. **Ingen hale.** |
| Launcher-ikon | `res/drawable/ic_launcher_foreground.xml`, `ic_launcher_background.xml`, `ic_launcher_monochrome.xml`, `res/mipmap-anydpi-v26/ic_launcher*.xml` | Samme geometri som vector drawable |
| Tema | `ui/theme/Theme.kt` | `KittyPalette`, `KittyDarkPalette` (page `#000`), `KittyLightPalette` (page `#F3F3F1`), `LocalKittyPalette`, `AniKittyTheme { }`, `KittyNavPill*` farver |
| Brugerlook | `ui/theme/LookState.kt` | `accent`, `weekGoalMinutes`, `welcomed`, `markWeekCelebrated()`, SharedPreferences `anikitty_look` |
| Motion | `ui/theme/Motion.kt` | `prefersReducedMotion()`, `ShimmerBox` |
| Glas | `ui/theme/Glass.kt` | `kittyGlass()`, `kittyGlassSoft()`, `kittyGlassMirror()` – i dag solide flader, intet blur |
| Haptik | `ui/theme/KittyHaptics.kt` | `Kind { Tick, Confirm, Success, Error }`, indbygget throttling |
| Splash | `ui/app/SplashScreen.kt`, kaldt fra `ui/app/AppRoot.kt` (`showSplash` via `rememberSaveable`) | 100 ms delay → 520 ms scale/fade + 1800 ms tekst-sweep → `onFinished()` efter 2900 ms. `res/values/themes.xml` har ingen splash-attributter; `core-splashscreen` er **ikke** en dependency. |
| Knap-tryk | `ui/app/SpaceStyle.kt` | `Modifier.spacePress(onClick)` – scale 0.96, `KittyHaptics.Confirm`, `KittyAttention.nudge(0.25f, 0f)` (brugt i 10 filer) |
| Dock | `ui/components/KittyBottomNav.kt` | `KittyBottomNav` (glidende pille `dockPill`, 220 ms tween), `KittySideNav`, `KittyRoundIconButton` |
| Banner | `ui/components/HeroBanner.kt`, `data/banner/BannerRepository.kt`, `data/banner/BannerChain.kt` | `HeroBanner(anilistId, bannerUrl, coverUrl, …)`, `BannerChoice(url, blur)`, `SoftCover`-transformation |
| Hjem-hero | `ui/app/HomePage.kt` (`HomeFeatured`, ~l. 149–265) | Pager, 6500 ms auto-advance, scrim `Brush.verticalGradient(0f→0.15, 0.42→0, 1f→0.88 sort)` |
| Opgave-hændelser | `data/anilist/AniListSync.kt` `pushProgress()`; `ui/app/LocalFirstApp.kt` `applyListStatus(next)` (~l. 2356) og player-flow (~l. 405–455); `ui/app/MySpacePage.kt` (~l. 170–215, "mark completed"); `ui/player/PlayerScreen.kt` `Player.STATE_ENDED` (~l. 592) |
| Eksisterende overlay | `ui/app/AppRoot.kt` `WelcomeOverlay` | Model for et ikke-blokerende lag over `LocalFirstApp` |

**Designprincipper fra PR #129 der skal bevares:** korte tweens, ingen overshoot på ansigtet, reduceret bevægelse = stillestående, animation kun når `live = animated && !reduced && resumed && onScreen`, sort/hvid grundlook med brugerens `LookState.accent` som eneste farve.

---

## 2. Fælles fundament (bygges først – bruges af alle 5 idéer)

### 2.1 Opdel `drawKittyFace` i lag

I dag tegner `drawKittyFace` alt i én funktion. Refaktorér til en lagdelt tegnefunktion i en ny fil, så ører, hale og baggrund kan animeres enkeltvis uden at duplikere paths:

**Ny fil:** `ui/components/kitty/KittyGeometry.kt`

```kotlin
/** Alle maskot-paths i 108×108-koordinater, bygget én gang og skaleret pr. draw. */
internal object KittyGeometry {
    const val VIEWPORT = 108f
    val head: Path = Path().apply { /* 28,58 … flyttet uændret fra drawKittyFace */ }
    val leftEar: Path = /* … */
    val rightEar: Path = /* … */
    val leftEarInner: Path = /* 38,46 43,30 48,44 */
    val rightEarInner: Path = /* 60,44 65,30 70,46 */
    val mouth: Path = /* … */
    /** NY: hale, ligger bag hovedet, nederst til højre. Se idé 3. */
    val tail: Path = Path().apply {
        moveTo(74f, 72f)
        cubicTo(84f, 70f, 90f, 62f, 88f, 52f)   // op langs højre side
        cubicTo(87.5f, 49.5f, 85f, 49.5f, 85f, 52f)
        cubicTo(86f, 60f, 81f, 66f, 72f, 68f)
        close()
    }
    // Pivot-punkter (viewport-koordinater)
    val leftEarPivot = Offset(43f, 50f)   // ørebasen
    val rightEarPivot = Offset(66f, 50f)
    val tailPivot = Offset(74f, 70f)
}

@Immutable
data class KittyPose(
    val blink: Float = 1f,          // 0.12..1
    val lookX: Float = 0f,          // -1..1
    val lookY: Float = 0f,
    val leftEar: Float = 1f,        // 0 = foldet, 1 = rejst   (idé 2)
    val rightEar: Float = 1f,
    val tailAngle: Float = 0f,      // grader omkring tailPivot (idé 3)
    val tailAlpha: Float = 0f,      // 0 = skjult (default), idé 3 sætter ~0.06–0.10
    val headNod: Float = 0f,        // grader, + = nik ned (idé 5)
)

enum class KittyPlate { Solid, NeonGlass, None }   // idé 1

internal fun DrawScope.drawKitty(
    pose: KittyPose,
    plate: KittyPlate,
    plateStyle: KittyPlateStyle,    // farver/glow, se idé 1
)
```

Paths bygges i viewport-koordinater og tegnes med `withTransform({ scale(size.width / 108f, size.height / 108f, Offset.Zero) })` i stedet for at kalde `p(x, y)` for hvert punkt pr. frame – det fjerner ~40 `Offset`-allokeringer pr. draw. **Path-objekterne er immutable og må aldrig muteres i draw.**

`KittyFace` bevarer sin offentlige signatur (alle 20+ kaldesteder fortsætter uændret) og får nye valgfrie parametre:

```kotlin
@Composable
fun KittyFace(
    modifier: Modifier = Modifier,
    animated: Boolean = true,
    waving: Boolean = false,
    contentDescription: String = "AniKitty",
    plate: KittyPlate = LocalKittyPlate.current,       // idé 1
    poseOverride: KittyPose? = null,                    // idé 2/5 styrer ører/nik udefra
    tail: KittyTailState? = null,                       // idé 3
)
```

Tilføj et golden-test-lignende **snapshot-tjek**: `KittyGeometry` skal rendere pixel-identisk med `docs/brand/anikitty-icon.svg` når `pose = KittyPose()` og `plate = Solid` (tolerance ≤ 1 % pixels). Kan laves som Robolectric/Paparazzi-test senere; minimum er en `@Preview` side om side.

### 2.2 Motion-tokens

**Ny fil:** `ui/theme/KittyMotion.kt`

```kotlin
object KittyMotion {
    // Varigheder (ms) – skaleres automatisk af systemets animator duration scale via Compose.
    const val Micro = 120
    const val Short = 220      // matcher dockPill
    const val Medium = 360
    const val Long = 520       // matcher eksisterende splash-progress
    // Easing
    val Standard = FastOutSlowInEasing                       // cubic(0.4, 0, 0.2, 1)
    val Decelerate = CubicBezierEasing(0f, 0f, 0.2f, 1f)
    val Accelerate = CubicBezierEasing(0.4f, 0f, 1f, 1f)
    val EarUnfold = CubicBezierEasing(0.2f, 0.9f, 0.3f, 1f)  // let "fjedret" uden reelt overshoot
    val Gentle = CubicBezierEasing(0.37f, 0f, 0.63f, 1f)     // easeInOutSine – til hale/nik
}
```

### 2.3 Reduced motion – én kilde

`prefersReducedMotion()` læser i dag `Settings.Global` uden at lytte på ændringer. Udvid den til at blive genlæst ved `ON_RESUME` (brugeren slår "Fjern animationer" til i systemet og kommer tilbage):

```kotlin
@Composable
fun prefersReducedMotion(): Boolean {
    val context = LocalContext.current
    val lifecycle = LocalLifecycleOwner.current.lifecycle
    var reduced by remember { mutableStateOf(readReduced(context)) }
    DisposableEffect(lifecycle) {
        val obs = LifecycleEventObserver { _, e -> if (e == Lifecycle.Event.ON_RESUME) reduced = readReduced(context) }
        lifecycle.addObserver(obs); onDispose { lifecycle.removeObserver(obs) }
    }
    return reduced
}
private fun readReduced(c: Context) =
    Settings.Global.getFloat(c.contentResolver, Settings.Global.ANIMATOR_DURATION_SCALE, 1f) == 0f
```

Bemærk: Compose `tween()` respekterer automatisk duration scale (fx 0.5×, 2×). Ved 0× springer Compose-animationer til slut, men vores `delay()`-baserede loops kører stadig – derfor skal alle loops gates på `!reduced` (som `KittyFace` allerede gør).

### 2.4 Nye indstillinger (LookState)

Tilføj til `LookState` (SharedPreferences `anikitty_look`), med samme mønster som `setWeekGoal`:

| Nøgle | Type | Default | Idé |
|---|---|---|---|
| `neon_plate` | Boolean | `true` | 1 |
| `seasonal_banner` | Boolean | `true` | 4 |
| `season_hemisphere` | String `auto\|north\|south` | `auto` | 4 |
| `task_kitty` | Boolean | `true` | 5 |
| `last_splash_full_at` | Long (epoch ms) | `0` | 2 |

Vises i Settings (grupperet "Udseende → Maskot") i `MySpacePage.kt` ved siden af accent-vælgeren.

---

## 3. Idé 1 – Mørk tilstand: neonkantet glas bag katten

### Formål
I mørk tilstand er sidens baggrund `#000`, og maskottens sorte firkant (`drawRoundRect(Color.Black)`) forsvinder helt – katten "svæver" uden ramme, og kanten af ikonet går tabt. Neon-glasset giver katten en ramme og en blød glød, der føles levende, uden at bryde sort/hvid-looket.

### Visuel beskrivelse
- Firkanten (radius 22 % af `minDimension`, som i dag) bliver **mørkt, let gennemsigtigt glas**: fyld `Color(0xFF0B0B10)` med alpha 0.72 over en lodret gradient (top `white @ 0.06` → bund `transparent`) = "glas-highlight".
- **Neonkant:** 1.25 dp stroke (min 1 px) i `LookState.accent` (default hvid), alpha 0.85, med en **ydre glød** i to lag:
  - lag A: samme rect, stroke `4.dp`, accent alpha 0.22, blur-radius 6 dp
  - lag B: stroke `10.dp`, accent alpha 0.10, blur-radius 14 dp
- **Kattens glød:** hoved+ører får en indre-til-ydre halo: hvid alpha 0.16, blur 8 dp, tegnet *bag* de hvide paths. Selve katten forbliver ren `#FFF` (kontrast bevares).
- Indvendig "rim light": 0.5 dp inner stroke øverst (top 30 % af rect), hvid alpha 0.18 – giver glasdybde.
- Lys tilstand: **uændret solid sort firkant** (`KittyPlate.Solid`). Neonglas er kun mørk tilstand.

### Animation / timing
- **Puls (idle):** glødens alpha ånder 0.85 → 1.0 → 0.85 på lag A/B, `infiniteRepeatable(tween(3200, easing = KittyMotion.Gentle), RepeatMode.Reverse)`. Kun når `live` (on-screen, resumed, ikke reduced). Amplituden er bevidst lille (±15 %).
- **Overgang lys→mørk:** når `isSystemInDarkTheme()` skifter, cross-fade plate via `updateTransition(targetState = plate)`: `Solid → NeonGlass` 360 ms `Standard`; glød fader ind med 120 ms delay.
- **Tryk/blink-kobling:** når katten blinker (eksisterende 80+110 ms), dæmpes kattens halo til 0.10 og tilbage – gratis, da det læser `blink.value`.
- Reduced motion: ingen puls, glød statisk ved alpha 0.92.

### Teknisk tilgang
Glød tegnes i `DrawScope` – **ikke** som `Modifier.blur` på hele KittyFace (det ville sløre katten).

- **API 31+ (`Build.VERSION.SDK_INT >= 31`):** tegn glød-lagene i et separat `graphicsLayer` med `renderEffect = BlurEffect(radiusPx, radiusPx, TileMode.Decal)`. Strukturen bliver to søskende-`Canvas` i en `Box`: (1) glow-canvas med blur, (2) skarp canvas med glas + kant + kat.
- **API 26–30 fallback:** ingen RenderEffect. Brug `drawIntoCanvas { it.nativeCanvas.drawRoundRect(..., paint) }` med `android.graphics.Paint().apply { maskFilter = BlurMaskFilter(r, BlurMaskFilter.Blur.NORMAL) }`. `BlurMaskFilter` er ikke hardware-accelereret på alle versioner → begræns til **ét** glow-lag (lag A) og cache det: tegn glød til en `ImageBitmap` én gang pr. (size, accent) med `drawWithCache { }`.
- Under alle omstændigheder: brug `Modifier.drawWithCache` så `Path`, `Brush` og `Paint` bygges én gang pr. størrelse/farve – ikke pr. frame.

```kotlin
val LocalKittyPlate = staticCompositionLocalOf { KittyPlate.Solid }

// I AniKittyTheme (Theme.kt):
val plate = if (dark && LookState.neonPlate) KittyPlate.NeonGlass else KittyPlate.Solid
CompositionLocalProvider(LocalKittyPalette provides palette, LocalKittyPlate provides plate) { … }

// I KittyFace:
Box(modifier.semantics { this.contentDescription = contentDescription }) {
    if (plate == KittyPlate.NeonGlass) {
        val glowAlpha = if (live) breathing() else 0.92f   // InfiniteTransition
        KittyGlow(accent = palette.accent, alpha = glowAlpha, Modifier.matchParentSize())
    }
    Canvas(Modifier.matchParentSize().graphicsLayer { rotationZ = wave }) {
        drawKitty(pose, plate, plateStyle)
    }
}

@Composable
private fun KittyGlow(accent: Color, alpha: Float, modifier: Modifier) {
    val density = LocalDensity.current
    if (Build.VERSION.SDK_INT >= 31) {
        Canvas(modifier.graphicsLayer {
            renderEffect = BlurEffect(with(density){6.dp.toPx()}, with(density){6.dp.toPx()}, TileMode.Decal)
            this.alpha = alpha
            clip = false
        }) { drawGlowStrokes(accent) }
    } else {
        Canvas(modifier.drawWithCache { /* BlurMaskFilter-bitmap cache */ onDrawBehind { } }) { … }
    }
}
```

Glød må gå **uden for** layout-bounds (op til 14 dp). Kaldesteder med `clip` (fx `CatalogUi.kt:147`, `EpisodeCarousel.kt:318`) skal tjekkes; hvor gløden klippes, brug `KittyFace(plate = KittyPlate.Solid)` eksplicit eller giv parent `padding(14.dp)`.

### Filer
- **Ny:** `ui/components/kitty/KittyGeometry.kt`, `ui/components/kitty/KittyGlow.kt`
- **Ændres:** `ui/components/KittyFace.kt` (brug `drawKitty`, plate-parameter), `ui/theme/Theme.kt` (`LocalKittyPlate`, provide i `AniKittyTheme`), `ui/theme/LookState.kt` (`neonPlate`), `ui/app/MySpacePage.kt` (toggle)
- **Valgfrit senere:** launcher-ikonet ændres **ikke** (ikoner skal være statiske og læsbare på alle launchers).

### Tilgængelighed
- Kontrast: hvid kat på `#0B0B10` ≈ 19:1 – uændret over WCAG AAA. Neonkanten er dekorativ (non-text, kræver ≥ 3:1 mod `#000`: hvid accent ok; hvis brugeren vælger en mørk accent med `luminance() < 0.18`, løftes kanten til `lerp(accent, White, 0.4f)`).
- TalkBack: ingen ændring – `contentDescription` bevares; glød-canvas er `Modifier.clearAndSetSemantics {}`.
- Reduced motion: statisk glød.

### Performance
- Pulsen læses kun i `graphicsLayer { alpha = … }` → kun draw-fase, ingen recomposition.
- RenderEffect-blur på et ≤ 112 dp lag er billigt på API 31+. Men **maks 3 samtidige glødende katte on-screen** (fx i lister): `KittyFace` i `LazyColumn`-items får `plate = Solid` som default via en `LocalKittyPlate`-override i listekontekst; kun hero-steder (HomeBar l. 77/100, Splash, MySpace-header, WeekGoalRing, Player-tomtilstand) får neon.
- Lav-ende enheder (`ActivityManager.isLowRamDevice()` eller `Build.VERSION.SDK_INT < 28`): ingen puls, kun lag A.

### Edge cases
- **AMOLED:** sidebaggrund er allerede `#000`; glas-fyld `#0B0B10` er bevidst ikke-sort for at markere fladen. Glød lyser kun få pixels → ubetydeligt batteri.
- **Dynamic colour:** appen bruger ikke Material You dynamic colour i dag; accent kommer fra `LookState.accent`. Hvis dynamic colour tilføjes, brug `MaterialTheme.colorScheme.primary` som glødfarve.
- **Brugerens accent ændres:** `drawWithCache` keys på `accent` → gløden genbygges.
- **Rotation/fold:** tegnes relativt til `size`; blur-radius i dp → skalerer korrekt.
- **Screenshot/screen recording/Cast:** ingen særbehandling.
- **Player (fuldskærm):** player-kaldsteder (`PlayerScreen.kt:1228/1885/2241`) bruger `plate = Solid` for ikke at distrahere over video.

### Acceptkriterier
1. Mørk tilstand: maskotten på Home, Splash og MySpace viser glaskant + glød; lys tilstand er pixel-uændret mod i dag.
2. API 26-emulator viser fallback-glød uden crash; API 34 viser RenderEffect-blur.
3. Med "Fjern animationer" slået til pulserer intet.
4. Ingen ekstra recompositions (Layout Inspector recomposition count stabil) under puls.
5. Toggle i Settings slår neon fra/til uden genstart.

---

## 4. Idé 2 – Opstartsanimation: ørerne folder sig ud én ad gangen

### Formål
Gør åbningen personlig: katten "vågner". Erstatter det nuværende generiske scale/fade i `SplashScreen.kt` med en karakter-animation, uden at gøre opstarten længere.

### Visuel beskrivelse (keyframes)
Starttilstand: hovedet synligt, **begge ører foldet** (roteret ned/bagud mod hovedet, skaleret til 35 % højde), **øjnene lukkede** (`blink = 0.12`).

| t (ms) | Begivenhed |
|---|---|
| 0 | System-splash (sort baggrund + statisk ikon) forsvinder, Compose-splash overtager med identisk billede → ingen "hop". |
| 0–120 | Hold (katten sover). Svag radial glød (eksisterende `drawBehind`) fader 0 → 0.14. |
| 120–420 | **Venstre øre** folder ud: `leftEar 0 → 1`, 300 ms, `KittyMotion.EarUnfold`. |
| 300–600 | **Højre øre** folder ud (180 ms forskudt, overlapper): `rightEar 0 → 1`, 300 ms. |
| 420–470 | Venstre øre: lille "ryst" – rotation +4° → 0° (50 ms + 80 ms), `Standard`. |
| 600–690 | **Øjnene åbner**: `blink 0.12 → 1`, 90 ms, `Decelerate`. |
| 690–1050 | Ét glance: `lookX 0 → 0.5 → 0` (180 + 180 ms). |
| 700–1500 | "AniKitty"-teksten: eksisterende stroke-sweep (forkortet fra 1800 → 800 ms) og fill-fade. |
| 1500–1800 | Hele splash fader ud (alpha 1 → 0, 300 ms, `Accelerate`) mens hovedindhold fader ind. |

Total: **~1800 ms** (i dag ~2900 ms). Kortere og mere karakter.

**Øre-transformation** (pr. øre, `t ∈ [0,1]`):
- rotation omkring ørebasen (`leftEarPivot`/`rightEarPivot`): `lerp(-70°, 0°, t)` for venstre, `lerp(+70°, 0°, t)` for højre (folder udad mod siderne, som en kat der har ørerne fladt tilbage)
- scaleY omkring samme pivot: `lerp(0.35f, 1f, t)`
- indre trekant (`leftEarInner`) følger samme transform; alpha `lerp(0f, 1f, (t - 0.4f) / 0.6f)` så det sorte indre først ses når øret er halvt rejst.

### Teknisk tilgang

**Lag 1 – System splash (`androidx.core:core-splashscreen:1.0.1`):**
- Tilføj dependency i `apps/android/app/build.gradle.kts`.
- `res/values/themes.xml`: ny `Theme.AniKitty.Starting` (parent `Theme.SplashScreen`): `windowSplashScreenBackground = @android:color/black`, `windowSplashScreenAnimatedIcon = @drawable/ic_splash_kitty_sleeping` (ny vektor: kat med foldede ører, lukkede øjne, på sort – så første frame matcher Compose-splashens t=0), `postSplashScreenTheme = @style/Theme.AniKitty`.
- `AndroidManifest.xml`: `MainActivity` theme → `Theme.AniKitty.Starting`.
- `MainActivity.onCreate`: kald `installSplashScreen()` **før** `super.onCreate`. Ingen `setKeepOnScreenCondition` (vi venter ikke på data). Brug `setOnExitAnimationListener { it.remove() }` straks – Compose-splash tegner identisk frame, så overgangen er usynlig.
- Valgfrit (API 31+): `windowSplashScreenAnimatedIcon` kan være en `AnimatedVectorDrawable` der allerede starter øre-animationen (max 1000 ms på systemniveau). **Anbefales ikke i v1** – to animationssystemer skal så synkroniseres. Hold system-splash statisk.

**Lag 2 – Compose (`ui/app/SplashScreen.kt`, omskrives):**

```kotlin
@Composable
fun SplashScreen(onFinished: () -> Unit) {
    val reduced = prefersReducedMotion()
    val context = LocalContext.current
    val leftEar = remember { Animatable(if (reduced) 1f else 0f) }
    val rightEar = remember { Animatable(if (reduced) 1f else 0f) }
    val earShake = remember { Animatable(0f) }
    val eyes = remember { Animatable(if (reduced) 1f else 0.12f) }
    val lookX = remember { Animatable(0f) }
    val exit = remember { Animatable(1f) }

    LaunchedEffect(Unit) {
        val full = !reduced && LookState.shouldPlayFullSplash(context)   // se edge cases
        if (!full) { /* snap alt til 1f */ delay(if (reduced) 250 else 600); onFinished(); return@LaunchedEffect }
        delay(120)
        coroutineScope {
            launch { leftEar.animateTo(1f, tween(300, easing = KittyMotion.EarUnfold))
                     earShake.animateTo(4f, tween(50)); earShake.animateTo(0f, tween(80, easing = KittyMotion.Standard)) }
            launch { delay(180); rightEar.animateTo(1f, tween(300, easing = KittyMotion.EarUnfold)) }
        }
        eyes.animateTo(1f, tween(90, easing = KittyMotion.Decelerate))
        KittyHaptics.perform(view, KittyHaptics.Kind.Tick)                 // ét blødt "vågen"-tick
        lookX.animateTo(0.5f, tween(180)); lookX.animateTo(0f, tween(180))
        delay(450)
        exit.animateTo(0f, tween(300, easing = KittyMotion.Accelerate))
        LookState.markFullSplash(context)
        onFinished()
    }

    Box(Modifier.fillMaxSize().background(palette.page).graphicsLayer { alpha = exit.value }) {
        KittyFace(
            modifier = Modifier.size(112.dp).align(Alignment.Center),
            animated = false,                                    // splash styrer pose selv
            poseOverride = KittyPose(
                blink = eyes.value, lookX = lookX.value,
                leftEar = leftEar.value, rightEar = rightEar.value,
            ),
            earShakeDegrees = earShake.value,
        )
        // … eksisterende "AniKitty"-tekst med forkortet sweep (800 ms)
    }
}
```

`poseOverride` læses i draw-lambdaen (Animatable `.value` læst inde i `Canvas { }`) → **kun draw-invalidering**, ingen recomposition pr. frame. Sørg for at `KittyPose` konstrueres inde i draw-scopet eller via `() -> KittyPose`-lambda (`poseProvider: (() -> KittyPose)?`) for at undgå recomposition – foretræk lambda-varianten.

I `drawKitty`: øret tegnes med

```kotlin
withTransform({
    rotate(degrees = lerp(-70f, 0f, pose.leftEar) + shake, pivot = KittyGeometry.leftEarPivot)
    scale(scaleX = 1f, scaleY = lerp(0.35f, 1f, pose.leftEar), pivot = KittyGeometry.leftEarPivot)
}) { drawPath(KittyGeometry.leftEar, White); drawPath(KittyGeometry.leftEarInner, Black, alpha = innerAlpha) }
```

Ørerne tegnes **før** hovedet, så den foldede del gemmer sig bag hovedet.

### Filer
- **Ændres:** `apps/android/app/build.gradle.kts` (+`androidx.core:core-splashscreen:1.0.1`), `res/values/themes.xml` (`Theme.AniKitty.Starting`), `AndroidManifest.xml`, `MainActivity.kt` (`installSplashScreen()`), `ui/app/SplashScreen.kt` (omskrives), `ui/components/KittyFace.kt` (`poseProvider`), `ui/theme/LookState.kt` (`shouldPlayFullSplash`, `markFullSplash`)
- **Ny:** `res/drawable/ic_splash_kitty_sleeping.xml` (vector, 108-viewport, genereres fra `KittyGeometry` med `leftEar = rightEar = 0`, `blink = 0.12`). Holdes i sync manuelt; tilføj kommentar i begge filer.

### Tilgængelighed
- Reduced motion: ingen øre/øje-animation; katten vises vågen og splash lukker efter 250 ms.
- TalkBack: splash-`Box` får `semantics { contentDescription = "AniKitty starter"; liveRegion = LiveRegionMode.Polite }` – annonceres én gang. Ingen fokusfælde; splash har ingen interaktive elementer.
- Haptik: ét `Tick`, kun hvis systemets haptik er slået til (`KittyHaptics` tjekker allerede).

### Performance
- Kold start: Compose-splash må ikke forsinke `LocalFirstApp`-initialisering. Flyt tung init (Room, `ServerCatalog`) til at starte parallelt mens splash spiller (i dag sker det i `AnikittyApp.onCreate`, fint).
- Målsætning: første frame < 400 ms efter proces-start på en mid-range enhed (Macrobenchmark `StartupTimingMetric` – valgfri).

### Edge cases
- **Process death / genstart af aktivitet:** `showSplash` er `rememberSaveable` i `AppRoot` → splash vises ikke igen efter rotation eller process death-restore. Bevares.
- **Varm start inden for 30 min:** `shouldPlayFullSplash()` returnerer `false` hvis `now - last_splash_full_at < 30 * 60_000` → kort variant (600 ms, ingen øre-animation). Undgår irritation ved hyppige app-skift.
- **Deep link / OAuth-callback** (`pendingAniListToken` sat): spring splash over helt (`showSplash = false` straks), så login-flowet ikke forsinkes.
- **Første kørsel:** fuld animation altid; derefter vises `WelcomeOverlay` som i dag.
- **Lys tilstand:** splash-baggrund følger `palette.page` (`#F3F3F1`), men system-splash er sort → hop. Løsning: lav `values-night/themes.xml` + `values/themes.xml` med hhv. sort og `#F3F3F1` `windowSplashScreenBackground`, og to vektorer (`ic_splash_kitty_sleeping` med sort plate virker på begge baggrunde).
- **Rotation under animation:** `Animatable`er er `remember` (ikke saveable) – ved configuration change genstartes splash ikke, fordi `showSplash` allerede er `false` hvis animationen nåede at kalde `onFinished`; ellers genstarter den kort-varianten. Acceptabelt.
- **Android 12+ ikon-maske:** system-splash-ikon klippes til cirkel (240 dp med 160 dp synligt). Vektoren skal have katten inden for de midterste 66 %.

### Acceptkriterier
1. Kold start: venstre øre rejser sig, så højre (forskudt ~180 ms), derefter åbner øjnene; total ≤ 1900 ms.
2. Ingen synligt hop mellem system-splash og Compose-splash på API 31+ og API 26.
3. Varm start inden for 30 min → kort variant.
4. "Fjern animationer" → statisk vågen kat, ≤ 300 ms splash.
5. OAuth-deeplink åbner direkte uden splash.

---

## 5. Idé 3 – Mikrointeraktioner: katten vipper halen (næsten usynligt) i baggrunden

### Formål
Små levende detaljer der belønner interaktion uden at stjæle opmærksomhed. Halen er en "easter egg"-detalje – man ser den, hvis man kigger efter.

### Visuel beskrivelse
- Ny **hale** (`KittyGeometry.tail`) bag hovedet, nederst til højre, i hvid.
- **Default skjult** (`tailAlpha = 0`) – bevarer det rene brand-ikon overalt, hvor der ikke interageres.
- Ved knaptryk: halen fader ind til **alpha 0.08** (mørk tilstand) / **0.10** (lys tilstand – pladen er stadig sort, se edge cases), vipper og fader ud igen.
- Placering: halen tegnes kun i **udvalgte, synlige maskotter** – i praksis `HomeBar`-katten (Home), MySpace-header-katten og dock-pillen. For dock'en tilføjes en **lille halesilhuet bag den aktive pille** i `KittyBottomNav` (14×10 dp, hvid alpha 0.06, ved pillens nederste højre hjørne).

### Animation / timing
"Flick" (én pr. tryk):

| t (ms) | tailAngle | tailAlpha |
|---|---|---|
| 0 | 0° | 0 |
| 0–90 | 0 → +14° (`Decelerate`) | 0 → 0.08 (60 ms) |
| 90–220 | +14 → −8° (`Gentle`) | hold |
| 220–340 | −8 → 0° (`Gentle`) | 0.08 → 0 (fra 260 ms, 120 ms) |

Total **340 ms**. Brug `keyframes`:

```kotlin
tailAngle.animateTo(0f, keyframes {
    durationMillis = 340
    14f at 90 using KittyMotion.Decelerate
    -8f at 220 using KittyMotion.Gentle
    0f at 340 using KittyMotion.Gentle
})
```

- **Idle-svirp (valgfrit, default fra):** én flick hvert 18–40 s tilfældigt, kun når `live`. Default **off** for at holde ikonet roligt; kan aktiveres senere.
- **Dock-hale:** når pillen glider (`dockPill`, 220 ms), vipper dock-halen i modsat retning af bevægelsen (−10° ved højre-glid, +10° ved venstre), så den "slæber efter", og retter sig ud over 260 ms. **Alpha 0 i hvile, 0.06 under glid og 200 ms efter** (konstant 0.06 er for synligt på AMOLED-sort).

### Teknisk tilgang
Global, letvægts hændelsesbus i stil med eksisterende `KittyAttention`:

```kotlin
// ui/components/KittyFace.kt (ved siden af KittyAttention)
object KittyTail {
    /** Monotont stigende tæller; hver ændring = én flick. Læses som state af synlige katte. */
    var flicks by mutableIntStateOf(0)
        private set
    private var nextAllowed = 0L
    fun flick() {
        val now = SystemClock.uptimeMillis()
        if (now < nextAllowed) return          // throttle: max én flick pr. 280 ms
        nextAllowed = now + 280L
        flicks++
    }
}
```

`Modifier.spacePress` (SpaceStyle.kt) kalder allerede `KittyAttention.nudge(...)` – tilføj `KittyTail.flick()` lige efter. Det dækker automatisk alle 10 filer, der bruger `spacePress`. `KittyRoundIconButton` bruger også `spacePress` → dækket.

I `KittyFace`:

```kotlin
val tailAngle = remember { Animatable(0f) }
val tailAlpha = remember { Animatable(0f) }
val flicks = KittyTail.flicks
LaunchedEffect(flicks, live) {
    if (!live || flicks == 0) return@LaunchedEffect
    launch { tailAlpha.animateTo(0.08f, tween(60)); delay(200); tailAlpha.animateTo(0f, tween(120)) }
    tailAngle.animateTo(0f, flickKeyframes)    // starter forfra hvis afbrudt
}
```

`LaunchedEffect(flicks)` annullerer en igangværende flick når en ny kommer → hurtige gentagne tryk giver ikke ophobning; halen "fanger" den nye bevægelse fra sin aktuelle vinkel (Animatable fortsætter fra current value).

Kun **én** kat pr. skærm reagerer: `KittyFace(tail = KittyTailState.Reactive)` sættes eksplicit på HomeBar-katten (HomePage.kt l. 77) og MySpace-header (MySpacePage.kt l. 722). Default `tail = null` → ingen hale, ingen LaunchedEffect. Det forhindrer at 12 katte i en liste vifter samtidig.

Dock-hale i `KittyBottomNav`: tegn i den eksisterende pille-`Box` via `drawBehind` med `rotate(angle, pivot)`; `angle` fra `animateFloatAsState` der keys på `index`-ændring.

### Filer
- **Ændres:** `ui/components/KittyFace.kt` (`KittyTail`, tail-lag, `tail`-parameter), `ui/components/kitty/KittyGeometry.kt` (`tail`, `tailPivot`), `ui/app/SpaceStyle.kt` (`spacePress` → `KittyTail.flick()`), `ui/components/KittyBottomNav.kt` (dock-hale), `ui/app/HomePage.kt` + `ui/app/MySpacePage.kt` (opt-in `tail = Reactive`)

### Tilgængelighed
- Ren dekoration: ingen semantics, ingen påvirkning af TalkBack eller fokus.
- Reduced motion: ingen flick overhovedet (`live == false`).
- Ingen ekstra haptik (spacePress giver allerede `Confirm`).
- Halen må aldrig dække tekst eller ikoner (den ligger bag hovedet inde i plate-bounds).

### Performance
- `flicks` er én `Int`-state; kun de 1–2 opt-in katte læser den. Animatable-værdier læses i draw-lambdaen → ingen recomposition pr. frame.
- Lazy lister: ingen katte i items har hale → ingen omkostning.
- Throttle 280 ms + `KittyHaptics`-throttle forhindrer spam.

### Edge cases
- **Lys tilstand:** pladen er sort i lys tilstand (`Solid`), så halen tegnes hvid alpha 0.10 på sort – samme som mørk. Dock-halen i lys tilstand: dock-baggrund er `KittyNavPillSurface` (`#08080C`) i begge temaer i dag → hvid 0.06 virker.
- **AMOLED:** alpha ≤ 0.08 hvid på `#000` = næsten usynlig, som ønsket.
- **Hurtige gentagne tryk:** throttle + cancel-and-restart (se ovenfor).
- **Tryk der navigerer væk:** katten forlader skærmen → `onScreen = false` → `live = false` → LaunchedEffect afbrydes, alpha snapper til 0.
- **Player:** player-knapper bruger `spacePress`, men player-kattene har ingen hale → intet sker. Godt (ingen distraktion over video).

### Acceptkriterier
1. Tryk på et vilkårligt `spacePress`-element på Home → HomeBar-katten flicker halen én gang (340 ms), knap synlig.
2. 10 tryk på 1 s → højst 4 flicks, ingen hakken.
3. Dock-pille-skift → lille hale slæber efter og retter sig ud.
4. Reduced motion → ingen hale vises nogensinde.
5. Kattens brand-silhuet uden interaktion er pixel-identisk med i dag (halen alpha 0).

---

## 6. Idé 4 – Ugentligt tema: bannerfarven skifter efter sæson

### Formål
Giver Home-heroen en subtil følelse af tid og årstid og gør appen frisk uge for uge, uden at ændre den sort/hvide identitet.

### Visuel beskrivelse
- En **farvetone (tint)** lægges i hero-scrimmet i `HomeFeatured` og i `HeroBanner`-fallbacken (blurred cover).
- Tonen ændres **én gang pr. ISO-uge** og glider gennem året mellem fire sæson-ankre:

| Sæson (nordlig halvkugle) | Uger (ISO) | Anker-farve | Stemning |
|---|---|---|---|
| Vinter | 49–52/53, 1–8 | `#7FA8FF` (isblå) | kølig |
| Forår | 9–21 | `#9BE7B0` (mynte) / kirsebær-accent `#FFB7D5` uge 13–16 (sakura) | frisk |
| Sommer | 22–34 | `#FFD27A` (solgul) | varm |
| Efterår | 35–48 | `#FF9A5C` (rav) | glødende |

- **Interpolation:** uge-farven = `lerp(anker_i, anker_i+1, fraktion)` i **Oklab**-agtigt rum (brug `androidx.compose.ui.graphics.lerp` – sRGB er acceptabelt, men `ColorSpaces.Oklab` giver pænere mellemfarver: `lerp(a.convert(Oklab), b.convert(Oklab), f).convert(Srgb)`).
- **Anvendelse:** scrim'et i `HomeFeatured` bliver:
  ```
  0.00 → seasonTint @ 0.20
  0.42 → transparent
  0.75 → seasonTint @ 0.10 blandet med sort
  1.00 → black @ 0.88   (uændret, sikrer tekstkontrast)
  ```
  plus en 2 dp **sæson-hairline** øverst på pager-kortet (`seasonTint @ 0.55`).
- Lille sæson-label i hero-overlayet (valgfri, default til): "Uge 46 · Efterår".
- Pager-prikker (indikatorer) i aktiv tilstand bruger `seasonTint` i stedet for hvid.
- Maskotten får **ingen** tint (brand forbliver sort/hvid) – men på de 4 sæsonskift-uger (første uge i hver sæson) kan HomeBar-katten vise et lille sæson-tilbehør senere (out of scope v1).

### Animation / timing
- Ny uge ved app-åbning → tint cross-fader fra sidste viste farve til ny over **1200 ms**, `KittyMotion.Standard`, 400 ms efter Home er synlig (så brugeren opdager skiftet). Ellers ingen animation.
- Pager-skift: tint er den samme for alle sider → ingen ekstra animation.
- Reduced motion: snap.

### Teknisk tilgang
Ingen WorkManager nødvendig – farven er en ren funktion af datoen og beregnes ved composition + ved `ON_RESUME` (hvis appen ligger åben over midnat søndag→mandag).

**Ny fil:** `ui/theme/SeasonTheme.kt`

```kotlin
enum class Hemisphere { North, South }
enum class Season { Winter, Spring, Summer, Autumn }

@Immutable
data class SeasonTint(val color: Color, val season: Season, val isoWeek: Int, val year: Int)

object SeasonTheme {
    private val southern = setOf("AU","NZ","ZA","AR","CL","UY","PY","BO","PE","BR","ID","MG","MZ","ZW","ZM","BW","NA","LS","SZ","FJ","PG")

    fun hemisphere(pref: String, locale: Locale = Locale.getDefault()): Hemisphere = when (pref) {
        "north" -> Hemisphere.North
        "south" -> Hemisphere.South
        else -> if (locale.country.uppercase() in southern) Hemisphere.South else Hemisphere.North
    }

    /** Ren funktion – enhedstestes. */
    fun tintFor(date: LocalDate, hemisphere: Hemisphere): SeasonTint {
        val week = date.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR)
        val year = date.get(IsoFields.WEEK_BASED_YEAR)
        val weeksInYear = if (IsoFields.WEEK_OF_WEEK_BASED_YEAR.rangeRefinedBy(date).maximum == 53L) 53 else 52
        // Fase 0..1 gennem året, forskudt så midtvinter (uge 3) = 0. Sydlig: +0.5.
        var phase = ((week - 3 + weeksInYear) % weeksInYear) / weeksInYear.toFloat()
        if (hemisphere == Hemisphere.South) phase = (phase + 0.5f) % 1f
        val anchors = listOf(Season.Winter to 0x7FA8FF, Season.Spring to 0x9BE7B0, Season.Summer to 0xFFD27A, Season.Autumn to 0xFF9A5C)
        val pos = phase * 4f
        val i = pos.toInt() % 4
        val f = KittyMotion.Gentle.transform(pos - pos.toInt())    // blødt plateau midt i sæsonen
        val c = lerpOklab(Color(0xFF000000 or anchors[i].second.toLong()), Color(0xFF000000 or anchors[(i+1)%4].second.toLong()), f)
        return SeasonTint(c, if (f < 0.5f) anchors[i].first else anchors[(i+1)%4].first, week, year)
    }
}

val LocalSeasonTint = staticCompositionLocalOf<SeasonTint?> { null }

@Composable
fun rememberSeasonTint(): SeasonTint? {
    if (!LookState.seasonalBanner) return null
    val context = LocalContext.current
    var today by remember { mutableStateOf(LocalDate.now()) }
    LifecycleResumeEffect(Unit) { today = LocalDate.now(); onPauseOrDispose { } }
    val hemi = SeasonTheme.hemisphere(LookState.seasonHemisphere)
    return remember(today.get(IsoFields.WEEK_OF_WEEK_BASED_YEAR), hemi) { SeasonTheme.tintFor(today, hemi) }
}
```

`java.time` + `IsoFields` er tilgængeligt fra API 26 (minSdk) uden desugaring. ✅

Provide i `AniKittyTheme`, læs i `HomeFeatured`:

```kotlin
val tint = LocalSeasonTint.current
val animatedTint by animateColorAsState(tint?.color ?: Color.Transparent,
    animationSpec = if (reduced) snap() else tween(1200, delayMillis = 400, easing = KittyMotion.Standard), label = "season")
Box(Modifier.fillMaxSize().drawBehind {
    drawRect(Brush.verticalGradient(
        0f to animatedTint.copy(alpha = 0.20f),
        0.42f to Color.Transparent,
        0.75f to lerp(Color.Black, animatedTint, 0.10f).copy(alpha = 0.55f),
        1f to Color.Black.copy(alpha = 0.88f)))
})
```

Brug `drawBehind` (draw-fase) i stedet for `.background(Brush)` så farve-animationen ikke recomposer pager-siderne.

"Sidst viste uge" gemmes i `LookState` (`season_last_week = "2026-W46"`) så cross-fade kun spiller én gang pr. ny uge (ellers snap).

### Filer
- **Ny:** `ui/theme/SeasonTheme.kt`, `app/src/test/java/site/anikitty/app/ui/theme/SeasonThemeTest.kt`
- **Ændres:** `ui/theme/Theme.kt` (provide `LocalSeasonTint`), `ui/theme/LookState.kt` (`seasonalBanner`, `seasonHemisphere`, `seasonLastWeek`), `ui/app/HomePage.kt` (`HomeFeatured` scrim, hairline, pager-prikker, valgfri label), `ui/components/HeroBanner.kt` (valgfri: `SoftCover`-fallback får tint-wash, parameter `tint: Color?`), `ui/app/MySpacePage.kt` (toggle + halvkugle-vælger: Auto / Nord / Syd)
- Detaljeside-hero i `LocalFirstApp.kt` (~l. 2383/2587 hvor `HeroBanner` bruges) får **samme** scrim-tint for konsistens.

### Tilgængelighed
- **Kontrast:** titeltekst ligger i bunden over `black @ 0.88` → uændret ≥ 7:1. Tint er kun i toppen (≤ 0.20 alpha) → påvirker ikke læsbarhed. Lav en enhedstest der for hver af de 53 uger tjekker at bund-scrim-farven har luminans < 0.05.
- Farveblindhed: tint bærer ingen information alene; sæson-labelen (hvis slået til) giver tekst.
- TalkBack: sæson-label har `contentDescription = "Uge 46, efterår"`. Tint er dekorativ.
- Reduced motion: snap.

### Performance
- Beregning: én `LocalDate`-kald + få float-ops pr. ugeskift. Nul baggrundsarbejde, nul batteri.
- `animateColorAsState` læses i `drawBehind` → kun draw.

### Edge cases
- **Halvkugle:** auto via `Locale.getDefault().country`; Lukas (DK) → nord. Brugere i fx Australien får modsat fase. Manuelt override i Settings. Lande tæt på ækvator (fx Indonesien, Singapore) har ikke reelle årstider – `ID` er i sydlisten pga. størstedelen syd for ækvator; acceptabelt.
- **Locale uden land** (`""`) → nord.
- **ISO-uge 53** (fx 2026 har 53 uger): håndteret via `rangeRefinedBy`. Årsskifte (uge 1 kan starte i december) bruger `WEEK_BASED_YEAR`.
- **Tidszone/midnat:** `LocalDate.now()` bruger enhedens zone; skift sker mandag 00:00 lokal tid, opdateres ved næste resume.
- **Lys tilstand:** hero-billedet dominerer; samme tint-alpha virker. Hairline i lys tilstand: `seasonTint` mørkgjort 20 % (`lerp(tint, Black, 0.2f)`) for ≥ 3:1 mod lyst kort-kant.
- **AMOLED:** ingen fuld-skærms farvede flader → ingen batteri-påvirkning.
- **Brugerens accent:** tint er uafhængig af `LookState.accent`; begge kan sameksistere (accent på CTA'er, tint på banner).
- **Banner mangler/loader:** `ShimmerBox` vises; tint lægges ikke på shimmer.
- **Testbarhed:** `SeasonTheme.tintFor(date, hemi)` er ren → test for uge 1, 3, 13, 22, 35, 49, 52, 53 og begge halvkugler. Debug-menu (`BuildChannelPage.kt`) får "Fake week"-slider i debug builds.

### Acceptkriterier
1. Home-hero i uge 46 (nov. 2026, DK) har en svag rav/efterårs-tone i toppen; titeltekst er lige så læsbar som før.
2. Ændring af enhedsdato til uge 3 → isblå, uge 24 → gul; ingen genstart nødvendig (resume er nok).
3. Halvkugle = Syd → uge 46 giver forårs-/sommertone.
4. Cross-fade spiller én gang ved første åbning i en ny uge, ellers ikke.
5. Toggle off → scrim er identisk med i dag.
6. `SeasonThemeTest` grøn i CI.

---

## 7. Idé 5 – Lille kat der dukker op og nikker når en opgave er klaret

### Formål
Positiv bekræftelse på meningsfulde handlinger – et "godt gået" i kattens sprog – uden toast-tekst eller blokerende dialog.

### Hvilke opgaver (triggere)

| Event | Kilde i koden | Variant |
|---|---|---|
| `EpisodeFinished(animeId, ep)` | `PlayerScreen.kt` `Player.STATE_ENDED` (~l. 592) **eller** ≥ 90 % set ved luk | Lille nik |
| `SeriesCompleted(animeId)` | `AniListSync.pushProgress()` når `completed == true` (status skifter til `COMPLETED`); `LocalFirstApp.applyListStatus("COMPLETED")` ved `ok`; `MySpacePage.kt` ~l. 176–213 | Nik + vink (`waving = true`) + `Success`-haptik |
| `AddedToList(animeId, status)` | `LocalFirstApp.applyListStatus(next)` ved `ok` når `previous == null` eller `next == "PLANNING"`/`"CURRENT"` | Lille nik |
| `WeekGoalHit` | eksisterende `WeekGoalRing` / `markWeekCelebrated` | Overlades til WeekGoalRing (ingen dobbelt-fejring) |

### Visuel beskrivelse
- En **36 dp** `KittyFace` (med `plate` fra tema – neon i mørk) glider op fra **nederste højre hjørne**, lige over dock'en (`KittyBottomNav`, 50 dp + `navigationBarsPadding`) med 16 dp margin.
- Ved siden af (venstre for katten) en lille pille-chip med **kort tekst**: "Afsnit set ✓", "Serie færdig! 🎉" (ingen emoji i v1 – brug Fluent-ikon fra `FluentIcons.kt`), "Tilføjet til listen". Chip-stil: `kittyGlassSoft(KittyGlassShapePill)`, `labelLarge`.
- Katten **nikker**: hovedet (hele katten) roterer let omkring et punkt under hagen.
- Ingen baggrundsdæmpning; berøring passerer igennem undtagen på selve chippen.

### Animation / timing

| t (ms) | Begivenhed |
|---|---|
| 0–260 | Enter: `translationY 48dp → 0`, `alpha 0 → 1`, `scale 0.8 → 1`, `KittyMotion.Decelerate`. Chip følger 60 ms forskudt. |
| 260–300 | Øjne: hurtigt blink (eksisterende 80/110 ms-mønster) |
| 300–480 | **Nik ned**: `headNod 0 → 9°`, 180 ms, `Gentle`. Pivot = (54, 84) i viewport (under hagen). |
| 480–700 | **Op igen**: `9° → −2° → 0°`, 140 + 80 ms. |
| (kun SeriesCompleted) 700–1500 | `waving = true` (eksisterende ±6°/1400 ms) i ét halvt sving + `KittyHaptics.Success` ved 300 ms |
| 700/1500 → 2200 | Hold (læsetid). |
| 2200–2420 | Exit: `translationY 0 → 24dp`, `alpha 1 → 0`, 220 ms, `Accelerate`. |

Total: ~2.4 s (Episode/Added), ~3.2 s (Series). Tryk på chippen = dismiss straks (exit 160 ms) – og for `SeriesCompleted` åbner det animens detaljeside (valgfrit).

### Teknisk tilgang

**Ny fil:** `ui/components/kitty/TaskKitty.kt`

```kotlin
sealed interface KittyTask {
    val key: String                     // til dedupe
    data class EpisodeFinished(val animeId: Int, val episode: Int) : KittyTask { override val key = "ep:$animeId:$episode" }
    data class SeriesCompleted(val animeId: Int) : KittyTask { override val key = "done:$animeId" }
    data class AddedToList(val animeId: Int, val status: String) : KittyTask { override val key = "list:$animeId:$status" }
}

/** App-global, process-lokal bus. Ingen persistens – en mistet fejring er ok. */
object KittyCheer {
    private val _events = MutableSharedFlow<KittyTask>(extraBufferCapacity = 4, onBufferOverflow = BufferOverflow.DROP_OLDEST)
    val events: SharedFlow<KittyTask> = _events
    private val recent = LinkedHashMap<String, Long>()          // key → uptimeMillis
    fun emit(task: KittyTask) {
        val now = SystemClock.uptimeMillis()
        if ((recent[task.key] ?: 0L) > now - 10 * 60_000) return    // samme opgave max én gang pr. 10 min
        recent[task.key] = now; if (recent.size > 32) recent.remove(recent.keys.first())
        _events.tryEmit(task)
    }
}

@Composable
fun TaskKittyHost(modifier: Modifier = Modifier) {
    val enabled = LookState.taskKitty
    val reduced = prefersReducedMotion()
    val view = LocalView.current
    var current by remember { mutableStateOf<KittyTask?>(null) }
    val queue = remember { ArrayDeque<KittyTask>() }
    LaunchedEffect(enabled) {
        if (!enabled) return@LaunchedEffect
        KittyCheer.events.collect { task ->
            // Opgradering: SeriesCompleted erstatter et samtidigt EpisodeFinished for samme anime
            if (task is KittyTask.SeriesCompleted) queue.removeAll { it is KittyTask.EpisodeFinished && it.animeId == task.animeId }
            if (queue.size < 2) queue.addLast(task)
            if (current == null) current = queue.removeFirstOrNull()
        }
    }
    current?.let { task ->
        key(task.key) {
            TaskKittyToast(task, reduced, onDone = { current = queue.removeFirstOrNull() })
        }
    }
}
```

`TaskKittyToast` bruger ét `Animatable` pr. kanal (`enter`, `nod`) og sekventielle `animateTo` i en `LaunchedEffect(Unit)`; nik sendes til `KittyFace(poseProvider = { KittyPose(headNod = nod.value) })`. Enter/exit via `graphicsLayer { translationY; alpha; scaleX; scaleY }`.

I `drawKitty`: `headNod` anvendes som `rotate(pose.headNod, pivot = Offset(54f, 84f))` omkring **hele** katten (hoved+ører+øjne), men **ikke** plate'n – så katten nikker inde i sin firkant. Ved `KittyPlate.None` (ingen firkant) nikker alt.

**Placering:** `TaskKittyHost` lægges i `AppRoot.kt` i den eksisterende `Box(Modifier.fillMaxSize())` lige efter `LocalFirstApp(...)`, før `WelcomeOverlay`, med `Modifier.align(Alignment.BottomEnd).navigationBarsPadding().padding(end = 16.dp, bottom = 50.dp + 12.dp)`. Når `KittyDock.shown == false` (dock skjult ved scroll) → `bottom = 16.dp` (animeret 220 ms).

**Emit-punkter (præcise):**
- `AniListSync.pushProgress()`: efter `historyDao.upsert(...)`, hvis `completed && existing.listStatus != "COMPLETED"` → `KittyCheer.emit(SeriesCompleted(anilistId))`. *(Kun overgang – ikke ved hver genåbning af sidste afsnit.)*
- `PlayerScreen.kt` ved `Player.STATE_ENDED` → `KittyCheer.emit(EpisodeFinished(animeId, episode))`. PlayerScreen kender i dag `title`/`episode`; tilføj `animeId: Int` parameter (kaldt fra `LocalFirstApp.kt` ~l. 456 med `current.anime.id`). **Vises først når playeren lukkes** (Host er i AppRoot, player er fuldskærm ovenpå → se edge cases).
- `LocalFirstApp.applyListStatus(next)` i `if (ok)`-grenen: `if (next == "COMPLETED") emit(SeriesCompleted(detail.id)) else if (previous == null || previous !in setOf("CURRENT","PLANNING","COMPLETED","REPEATING","PAUSED")) emit(AddedToList(detail.id, next))`.
- `MySpacePage.kt` "mark completed"-flow (~l. 176–213) efter succes: `emit(SeriesCompleted(id))`.

### Filer
- **Ny:** `ui/components/kitty/TaskKitty.kt` (`KittyTask`, `KittyCheer`, `TaskKittyHost`, `TaskKittyToast`)
- **Ændres:** `ui/app/AppRoot.kt` (host), `data/anilist/AniListSync.kt`, `ui/app/LocalFirstApp.kt` (`applyListStatus`, PlayerScreen-kald), `ui/player/PlayerScreen.kt` (`animeId`, emit ved ENDED), `ui/app/MySpacePage.kt` (emit + Settings-toggle), `ui/components/KittyFace.kt` + `KittyGeometry.kt` (`headNod`), `ui/theme/LookState.kt` (`taskKitty`), `res/values/strings.xml` (+ `values-da/strings.xml` hvis/ når lokalisering tilføjes) for chip-tekster

### Tilgængelighed
- **TalkBack:** chippen er en `liveRegion = LiveRegionMode.Polite` med tekst ("Afsnit 5 set", "Serie færdig: Frieren", "Tilføjet til Planlagt"). Katten selv `clearAndSetSemantics {}`. Når TalkBack er aktiv (`AccessibilityManager.isTouchExplorationEnabled`), forlænges hold-tiden til 5000 ms (eller brug `accessibilityManager.calculateRecommendedTimeoutMillis(2200, FLAG_CONTENT_TEXT)`), og fokus flyttes **ikke** til chippen.
- **Reduced motion:** ingen slide/nik; chip + kat fader ind/ud (150 ms crossfade – fades er tilladt under reduced motion iflg. Material-retningslinjer; ved scale 0 bliver det et snap) og står 2200 ms.
- Touch target: chippen ≥ 48 dp høj klikflade (visuelt 32 dp, `minimumInteractiveComponentSize()`).
- Kontrast: chip-tekst hvid på `KittyGlass` (`#1A1A1A`) ≈ 17:1.
- Haptik: kun `Success` ved SeriesCompleted; øvrige ingen (spacePress har allerede givet `Confirm` for knaptrykket).

### Performance
- Host er altid i composition, men er tom (`current == null`) det meste af tiden → nul draw-arbejde.
- SharedFlow med buffer 4 + kø maks 2 → ingen ophobning.
- Animationer læses i `graphicsLayer`/draw-lambda.

### Edge cases
- **Hurtige gentagne triggere:** dedupe pr. `key` i 10 min; kø maks 2; `SeriesCompleted` overtager `EpisodeFinished` for samme anime (sidste afsnit = serie færdig → kun én fejring, den store).
- **Autoplay næste afsnit:** når `STATE_ENDED` fører til autoplay (`autoplayCancelled == false`), skal `EpisodeFinished` **ikke** vises midt i binge – emit kun hvis brugeren forlader playeren efter ENDED, eller hvis det er sidste afsnit. Implementér ved at lade `PlayerScreen` emitte i `DisposableEffect.onDispose` hvis `playbackEnded == true`.
- **Player i fuldskærm/landskab:** host vises ikke over player (player er en separat `Screen.Player` i `LocalFirstApp`) – events i køen vises når brugeren er tilbage. Dog: dedupe-tid gælder fra emit, så hold-kø-elementer max 60 s gamle (drop ældre).
- **Offline / AniList-fejl:** emit kun i `ok`/success-grene. `pushProgress` har `runCatching` – emit kun hvis `saveProgress` returnerede `true` (kræver at returværdien bruges).
- **Process death:** bus er ikke persistent → mistet fejring. Acceptabelt (bevidst).
- **Rotation:** `current` er `remember` → ved configuration change mistes igangværende toast. Acceptabelt; alternativt `rememberSaveable` med key-string.
- **Første kørsel:** `WelcomeOverlay` ligger over host → events køes og vises efter dismiss (tjek `LookState.welcomed`).
- **Light/dark/AMOLED:** kat følger `LocalKittyPlate`; chip `kittyGlassSoft` – i lys tilstand brug `palette.surface` + `palette.hairline` kant.
- **Cast aktiv:** ingen særbehandling.
- **Tablet/`KittySideNav`:** når side-nav bruges (bred skærm), placér host `BottomEnd` med 16 dp (ingen dock-offset).
- **Brugeren har slået task-kitty fra:** `LaunchedEffect(enabled)` collecter ikke → events droppes stille.

### Acceptkriterier
1. Markér en serie som "Done" på detaljesiden → lille kat glider op nederst til højre, nikker, vinker, chip "Serie færdig", `Success`-haptik, forsvinder efter ~3.2 s.
2. Se sidste afsnit færdigt → **én** fejring (SeriesCompleted), ikke to.
3. Binge med autoplay → ingen kat mellem afsnit.
4. Tilføj til "Planning" → lille nik + "Tilføjet til listen".
5. TalkBack læser chip-teksten op én gang; fokus forbliver hvor det var.
6. Reduced motion → kun fade, intet nik.
7. Gentag samme handling 5× hurtigt → én fejring.

---

## 8. Foreslået implementeringsrækkefølge

| # | Leverance | Begrundelse | Estimat |
|---|---|---|---|
| 0 | **Fundament** (§2): `KittyGeometry`, `drawKitty`/`KittyPose`, `KittyMotion`, `prefersReducedMotion` på resume, LookState-nøgler | Alle idéer afhænger af lagdelt tegning; ren refaktor uden visuel ændring – let at verificere | 0.5–1 dag |
| 1 | **Idé 4 – sæson-banner** | Isoleret (HomePage + ny ren fil), lav risiko, enhedstestbar | 0.5 dag |
| 2 | **Idé 1 – neon-glas** | Bygger direkte på fundamentet; kræver API 31/fallback-test | 1 dag |
| 3 | **Idé 3 – hale-flick** | Lille, men rører `spacePress` (bred påvirkning) – efter fundament er stabilt | 0.5 dag |
| 4 | **Idé 5 – task-kitty** | Flest berøringspunkter (sync, player, list-flows) | 1–1.5 dage |
| 5 | **Idé 2 – splash** | Rører manifest/tema/MainActivity + ny dependency; mest risiko for kold start-regression → sidst, eget PR | 1 dag |

Anbefaling: **ét PR pr. trin**, hver med dev-APK fra CI. Trin 0 må ikke ændre nogen pixel (verificér med før/efter-screenshots i `docs/screenshots/`).

## 9. Samlet tjekliste før merge (alle idéer)

- [ ] Bygger på `minSdk 26` og `targetSdk 35`; testet på API 26 (fallbacks) og API 34/35.
- [ ] "Fjern animationer" (Developer options → Animator duration scale = off **og** Tilgængelighed → Fjern animationer) → ingen løkker eller bevægelse.
- [ ] Animator scale 5× → animationer skaleres korrekt, ingen timing-afhængig logik går i stykker (brug `Animatable`-completion, ikke faste `delay()` til at sekvensere hvor muligt).
- [ ] TalkBack-gennemgang af Home, detaljeside, MySpace, splash.
- [ ] Lys + mørk tilstand, accent = hvid og accent = mørk preset.
- [ ] Rotation og fold/unfold på Home + under splash.
- [ ] Layout Inspector: ingen recomposition pr. frame fra nye animationer.
- [ ] `KittyFace` i lister (CatalogUi, EpisodeCarousel, SearchPage) viser hverken glød, hale eller ekstra arbejde.
- [ ] Ingen nye netværkskald, ingen API-nøgler, ingen nye tilladelser.
- [ ] Brand-ikon (`docs/brand/anikitty-icon.svg`, launcher-ikoner) uændret.
