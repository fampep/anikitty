import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AniKitty — Free Anime Streaming";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  const fontData = await fetch(
    new URL("../assets/fonts/NightinTokyo.ttf", import.meta.url),
  ).then((res) => res.arrayBuffer());

  return new ImageResponse(
    (
      <div
        style={{
          background: "#000000",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Grid lines — matches landing page bg-[linear-gradient(...)] at 72px */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
          }}
        />

        {/* Violet radial glow — matches landing page radial-gradient ellipse */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 60% at 50% 42%, rgba(124,58,237,0.16), transparent)",
          }}
        />

        {/* Top/bottom vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to bottom, rgba(0,0,0,0.90), rgba(0,0,0,0.75) 50%, #000000)",
          }}
        />

        {/* Left/right vignette */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to right, rgba(0,0,0,0.80), transparent 30%, transparent 70%, rgba(0,0,0,0.80))",
          }}
        />

        {/* Logo — jiji.jpg in circular ring */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.15)",
            marginBottom: 24,
            display: "flex",
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://anikitty.moe/jiji.jpg"
            style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
          />
        </div>

        {/* Title: "Ani" white + "Kitty" violet→white gradient */}
        <div
          style={{
            display: "flex",
            fontSize: 108,
            fontWeight: 900,
            letterSpacing: "12px",
            lineHeight: 1,
            marginBottom: 20,
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

        {/* Primary tagline */}
        <div
          style={{
            fontSize: 22,
            color: "rgba(255,255,255,0.65)",
            fontWeight: 300,
            letterSpacing: "0.5px",
            marginBottom: 10,
          }}
        >
          Stream thousands of anime, completely free.
        </div>

        {/* Secondary mono line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 16,
            color: "rgba(255,255,255,0.25)",
            fontFamily: "monospace",
            marginBottom: 36,
          }}
        >
          <span>No ads</span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <span>No subscriptions</span>
          <span
            style={{
              width: 4,
              height: 4,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.15)",
            }}
          />
          <span>Sub &amp; Dub</span>
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: 10 }}>
          {["Zero Ads", "Fast Streams", "Sub & Dub", "Comments", "Community"].map((label) => (
            <div
              key={label}
              style={{
                padding: "7px 18px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.40)",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.5px",
              }}
            >
              {label}
            </div>
          ))}
        </div>

        {/* URL watermark */}
        <div
          style={{
            position: "absolute",
            bottom: 24,
            color: "rgba(255,255,255,0.15)",
            fontSize: 13,
            letterSpacing: "1px",
            fontFamily: "monospace",
          }}
        >
          anikitty.moe
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "NightTokyo", data: fontData, style: "normal" }],
    },
  );
}
