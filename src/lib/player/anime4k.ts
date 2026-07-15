export type Anime4kMode = "A" | "B" | "C" | "AA" | "BB" | "CA";

export const ANIME4K_MODES: Anime4kMode[] = ["A", "B", "C", "AA", "BB", "CA"];
export const DEFAULT_ANIME4K_MODE: Anime4kMode = "A";

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

const boundKey = new WeakMap<HTMLVideoElement, string>();

function syncCanvasSize(canvas: HTMLCanvasElement, container: HTMLElement) {
  const rect = container.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.floor(rect.width * dpr));
  const h = Math.max(1, Math.floor(rect.height * dpr));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  canvas.style.width = `${rect.width}px`;
  canvas.style.height = `${rect.height}px`;
}

/** Bind Anime4K WebGPU upscale from a video element onto an overlay canvas. */
export async function attachAnime4k({
  video,
  videoContainer,
  mode,
}: Anime4kAttachOptions): Promise<Anime4kAttachment> {
  const renderKey = mode;
  const existing = boundKey.get(video);
  let canvas = videoContainer.querySelector<HTMLCanvasElement>("canvas.kitty-anime4k-canvas");

  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.className = "kitty-anime4k-canvas";
    canvas.setAttribute("aria-hidden", "true");
    videoContainer.appendChild(canvas);
  }

  syncCanvasSize(canvas, videoContainer);

  if (existing === renderKey) {
    return {
      canvas,
      detach: () => {
        canvas?.remove();
        video.style.removeProperty("opacity");
      },
    };
  }

  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    await new Promise<void>((resolve) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
    });
  }

  const ModeClass = await loadModeClass(mode);
  const { render } = await import("anime4k-webgpu");

  syncCanvasSize(canvas, videoContainer);

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
        targetDimensions: {
          width: canvas!.width,
          height: canvas!.height,
        },
      });
      return [preset] as [import("anime4k-webgpu").Anime4KPipeline];
    },
  });

  boundKey.set(video, renderKey);

  const ro = new ResizeObserver(() => syncCanvasSize(canvas!, videoContainer));
  ro.observe(videoContainer);

  return {
    canvas,
    detach: () => {
      ro.disconnect();
      canvas.remove();
      boundKey.delete(video);
      video.style.removeProperty("opacity");
    },
  };
}
