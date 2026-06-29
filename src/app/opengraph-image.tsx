import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AniKitty — Free Anime Streaming";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const revalidate = 3600;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://anikitty.moe";
const LOGO_URL = `${APP_URL}/anikitty-logo.png`;

const FEATURES = ["Sub & Dub", "Subtitles", "Forum", "Live Chat", "Watch Together", "No Ads"];

export default async function Image() {
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(ellipse 70% 55% at 50% 42%, rgba(124,58,237,0.22), transparent)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={LOGO_URL}
          alt="AniKitty"
          width={520}
          height={520}
          style={{ objectFit: "contain", position: "relative", zIndex: 1 }}
        />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            marginTop: 8,
            fontSize: 24,
            color: "rgba(255,255,255,0.65)",
            fontWeight: 300,
            letterSpacing: "0.5px",
          }}
        >
          Free anime streaming. No ads.
        </div>

        <div
          style={{
            position: "relative",
            zIndex: 1,
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            justifyContent: "center",
            marginTop: 28,
            maxWidth: 900,
          }}
        >
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

        <div
          style={{
            position: "absolute",
            bottom: 24,
            color: "rgba(255,255,255,0.15)",
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "1px",
          }}
        >
          anikitty.moe
        </div>
      </div>
    ),
    { ...size },
  );
}
