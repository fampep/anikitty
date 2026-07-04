/** Convert YouTube watch/share URLs to an iframe embed URL. */
export function toYoutubeEmbedUrl(raw: string, autoplay = false): string | null {
  if (!raw?.trim()) return null;

  try {
    const url = new URL(raw.trim());
    const host = url.hostname.replace(/^www\./, "");
    let id: string | null = null;

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (url.pathname === "/watch") {
        id = url.searchParams.get("v");
      } else if (url.pathname.startsWith("/embed/")) {
        id = url.pathname.split("/")[2] ?? null;
      } else if (url.pathname.startsWith("/shorts/")) {
        id = url.pathname.split("/")[2] ?? null;
      }
    } else if (host === "youtu.be") {
      id = url.pathname.slice(1) || null;
    }

    if (!id) return null;

    const params = new URLSearchParams({
      rel: "0",
      modestbranding: "1",
      ...(autoplay ? { autoplay: "1" } : {}),
    });

    return `https://www.youtube.com/embed/${id}?${params}`;
  } catch {
    return null;
  }
}
