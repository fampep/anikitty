import { useEffect, useRef, useState } from "react";

const SAMPLE_MS = 450;
const SAMPLE_SIZE = 12;

type Rgb = { r: number; g: number; b: number };

function averageRgb(data: Uint8ClampedArray): Rgb {
  let r = 0;
  let g = 0;
  let b = 0;
  const pixels = data.length / 4;
  for (let i = 0; i < data.length; i += 4) {
    r += data[i]!;
    g += data[i + 1]!;
    b += data[i + 2]!;
  }
  return {
    r: Math.round(r / pixels),
    g: Math.round(g / pixels),
    b: Math.round(b / pixels),
  };
}

/**
 * Samples the current video frame at a low resolution on an interval and
 * returns the average color as `"r, g, b"` (for use inside `rgb(...)`).
 * Returns null while disabled, paused, or before the first sample lands.
 */
export function useAmbientGlow(
  video: HTMLVideoElement | null,
  enabled: boolean,
): string | null {
  const [color, setColor] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!enabled || !video) {
      setColor(null);
      return;
    }

    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | null = null;

    const canvas =
      canvasRef.current ?? document.createElement("canvas");
    canvas.width = SAMPLE_SIZE;
    canvas.height = SAMPLE_SIZE;
    canvasRef.current = canvas;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const sample = () => {
      if (cancelled || video.paused || video.ended || video.readyState < 2) return;
      try {
        ctx.drawImage(video, 0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { data } = ctx.getImageData(0, 0, SAMPLE_SIZE, SAMPLE_SIZE);
        const { r, g, b } = averageRgb(data);
        setColor(`${r}, ${g}, ${b}`);
      } catch {
        // Tainted canvas (cross-origin frame without CORS) — bail quietly.
        if (timer) clearInterval(timer);
        timer = null;
      }
    };

    sample();
    timer = setInterval(sample, SAMPLE_MS);

    return () => {
      cancelled = true;
      if (timer) clearInterval(timer);
    };
  }, [video, enabled]);

  return color;
}
