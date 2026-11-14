# AniKitty release shrink rules.
# Libraries (Media3, Room, Coil, OkHttp, Cast, Tink) ship their own consumer rules.

-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

-keep class site.anikitty.app.AnikittyApp { *; }
-keep class site.anikitty.app.MainActivity { *; }

# Room entities and DAOs are touched from generated code and from the process.
-keep class site.anikitty.app.data.local.** { *; }
-keep class site.anikitty.app.data.servers.** { *; }

# Extension manifests and provider classes are referenced by name from the catalog.
-keep class site.anikitty.app.data.extensions.** { *; }
-keep class site.anikitty.extensions.** { *; }

-keepclassmembers class kotlinx.coroutines.** { volatile <fields>; }
-dontwarn kotlinx.coroutines.**
-dontwarn okhttp3.**
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn com.google.android.gms.**
