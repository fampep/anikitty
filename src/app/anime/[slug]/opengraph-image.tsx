import { ImageResponse } from "next/og";
import { getAnimeSeoData } from "@/lib/seo/anime-seo-data";
import { loadNightTokyoFont, OG_SIZE, OG_CONTENT_TYPE } from "@/lib/seo/og-card-image";
import { APP_URL, SITE_FAVICON } from "@/lib/seo/site-seo";

export const alt = "Anime | AniKitty";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

const SITE_ICON_URL = `${APP_URL}${SITE_FAVICON}`;

function scoreColor(score: number): string {
  if (score >= 80) return "#22d3ee";
  if (score >= 65) return "#34d399";
  if (score >= 50) return "#fbbf24";
  return "#fb923c";
}

export default async function Image({ params }: { params: { slug: string } }) {
  const numId = parseInt(params.slug, 10);
  const m = Number.isNaN(numId) ? null : await getAnimeSeoData(numId);

  const title = m?.title.english || m?.title.romaji || "Anime";
  const poster = m?.coverImage?.extraLarge || null;
  const score = m?.averageScore ?? null;
  const year = m?.startDate?.year ?? null;
  const format = m?.format ?? null;
  const episodes = m?.episodes ?? null;
  const genres = (m?.genres ?? []).slice(0, 4);
  const accent = m?.coverImage?.color || "#7c3aed";

  const metaBits = [
    format,
    episodes ? `${episodes} eps` : null,
    year ? String(year) : null,
  ].filter(Boolean) as string[];

  const fontData = await loadNightTokyoFont();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#000000",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `radial-gradient(ellipse 60% 60% at 30% 40%, ${accent}33, transparent)`,
          }}
        />

        {/* Poster */}
        {poster && (
          <div style={{ display: "flex", width: 420, height: "100%", position: "relative" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={poster} alt="" width={420} height={630} style={{ objectFit: "cover" }} />
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to right, transparent 55%, #000000)",
              }}
            />
          </div>
        )}

        {/* Right column */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "44px 52px",
            position: "relative",
            zIndex: 1,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={SITE_ICON_URL} alt="AniKitty" height={44} style={{ objectFit: "contain" }} />
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 999,
                background: "rgba(124,58,237,0.18)",
                color: "rgba(196,181,253,0.95)",
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Watch Free
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: title.length > 34 ? 52 : 66,
                fontWeight: 900,
                color: "#ffffff",
                lineHeight: 1.04,
                letterSpacing: "-1px",
                fontFamily: "NightTokyo",
                display: "flex",
              }}
            >
              {title.length > 64 ? `${title.slice(0, 61)}…` : title}
            </div>

            {metaBits.length > 0 && (
              <div style={{ display: "flex", gap: 10, marginTop: 18, color: "rgba(255,255,255,0.5)", fontSize: 20 }}>
                {metaBits.map((b, i) => (
                  <div key={b} style={{ display: "flex", gap: 10 }}>
                    {i > 0 && <span style={{ color: "rgba(255,255,255,0.2)" }}>·</span>}
                    <span>{b}</span>
                  </div>
                ))}
              </div>
            )}

            {genres.length > 0 && (
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
                {genres.map((g) => (
                  <div
                    key={g}
                    style={{
                      padding: "7px 15px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(255,255,255,0.6)",
                      fontSize: 15,
                    }}
                  >
                    {g}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            {score != null ? (
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 66,
                    height: 66,
                    borderRadius: 999,
                    border: `4px solid ${scoreColor(score)}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 24,
                    fontWeight: 900,
                    color: scoreColor(score),
                  }}
                >
                  {score}
                </div>
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <span style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", fontFamily: "monospace" }}>SCORE</span>
                  <span style={{ fontSize: 18, color: "rgba(255,255,255,0.6)", fontWeight: 600 }}>Rated {score}/100</span>
                </div>
              </div>
            ) : (
              <span style={{ fontSize: 16, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
                No ads · Sub &amp; dub
              </span>
            )}
            <span
              style={{
                color: "rgba(255,255,255,0.25)",
                fontSize: 13,
                fontFamily: "monospace",
                letterSpacing: "1px",
              }}
            >
              anikitty.moe
            </span>
          </div>
        </div>
      </div>
    ),
    {
      ...OG_SIZE,
      fonts: [{ name: "NightTokyo", data: fontData, style: "normal" }],
    },
  );
}
