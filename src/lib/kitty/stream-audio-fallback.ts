/** When DUB is missing, retry SUB on the same provider (avoids wrong-anime auto/stream). */
export async function fetchWithSubAudioFallback<T extends { file?: string | null }>(
  requestedAudio: "sub" | "dub",
  fetcher: (audio: "sub" | "dub") => Promise<T | null>,
): Promise<{
  result: T | null;
  servedAudio: "sub" | "dub";
  audioFallback: boolean;
}> {
  const primary = await fetcher(requestedAudio);
  if (primary?.file) {
    return { result: primary, servedAudio: requestedAudio, audioFallback: false };
  }

  if (requestedAudio === "dub") {
    const sub = await fetcher("sub");
    if (sub?.file) {
      return { result: sub, servedAudio: "sub", audioFallback: true };
    }
  }

  return { result: null, servedAudio: requestedAudio, audioFallback: false };
}
