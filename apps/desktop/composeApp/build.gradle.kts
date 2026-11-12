import org.jetbrains.compose.desktop.application.dsl.TargetFormat

plugins {
    kotlin("multiplatform")
    id("org.jetbrains.compose")
    id("org.jetbrains.kotlin.plugin.compose")
}

kotlin {
    // Cloud image ships JDK 21; desktop target is JVM for Windows/Linux/macOS.
    jvm("desktop") {
        compilations.all {
            compileTaskProvider.configure {
                compilerOptions {
                    jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_21)
                }
            }
        }
    }

    sourceSets {
        val desktopMain by getting {
            dependencies {
                implementation(compose.desktop.currentOs)
                implementation(compose.material3)
                implementation(compose.materialIconsExtended)
                implementation(compose.components.resources)

                implementation("org.jetbrains.kotlinx:kotlinx-coroutines-swing:1.9.0")
                implementation("com.squareup.okhttp3:okhttp:4.12.0")
                implementation("org.json:json:20240303")

                implementation("io.coil-kt.coil3:coil-compose:3.0.4")
                implementation("io.coil-kt.coil3:coil-network-okhttp:3.0.4")
            }
        }
    }
}

compose.desktop {
    application {
        mainClass = "site.anikitty.desktop.MainKt"
        nativeDistributions {
            // Exe/Msi only build on Windows runners; Deb/Dmg on Linux/macOS.
            targetFormats(TargetFormat.Exe, TargetFormat.Msi, TargetFormat.Dmg, TargetFormat.Deb)
            packageName = "AniKitty"
            // Compose native distro requires MAJOR >= 1.
            // Keep in lockstep with Android versionName for monorepo releases.
            packageVersion = "1.1.16"
            description = "AniKitty — watch anime on desktop (Compose Multiplatform + FFmpeg glass player)"
            copyright = "Copyright 2026 fampep. PolyForm Noncommercial 1.0.0."
            vendor = "fampep"
            windows {
                menuGroup = "AniKitty"
                // Portable .exe app image + WiX MSI installer.
                upgradeUuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
            }
        }
        // Bundled ProGuard 7.2 cannot read Java 21 classfiles — keep release packages usable.
        buildTypes.release.proguard {
            isEnabled.set(false)
        }
    }
}
