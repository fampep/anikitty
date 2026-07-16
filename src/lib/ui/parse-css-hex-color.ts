/** Parse #rgb / #rrggbb (optional leading #). Falls back to white. */
export function parseCssHexColor(input: string | null | undefined): {
  hex: string;
  r: number;
  g: number;
  b: number;
} {
  const fallback = { hex: "#ffffff", r: 255, g: 255, b: 255 };
  if (!input) return fallback;

  const raw = input.trim();
  const m = raw.match(/^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return fallback;

  let h = m[1];
  if (h.length === 3) {
    h = `${h[0]}${h[0]}${h[1]}${h[1]}${h[2]}${h[2]}`;
  }

  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  if (![r, g, b].every((n) => Number.isFinite(n))) return fallback;

  return { hex: `#${h.toLowerCase()}`, r, g, b };
}
