/**
 * Anime4K WebGPU upscale for the Kitty player.
 *
 * The upstream `anime4k-webgpu` `render()` helper starts a permanent
 * `requestVideoFrameCallback` loop and never returns a stop handle. Without
 * wrapping that API, toggling the setting (or React Strict Mode remounts)
 * stacks GPU loops and freezes the whole page.
 *
 * Also: resizing the canvas after `configure()` destroys the WebGPU context
 * while the loop keeps submitting — another lag source. We lock canvas size
 * at attach time and cap pixel count so Mode A/AA stay playable.
 */
export type Anime4kMode = "A" | "B" | "C" | "AA" | "BB" | "CA";

export const ANIME4K_MODES: Anime4kMode[] = ["A", "B", "C", "AA", "BB", "CA"];
export const DEFAULT_ANIME4K_MODE: Anime4kMode = "A";

/** Soft cap so upscale shaders don't run at 4K×DPR on large monitors. */
const MAX_CANVAS_EDGE_LIGHT = 1920;
const MAX_CANVAS_EDGE_HEAVY = 1440;
const MAX_DPR = 1.25;
const HEAVY_MODES = new Set<Anime4kMode>(["AA", "BB", "CA"]);

export function isWebGpuSupported(): boolean {
  return typeof navigator !== "undefined" && "gpu" in navigator;
}

export function sanitizeAnime4kMode(value: unknown): Anime4kMode {
  if (typeof value === "string" && (ANIME4K_MODES as string[]).includes(value)) {
    return value as Anime4kMode;
  }
  return DEFAULT_ANIME4K_MODE;
}

type ModeCtor = new (args: {
  device: GPUDevice;
  inputTexture: GPUTexture;
  nativeDimensions: { width: number; height: number };
  targetDimensions: { width: number; height: number };
}) => { getOutputTexture(): GPUTexture };

async function loadModeClass(mode: Anime4kMode): Promise<ModeCtor> {
  const lib = await import("anime4k-webgpu");
  const map: Record<Anime4kMode, ModeCtor> = {
    A: lib.ModeA as unknown as ModeCtor,
    B: lib.ModeB as unknown as ModeCtor,
    C: lib.ModeC as unknown as ModeCtor,
    AA: lib.ModeAA as unknown as ModeCtor,
    BB: lib.ModeBB as unknown as ModeCtor,
    CA: lib.ModeCA as unknown as ModeCtor,
  };
  return map[mode];
}

export type Anime4kAttachOptions = {
  video: HTMLVideoElement;
  videoContainer: HTMLElement;
  mode: Anime4kMode;
};

export type Anime4kAttachment = {
  canvas: HTMLCanvasElement;
  detach: () => void;
};

type VideoWithFrameCallback = HTMLVideoElement & {
  requestVideoFrameCallback: (
    callback: (now: number, metadata: unknown) => void,
  ) => number;
  cancelVideoFrameCallback?: (handle: number) => void;
};

function lockCanvasSize(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  mode: Anime4kMode,
) {
  const rect = container.getBoundingClientRect();
  const cssW = Math.max(1, Math.floor(rect.width));
  const cssH = Math.max(1, Math.floor(rect.height));
  const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);

  let w = Math.max(1, Math.floor(cssW * dpr));
  let h = Math.max(1, Math.floor(cssH * dpr));

  const maxEdge = HEAVY_MODES.has(mode) ? MAX_CANVAS_EDGE_HEAVY : MAX_CANVAS_EDGE_LIGHT;
  const edge = Math.max(w, h);
  if (edge > maxEdge) {
    const scale = maxEdge / edge;
    w = Math.max(1, Math.floor(w * scale));
    h = Math.max(1, Math.floor(h * scale));
  }

  canvas.width = w;
  canvas.height = h;
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  return { width: w, height: h };
}

/**
 * Bind Anime4K to a video → overlay canvas. Always call `detach()` to stop the
 * GPU frame loop (critical — otherwise the page keeps lagging after toggle-off).
 */
export async function attachAnime4k({
  video,
  videoContainer,
  mode,
}: Anime4kAttachOptions): Promise<Anime4kAttachment> {
  if (!isWebGpuSupported()) {
    throw new Error("WebGPU not supported");
  }
  if (typeof video.requestVideoFrameCallback !== "function") {
    throw new Error("requestVideoFrameCallback not supported");
  }

  const frameVideo = video as VideoWithFrameCallback;
  const pendingHandles = new Set<number>();
  let stopped = false;
  const nativeRvf = frameVideo.requestVideoFrameCallback.bind(frameVideo);
  const nativeCancel =
    typeof frameVideo.cancelVideoFrameCallback === "function"
      ? frameVideo.cancelVideoFrameCallback.bind(frameVideo)
      : null;

  // Capture every handle the library schedules so we can cancel on detach.
  frameVideo.requestVideoFrameCallback = ((cb) => {
    if (stopped) return -1;
    const handle = nativeRvf((now, meta) => {
      pendingHandles.delete(handle);
      if (stopped) return;
      cb(now, meta);
    });
    pendingHandles.add(handle);
    return handle;
  }) as typeof frameVideo.requestVideoFrameCallback;

  let canvas = videoContainer.querySelector<HTMLCanvasElement>(
    "canvas.kitty-anime4k-canvas",
  );
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "kitty-anime4k-canvas";
    canvas.setAttribute("aria-hidden", "true");
    videoContainer.appendChild(canvas);
  }

  const size = lockCanvasSize(canvas, videoContainer, mode);

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve, reject) => {
      const onReady = () => {
        cleanupWait();
        resolve();
      };
      const onError = () => {
        cleanupWait();
        reject(new Error("Video failed before Anime4K attach"));
      };
      const cleanupWait = () => {
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("error", onError);
      };
      video.addEventListener("loadeddata", onReady, { once: true });
      video.addEventListener("error", onError, { once: true });
    });
  }

  if (stopped) {
    frameVideo.requestVideoFrameCallback = nativeRvf;
    throw new Error("Anime4K attach cancelled");
  }

  const ModeClass = await loadModeClass(mode);
  const { render } = await import("anime4k-webgpu");

  // Re-lock once more in case layout settled while modules loaded.
  lockCanvasSize(canvas, videoContainer, mode);

  const nativeW = Math.max(1, video.videoWidth || size.width);
  const nativeH = Math.max(1, video.videoHeight || size.height);

  await render({
    video,
    canvas,
    pipelineBuilder: (device, inputTexture) => {
      const preset = new ModeClass({
        device,
        inputTexture,
        nativeDimensions: { width: nativeW, height: nativeH },
        targetDimensions: {
          width: canvas!.width,
          height: canvas!.height,
        },
      });
      return [preset] as [import("anime4k-webgpu").Anime4KPipeline];
    },
  });

  if (stopped) {
    // Race: detach won while render() was starting — cancel immediately.
    for (const handle of pendingHandles) {
      nativeCancel?.(handle);
    }
    pendingHandles.clear();
    frameVideo.requestVideoFrameCallback = nativeRvf;
    canvas.remove();
    throw new Error("Anime4K attach cancelled");
  }

  video.style.opacity = "0";

  const detach = () => {
    if (stopped) return;
    stopped = true;

    for (const handle of pendingHandles) {
      try {
        nativeCancel?.(handle);
      } catch {
        /* ignore */
      }
    }
    pendingHandles.clear();
    frameVideo.requestVideoFrameCallback = nativeRvf;

    canvas?.remove();
    video.style.removeProperty("opacity");
  };

  return { canvas, detach };
}
