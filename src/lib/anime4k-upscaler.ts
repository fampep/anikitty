import { getFullscreenElement } from "@/lib/fullscreen";

export type Anime4KMode = "A" | "B" | "C";

export function isAnime4KSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

/** Visual frame for sizing the upscale canvas (media-player when present). */
export function getAnime4KFrame(container: HTMLElement): HTMLElement {
  return container.querySelector("media-player") ?? container;
}

/** Fullscreen host when the stage is fullscreen; otherwise the visual frame. */
export function getAnime4KHost(container: HTMLElement): HTMLElement {
  const fs = getFullscreenElement();
  if (fs instanceof HTMLElement && container.contains(fs)) return fs;
  return getAnime4KFrame(container);
}

export function syncAnime4KCanvasSize(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
): { width: number; height: number } {
  const frame = getAnime4KFrame(container);
  const rect = frame.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = Math.max(1, Math.floor(rect.width * dpr));
  const height = Math.max(1, Math.floor(rect.height * dpr));
  canvas.width = width;
  canvas.height = height;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
  return { width, height };
}

export async function startAnime4KUpscaler(opts: {
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  mode: Anime4KMode;
}): Promise<void> {
  const { video, canvas, container, mode } = opts;

  if (!isAnime4KSupported()) {
    throw new Error("WebGPU is not supported in this browser");
  }

  if (video.videoWidth === 0) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("Video metadata timeout")), 15_000);
      const onReady = () => {
        window.clearTimeout(timeout);
        video.removeEventListener("loadedmetadata", onReady);
        video.removeEventListener("canplay", onReady);
        resolve();
      };
      video.addEventListener("loadedmetadata", onReady);
      video.addEventListener("canplay", onReady);
    });
  }

  const target = syncAnime4KCanvasSize(canvas, container);

  const { ModeA, ModeB, ModeC, render } = await import("anime4k-webgpu");
  const ModeClass = mode === "B" ? ModeB : mode === "C" ? ModeC : ModeA;

  await render({
    video,
    canvas,
    pipelineBuilder: (device, inputTexture) => {
      const preset = new ModeClass({
        device,
        inputTexture,
        nativeDimensions: {
          width: video.videoWidth,
          height: video.videoHeight,
        },
        targetDimensions: target,
      });
      return [preset];
    },
  });
}
