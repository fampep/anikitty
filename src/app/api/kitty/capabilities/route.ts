import { fetchActiveProviderStreamCapabilities, parseStreamCapabilityTarget } from "@/lib/stream-capabilities";
import { isKittyProvider } from "@/lib/kitty-providers";

const SAFE_ID = /^\d{1,10}$/;
const MAX_TITLE_LEN = 200;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const anilistIdRaw = searchParams.get("anilistId");
  const episodeRaw = searchParams.get("episode");
  const title = searchParams.get("title")?.trim().slice(0, MAX_TITLE_LEN) || undefined;
  const provider = searchParams.get("provider");

  if (!anilistIdRaw || !SAFE_ID.test(anilistIdRaw)) {
    return Response.json({ error: "Invalid anilistId" }, { status: 400 });
  }
  if (!episodeRaw || !SAFE_ID.test(episodeRaw)) {
    return Response.json({ error: "Invalid episode" }, { status: 400 });
  }
  if (!provider || !isKittyProvider(provider)) {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  const anilistId = parseInt(anilistIdRaw, 10);
  const episode = parseInt(episodeRaw, 10);
  if (episode < 1) {
    return Response.json({ error: "Invalid episode" }, { status: 400 });
  }

  const target = parseStreamCapabilityTarget(searchParams);
  if (!target) {
    return Response.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const capabilities = await fetchActiveProviderStreamCapabilities(
      anilistId,
      episode,
      target,
      title,
    );
    return Response.json(capabilities, {
      headers: { "Cache-Control": "private, max-age=300" },
    });
  } catch {
    return Response.json({ error: "Capability probe failed" }, { status: 502 });
  }
}
