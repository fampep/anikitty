const BASE = "https://kittyapi.buzz";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode   = searchParams.get("episode");
  const audio     = searchParams.get("audio") || "sub";
  const provider  = searchParams.get("provider") || "Miruro";

  if (!anilistId || !episode) {
    return Response.json({ error: "anilistId and episode are required" }, { status: 400 });
  }

  const url = `${BASE}/provider/${encodeURIComponent(provider)}/stream-direct?anilistId=${anilistId}&episode=${episode}&audio=${audio}`;

  try {
    const res = await fetch(url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });

    const data = await res.json();

    if (!res.ok || !data?.file) {
      return Response.json(
        { file: null, error: data?.message ?? data?.error ?? "Provider unavailable" },
        { status: 200 },
      );
    }

    // Ensure tracks have `file` field (API uses `file`, some older providers used `url`)
    if (Array.isArray(data.tracks)) {
      for (const t of data.tracks) {
        if (!t.file && t.url) t.file = t.url;
      }
    }

    return Response.json(data);
  } catch (e: any) {
    const timedOut = e?.name === "AbortError" || e?.name === "TimeoutError";
    return Response.json(
      { file: null, error: timedOut ? `${provider} timed out` : "Failed to reach provider" },
      { status: 200 },
    );
  }
}

export const maxDuration = 20;
