"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { ZoomIn, Loader2, Move } from "lucide-react";
import { cn } from "@/lib/core/utils";

type Props = {
  /** The selected file to crop. */
  file: File;
  /** Crop aspect ratio (width / height). 1 = square avatar, ~3 = banner. */
  aspect: number;
  /** Output width in px (height derived from aspect). */
  outputWidth: number;
  /** Round crop preview (avatars). */
  circular?: boolean;
  title?: string;
  onCancel: () => void;
  onConfirm: (blob: Blob) => void | Promise<void>;
};

const VIEWPORT_W = 320;
const MAX_ZOOM = 3;

/**
 * Drag-to-reposition + zoom image cropper. Exports the framed region as a webp
 * blob so the stored image is already the right shape (no per-render position
 * data needed anywhere the avatar/banner shows).
 */
export default function ImageCropper({
  file,
  aspect,
  outputWidth,
  circular = false,
  title = "Adjust image",
  onCancel,
  onConfirm,
}: Props) {
  const viewportH = Math.round(VIEWPORT_W / aspect);
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [scale, setScale] = useState(1); // multiplier over the cover-fit base
  const [offset, setOffset] = useState({ x: 0, y: 0 }); // top-left of image vs viewport
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);

  const baseScaleRef = useRef(1);
  const dragRef = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // Load the file into an <img>.
  useEffect(() => {
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    const image = new Image();
    image.onload = () => {
      // Base scale = cover the viewport at zoom 1.
      const base = Math.max(VIEWPORT_W / image.width, viewportH / image.height);
      baseScaleRef.current = base;
      setScale(base);
      setZoom(1);
      // Center.
      setOffset({
        x: (VIEWPORT_W - image.width * base) / 2,
        y: (viewportH - image.height * base) / 2,
      });
      setImg(image);
    };
    image.src = url;
    return () => {
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    };
  }, [file, viewportH]);

  // Keep the image covering the viewport (no empty gaps) after any pan/zoom.
  const clampOffset = useCallback(
    (o: { x: number; y: number }, s: number) => {
      if (!img) return o;
      const w = img.width * s;
      const h = img.height * s;
      const minX = Math.min(0, VIEWPORT_W - w);
      const minY = Math.min(0, viewportH - h);
      return {
        x: Math.max(minX, Math.min(0, o.x)),
        y: Math.max(minY, Math.min(0, o.y)),
      };
    },
    [img, viewportH],
  );

  const applyZoom = useCallback(
    (nextZoom: number) => {
      if (!img) return;
      const z = Math.max(1, Math.min(MAX_ZOOM, nextZoom));
      const nextScale = baseScaleRef.current * z;
      // Zoom around the viewport center.
      const cx = VIEWPORT_W / 2;
      const cy = viewportH / 2;
      setOffset((prev) => {
        const ratio = nextScale / scale;
        const nx = cx - (cx - prev.x) * ratio;
        const ny = cy - (cy - prev.y) * ratio;
        return clampOffset({ x: nx, y: ny }, nextScale);
      });
      setScale(nextScale);
      setZoom(z);
    },
    [img, scale, viewportH, clampOffset],
  );

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setOffset(clampOffset({ x: d.ox + (e.clientX - d.x), y: d.oy + (e.clientY - d.y) }, scale));
  };
  const onPointerUp = (e: React.PointerEvent) => {
    dragRef.current = null;
    try { (e.target as HTMLElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const handleConfirm = async () => {
    if (!img || busy) return;
    setBusy(true);
    try {
      const outW = outputWidth;
      const outH = Math.round(outputWidth / aspect);
      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no ctx");
      // Map viewport region -> source pixels.
      const srcX = -offset.x / scale;
      const srcY = -offset.y / scale;
      const srcW = VIEWPORT_W / scale;
      const srcH = viewportH / scale;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, outW, outH);
      const blob: Blob | null = await new Promise((resolve) =>
        // High-quality webp (near-lossless) — keeps avatars/banners crisp.
        canvas.toBlob((b) => resolve(b), "image/webp", 0.95),
      );
      if (!blob) throw new Error("export failed");
      await onConfirm(blob);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && !busy && onCancel()}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden sm:rounded-2xl bg-[#0c0c0c] border-white/10">
        <div className="px-5 pt-4 pb-3 border-b border-white/8">
          <DialogTitle className="text-sm font-semibold text-white/90">{title}</DialogTitle>
          <p className="mt-1 flex items-center gap-1.5 text-[11px] text-white/35">
            <Move className="w-3 h-3" /> Drag to reposition · use the slider to zoom
          </p>
        </div>

        <div className="p-5 flex flex-col items-center gap-4">
          <div
            className={cn(
              "relative overflow-hidden bg-black/60 ring-1 ring-white/10 touch-none select-none cursor-grab active:cursor-grabbing",
              circular ? "rounded-full" : "rounded-xl",
            )}
            style={{ width: VIEWPORT_W, height: viewportH }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {img ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={objectUrlRef.current ?? ""}
                alt=""
                draggable={false}
                className="absolute top-0 left-0 max-w-none pointer-events-none"
                style={{
                  width: img.width * scale,
                  height: img.height * scale,
                  transform: `translate(${offset.x}px, ${offset.y}px)`,
                }}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-5 h-5 animate-spin text-white/25" />
              </div>
            )}
            {/* grid guides */}
            <div className="pointer-events-none absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-40">
              {[...Array(9)].map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full max-w-[320px]">
            <ZoomIn className="w-4 h-4 text-white/40 shrink-0" />
            <input
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={(e) => applyZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 rounded-full appearance-none bg-white/10 accent-zinc-300 cursor-pointer"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-white/8">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-white/50 hover:text-white/80 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={!img || busy}
            className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white text-black text-xs font-bold hover:bg-white/90 disabled:opacity-40 transition-all"
          >
            {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Apply
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
