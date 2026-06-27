export const THUMB_W = 160;
export const THUMB_H = 90;
export const SPRITE_COLS = 6;
export const MAX_FRAMES = 36;

export type KittyThumbnail = {
  startTime: number;
  endTime: number;
  url: string;
  width: number;
  height: number;
  coords: { x: number; y: number };
};

export function buildThumbnailSprites(
  frames: Map<number, HTMLCanvasElement>,
  interval: number,
  spriteCanvas: HTMLCanvasElement,
): KittyThumbnail[] {
  const keys = Array.from(frames.keys()).sort((a, b) => a - b);
  if (keys.length === 0) return [];

  const spriteCtx = spriteCanvas.getContext("2d");
  if (!spriteCtx) return [];

  const rows = Math.ceil(MAX_FRAMES / SPRITE_COLS);
  spriteCanvas.width = THUMB_W * SPRITE_COLS;
  spriteCanvas.height = THUMB_H * rows;
  spriteCtx.fillStyle = "#0a0a0a";
  spriteCtx.fillRect(0, 0, spriteCanvas.width, spriteCanvas.height);

  keys.forEach((key, i) => {
    const frame = frames.get(key);
    if (!frame) return;
    const col = i % SPRITE_COLS;
    const row = Math.floor(i / SPRITE_COLS);
    spriteCtx.drawImage(frame, col * THUMB_W, row * THUMB_H, THUMB_W, THUMB_H);
  });

  const spriteUrl = spriteCanvas.toDataURL("image/jpeg", 0.78);
  return keys.map((start, i) => {
    const end = i + 1 < keys.length ? keys[i + 1] : start + interval;
    const col = i % SPRITE_COLS;
    const row = Math.floor(i / SPRITE_COLS);
    return {
      startTime: start,
      endTime: end,
      url: spriteUrl,
      width: THUMB_W,
      height: THUMB_H,
      coords: { x: col * THUMB_W, y: row * THUMB_H },
    };
  });
}
