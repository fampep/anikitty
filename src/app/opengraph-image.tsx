import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AniKitty — Free Anime Streaming";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.moe";

async function fetchPosters(): Promise<string[]> {
  try {
    const res = await fetch(`${APP_URL}/api/home`, { next: { revalidate: 3600 } });
    if (!res.ok) return [];
    const data = await res.json();
    const feed = data.data ?? data;
    const imgs: string[] = [
      ...(feed.trendingAnimes ?? []),
      ...(feed.mostPopularAnimes ?? []),
      ...(feed.mostFavoriteAnimes ?? []),
      ...(feed.latestCompletedAnimes ?? []),
    ]
      .map((a: { poster?: string }) => a.poster)
      .filter(Boolean) as string[];
    return [...new Set(imgs)].slice(0, 24);
  } catch {
    return [];
  }
}

const FEATURES = ["Sub & Dub", "Subtitles", "Forum", "Live Chat", "Watch Together", "No Ads"];

export default async function Image() {
  const [fontData, posters] = await Promise.all([
    fetch(new URL("../assets/fonts/NightinTokyo.ttf", import.meta.url)).then((res) =>
      res.arrayBuffer(),
    ),
    fetchPosters(),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Poster wall — matches landing page background */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexWrap: "wrap",
            gap: 5,
            padding: 4,
            alignContent: "flex-start",
            justifyContent: "center",
            transform: "scale(1.08)",
          }}
        >
          {Array.from({ length: 40 }).map((_, i) => {
            const src = posters.length > 0 ? posters[i % posters.length] : null;
            return src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                width={114}
                height={158}
                alt=""
                style={{
                  objectFit: "cover",
                  borderRadius: 6,
                  filter: "saturate(0.6) brightness(0.7)",
                }}
              />
            ) : (
              <div
                key={i}
                style={{
                  width: 114,
                  height: 158,
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.02)",
                }}
              />
            );
          })}
        </div>

        {/* Vignettes — matches landing page */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.90), rgba(0,0,0,0.75) 50%, #000000)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.80), transparent 30%, transparent 70%, rgba(0,0,0,0.80))",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(124,58,237,0.16), transparent)",
          }}
        />

        {/* Grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Nav */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "28px 48px 0",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                overflow: "hidden",
                border: "1px solid rgba(255,255,255,0.15)",
                display: "flex",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`${APP_URL}/jiji.jpg`}
                alt=""
                width={36}
                height={36}
                style={{ objectFit: "cover", objectPosition: "top" }}
              />
            </div>
            <span
              style={{
                fontFamily: "NightTokyo",
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: "4px",
                color: "rgba(255,255,255,0.9)",
              }}
            >
              AniKitty
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              background: "#ffffff",
              color: "#000000",
              borderRadius: 12,
              fontSize: 14,
              fontWeight: 700,
            }}
          >
            Browse →
          </div>
        </div>

        {/* Hero */}
        <div
          style={{
            position: "relative",
            flex: 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            padding: "0 48px",
            zIndex: 1,
          }}
        >
          {/* Online pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              marginBottom: 20,
              borderRadius: 999,
              border: "1px solid rgba(52,211,153,0.25)",
              background: "rgba(16,185,129,0.10)",
              color: "rgba(110,231,183,0.80)",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "#34d399",
              }}
            />
            people watching anime right now
          </div>

          {/* Title */}
          <div
            style={{
              display: "flex",
              fontSize: 96,
              fontWeight: 900,
              letterSpacing: "10px",
              lineHeight: 1,
              marginBottom: 16,
              fontFamily: "NightTokyo",
            }}
          >
            <span style={{ color: "#ffffff" }}>Ani</span>
            <span
              style={{
                backgroundImage:
                  "linear-gradient(135deg, #c4b5fd 0%, rgba(255,255,255,0.7) 50%, rgba(255,255,255,0.25) 100%)",
                backgroundClip: "text",
                color: "transparent",
              }}
            >
              Kitty
            </span>
          </div>

          <div
            style={{
              fontSize: 22,
              color: "rgba(255,255,255,0.65)",
              fontWeight: 300,
              letterSpacing: "0.5px",
              marginBottom: 8,
            }}
          >
            Free anime streaming. No ads.
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 14,
              color: "rgba(255,255,255,0.25)",
              fontFamily: "monospace",
              marginBottom: 28,
            }}
          >
            <span>No ads</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            <span>Sub &amp; dub</span>
            <span style={{ width: 4, height: 4, borderRadius: "50%", background: "rgba(255,255,255,0.15)" }} />
            <span>Community</span>
          </div>

          {/* CTAs */}
          <div style={{ display: "flex", gap: 12, marginBottom: 28 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: "#ffffff",
                color: "#000000",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Start Watching
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "12px 28px",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.70)",
                border: "1px solid rgba(255,255,255,0.12)",
                borderRadius: 16,
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              Sign in
            </div>
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
            {FEATURES.map((label) => (
              <div
                key={label}
                style={{
                  padding: "6px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: "rgba(255,255,255,0.04)",
                  color: "rgba(255,255,255,0.40)",
                  fontSize: 12,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 48px 24px",
            borderTop: "1px solid rgba(255,255,255,0.06)",
            zIndex: 1,
          }}
        >
          <span
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: 11,
              fontFamily: "monospace",
            }}
          >
            © {new Date().getFullYear()} anikitty.moe
          </span>
          <span
            style={{
              color: "rgba(255,255,255,0.15)",
              fontSize: 11,
              fontFamily: "monospace",
              letterSpacing: "1px",
            }}
          >
            anikitty.moe
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NightTokyo", data: fontData, style: "normal" }],
    },
  );
}
