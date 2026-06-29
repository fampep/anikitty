import { fetchKittyStreamRaw } from "@/lib/kitty/kitty-stream-fetch";
import { fetchSegment, resolveVideoDownload } from "@/lib/kitty/hls-download";
import { buildVideoDownloadFilename } from "@/lib/kitty/video-download-utils";
import { VIDEO_DOWNLOAD_ENABLED } from "@/lib/kitty/video-download-config";

const SAFE_PROVIDER = /^[a-zA-Z0-9_-]{1,40}$/;
const SAFE_ID = /^\d{1,10}$/;

export async function GET(req: Request) {
  if (!VIDEO_DOWNLOAD_ENABLED) {
    return new Response("Video downloads are temporarily disabled", { status: 503 });
  }

  const { searchParams } = new URL(req.url);
  const anilistId = searchParams.get("anilistId");
  const episode = searchParams.get("episode");
  const audio = searchParams.get("audio") || "sub";
  const provider = searchParams.get("provider") || "Miruro";
  const miruroPipe = searchParams.get("miruroPipe");

  if (!anilistId || !episode || !SAFE_ID.test(anilistId) || !SAFE_ID.test(episode)) {
    return new Response("anilistId and episode are required", { status: 400 });
  }

  if (!["sub", "dub"].includes(audio)) {
    return new Response("Invalid audio parameter", { status: 400 });
  }

  if (!SAFE_PROVIDER.test(provider)) {
    return new Response("Invalid provider", { status: 400 });
  }

  const stream = await fetchKittyStreamRaw(
    provider,
    parseInt(anilistId, 10),
    parseInt(episode, 10),
    audio as "sub" | "dub",
    miruroPipe,
  );

  if (!stream?.file) {
    return new Response("Stream not available", { status: 404 });
  }

  let resolved;
  try {
    resolved = await resolveVideoDownload(stream.file, stream.headers);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to resolve stream";
    return new Response(message, { status: 502 });
  }

  const filename = buildVideoDownloadFilename(
    parseInt(anilistId, 10),
    parseInt(episode, 10),
    audio as "sub" | "dub",
    resolved.extension,
  );

  const contentType = resolved.extension === "mp4" ? "video/mp4" : "video/mp2t";

  const streamBody = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for (const segmentUrl of resolved.segments) {
          const buffer = await fetchSegment(segmentUrl, stream.headers);
          controller.enqueue(new Uint8Array(buffer));
        }
        controller.close();
      } catch (err) {
        controller.error(err);
      }
    },
  });

  return new Response(streamBody, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "private, no-cache",
    },
  });
}

export const maxDuration = 600;
