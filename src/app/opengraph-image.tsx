import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AniKitty — Free Anime Streaming";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #080808 0%, #0f0f0f 60%, #080808 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Subtle grid overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.03) 0%, transparent 60%), radial-gradient(circle at 80% 20%, rgba(255,255,255,0.02) 0%, transparent 50%)",
          }}
        />

        {/* Logo / mascot placeholder ring */}
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 56,
            marginBottom: 28,
          }}
        >
          🐱
        </div>

        {/* Site name */}
        <div
          style={{
            fontSize: 72,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-2px",
            marginBottom: 12,
          }}
        >
          AniKitty
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.5px",
            marginBottom: 40,
          }}
        >
          Free Anime Streaming · No Ads · nya~
        </div>

        {/* Pill badges */}
        <div style={{ display: "flex", gap: 12 }}>
          {["Sub", "Dub", "HD Quality", "No Ads"].map((label) => (
            <div
              key={label}
              style={{
                padding: "8px 20px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.1)",
                background: "rgba(255,255,255,0.05)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 14,
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
            bottom: 28,
            color: "rgba(255,255,255,0.15)",
            fontSize: 14,
            letterSpacing: "1px",
            fontFamily: "monospace",
          }}
        >
          anikitty.moe
        </div>
      </div>
    ),
    { ...size },
  );
}
