import java.util.Properties

plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
}

val keystorePropertiesFile = rootProject.file("keystore.properties")
val keystoreProperties = Properties()
if (keystorePropertiesFile.exists()) {
    keystorePropertiesFile.inputStream().use { keystoreProperties.load(it) }
}

android {
    namespace = "site.anikitty.app"
    compileSdk = 35

    defaultConfig {
        applicationId = "site.anikitty.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 29
        versionName = "1.1.15"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        // Public AniList API client id (not a secret). Create at anilist.co/settings/developer
        // with redirect URI anikitty://anilist — or leave blank and paste a token in-app.
        val anilistClientId = (project.findProperty("anilistClientId") as String?)
            ?: System.getenv("ANILIST_CLIENT_ID")
            ?: ""
        buildConfigField("String", "ANILIST_CLIENT_ID", "\"${anilistClientId.replace("\"", "")}\"")
        // Optional TMDB v3 API key for Fribb-mapped episode stills (Plex-style rail).
        // Set gradle property tmdbApiKey, env TMDB_API_KEY, or leave blank to keep
        // AniList streaming thumbs / cover fallbacks only.
        val tmdbApiKey = (project.findProperty("tmdbApiKey") as String?)
            ?: System.getenv("TMDB_API_KEY")
            ?: ""
        buildConfigField("String", "TMDB_API_KEY", "\"${tmdbApiKey.replace("\"", "").replace("\\", "")}\"")
    }

    signingConfigs {
        if (keystorePropertiesFile.exists()) {
            create("release") {
                storeFile = file(keystoreProperties["storeFile"] as String)
                storePassword = keystoreProperties["storePassword"] as String
                keyAlias = keystoreProperties["keyAlias"] as String
                keyPassword = keystoreProperties["keyPassword"] as String
            }
        }
    }

    buildTypes {
        debug {
            // Same id/name as release so sideloaded APKs stay "AniKitty 1.0.0"
            // instead of site.anikitty.app.debug / 0.x-local-debug.
            isDebuggable = true
        }
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            // Prefer release keystore when present; otherwise sign with the
            // debug key so a clean 1.0.0 APK is still installable.
            signingConfig = if (keystorePropertiesFile.exists()) {
                signingConfigs.getByName("release")
            } else {
                signingConfigs.getByName("debug")
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.10.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.activity:activity-compose:1.9.3")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.navigation:navigation-compose:2.8.4")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.security:security-crypto:1.1.0-alpha06")
    implementation("androidx.media3:media3-exoplayer:1.5.0")
    implementation("androidx.media3:media3-exoplayer-hls:1.5.0")
    implementation("androidx.media3:media3-ui:1.5.0")
    implementation("androidx.media3:media3-cast:1.5.0")
    implementation("com.google.android.gms:play-services-cast-framework:21.5.0")
    implementation("androidx.mediarouter:mediarouter:1.7.0")
    implementation("androidx.appcompat:appcompat:1.7.0")

    implementation("androidx.room:room-runtime:2.6.1")
    implementation("androidx.room:room-ktx:2.6.1")
    ksp("androidx.room:room-compiler:2.6.1")

    implementation("io.coil-kt:coil-compose:2.7.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.9.0")
    implementation("androidx.browser:browser:1.8.0")

    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}
