import { ImageResponse } from "next/og";
import { APP_URL, SITE_ICON_VERSION } from "@/lib/seo/site-seo";

export const OG_SIZE = { width: 1200, height: 630 };
export const OG_CONTENT_TYPE = "image/png";

/** Absolute icon URL fallback when local bundling isn't available. */
function siteIconAbsoluteUrl(): string {
  const base = APP_URL.replace(/\/$/, "");
  return `${base}/icon-192x192.png?v=${SITE_ICON_VERSION}`;
}

export type OgAccent = "violet" | "teal" | "sky" | "emerald" | "rose";

const ACCENT_STYLES: Record<
  OgAccent,
  { glow: string; badge: string; badgeText: string; chip: string }
> = {
  violet: {
    glow: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(255, 255, 255, 0.18), transparent)",
    badge: "rgba(255, 255, 255, 0.14)",
    badgeText: "rgba(255,255,255,0.92)",
    chip: "rgba(255, 255, 255, 0.1)",
  },
  teal: {
    glow: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(20,184,166,0.22), transparent)",
    badge: "rgba(20,184,166,0.18)",
    badgeText: "rgba(153,246,228,0.95)",
    chip: "rgba(20,184,166,0.12)",
  },
  sky: {
    glow: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(14,165,233,0.20), transparent)",
    badge: "rgba(14,165,233,0.18)",
    badgeText: "rgba(186,230,253,0.95)",
    chip: "rgba(14,165,233,0.12)",
  },
  emerald: {
    glow: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(16,185,129,0.20), transparent)",
    badge: "rgba(16,185,129,0.18)",
    badgeText: "rgba(167,243,208,0.95)",
    chip: "rgba(16,185,129,0.12)",
  },
  rose: {
    glow: "radial-gradient(ellipse 70% 55% at 50% 40%, rgba(244,63,94,0.18), transparent)",
    badge: "rgba(244,63,94,0.16)",
    badgeText: "rgba(254,205,211,0.95)",
    chip: "rgba(244,63,94,0.12)",
  },
};

export type OgCardConfig = {
  badge: string;
  title: string;
  subtitle: string;
  features?: string[];
  accent?: OgAccent;
};

export async function loadNightTokyoFont(): Promise<ArrayBuffer> {
  return fetch(new URL("../../assets/fonts/NightinTokyo.ttf", import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );
}

function arrayBufferToDataUrl(buf: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!);
  return `data:${mime};base64,${btoa(binary)}`;
}

/** Prefer bundled public icon so OG cards don't embed a stale remote mark. */
export async function loadSiteIconSrc(): Promise<string> {
  try {
    const res = await fetch(new URL("../../../public/icon-192x192.png", import.meta.url));
    if (!res.ok) throw new Error(`icon fetch ${res.status}`);
    return arrayBufferToDataUrl(await res.arrayBuffer(), "image/png");
  } catch {
    return siteIconAbsoluteUrl();
  }
}

/** Full-bleed share banner (cover-cropped source) for OG card backgrounds. */
export async function loadOgBannerSrc(): Promise<string | null> {
  try {
    const res = await fetch(new URL("../../../public/og-share.png", import.meta.url));
    if (!res.ok) throw new Error(`og banner fetch ${res.status}`);
    return arrayBufferToDataUrl(await res.arrayBuffer(), "image/png");
  } catch {
    return null;
  }
}

export function renderOgCard(config: OgCardConfig, iconSrc: string, bannerSrc?: string | null) {
  const accent = ACCENT_STYLES[config.accent ?? "violet"];
  const features = config.features ?? [];

  return (
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
      {bannerSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={bannerSrc}
          alt=""
          width={OG_SIZE.width}
          height={OG_SIZE.height}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
      ) : (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
      )}
      <div style={{ position: "absolute", inset: 0, background: accent.glow }} />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: bannerSrc
            ? "linear-gradient(to bottom, rgba(0,0,0,0.55), rgba(0,0,0,0.82) 55%, rgba(0,0,0,0.94))"
            : "linear-gradient(to bottom, rgba(0,0,0,0.35), rgba(0,0,0,0.85) 70%, #000000)",
        }}
      />

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "32px 48px 0",
          zIndex: 1,
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={iconSrc}
            alt="AniKitty"
            height={48}
            style={{ objectFit: "contain" }}
          />
        </div>
        <div
          style={{
            padding: "8px 14px",
            borderRadius: 999,
            background: accent.badge,
            color: accent.badgeText,
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {config.badge}
        </div>
      </div>

      <div
        style={{
          position: "relative",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "0 64px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: 64,
            fontWeight: 900,
            color: "#ffffff",
            letterSpacing: "-1px",
            lineHeight: 1.05,
            marginBottom: 16,
            fontFamily: "NightTokyo",
          }}
        >
          {config.title}
        </div>
        <div
          style={{
            fontSize: 24,
            color: "rgba(255,255,255,0.62)",
            fontWeight: 400,
            maxWidth: 760,
            lineHeight: 1.35,
          }}
        >
          {config.subtitle}
        </div>

        {features.length > 0 && (
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              justifyContent: "center",
              marginTop: 28,
            }}
          >
            {features.map((label) => (
              <div
                key={label}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,0.08)",
                  background: accent.chip,
                  color: "rgba(255,255,255,0.55)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {label}
              </div>
            ))}
          </div>
        )}
      </div>

      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "18px 48px 28px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          zIndex: 1,
        }}
      >
        <span style={{ color: "rgba(255,255,255,0.18)", fontSize: 11, fontFamily: "monospace" }}>
          Free anime · Sub &amp; dub · Ad-free
        </span>
        <span
          style={{
            color: "rgba(255,255,255,0.18)",
            fontSize: 11,
            fontFamily: "monospace",
            letterSpacing: "1px",
          }}
        >
          anikitty.site
        </span>
      </div>
    </div>
  );
}

export async function createOgImageResponse(config: OgCardConfig) {
  const [fontData, iconSrc, bannerSrc] = await Promise.all([
    loadNightTokyoFont(),
    loadSiteIconSrc(),
    loadOgBannerSrc(),
  ]);
  return new ImageResponse(renderOgCard(config, iconSrc, bannerSrc), {
    ...OG_SIZE,
    fonts: [{ name: "NightTokyo", data: fontData, style: "normal" }],
  });
}
