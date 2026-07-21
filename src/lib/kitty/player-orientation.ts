/** Device is sideways while the layout viewport stayed portrait (rotation lock). */
export function isViewportPortrait(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerHeight > window.innerWidth;
}

/** 0 = portrait, 90/270 = landscape (Screen Orientation API or legacy). */
export function getOrientationAngle(): number {
  if (typeof window === "undefined") return 0;

  const angle = window.screen?.orientation?.angle;
  if (typeof angle === "number" && !Number.isNaN(angle)) {
    return ((angle % 360) + 360) % 360;
  }

  const legacy = (window as Window & { orientation?: number }).orientation;
  if (typeof legacy === "number" && !Number.isNaN(legacy)) {
    return ((legacy % 360) + 360) % 360;
  }

  return isViewportPortrait() ? 0 : 90;
}

export function isDeviceSideways(): boolean {
  const angle = getOrientationAngle();
  return angle === 90 || angle === 270;
}

/** Physical landscape + locked portrait viewport (common on phones). */
export function isRotationLockLandscape(): boolean {
  return isDeviceSideways() && isViewportPortrait();
}

export function isTouchLikeDevice(): boolean {
  if (typeof window === "undefined") return false;
  return (
    "ontouchstart" in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia("(pointer: coarse)").matches
  );
}

export type PlayerOrientClass =
  | ""
  | "kitty-orient-landscape"
  | "kitty-orient-landscape-reverse";

export function playerOrientClassForAngle(angle: number): PlayerOrientClass {
  if (!isRotationLockLandscape()) return "";
  return angle === 270 ? "kitty-orient-landscape-reverse" : "kitty-orient-landscape";
}

export function resolvePlayerOrientClass(opts: {
  isFullscreen?: boolean;
  cssFullscreen?: boolean;
  touchDevice?: boolean;
}): PlayerOrientClass {
  const touch = opts.touchDevice ?? isTouchLikeDevice();
  if (!touch) return "";

  // Phone sideways + OS rotation lock kept the layout portrait.
  if (isRotationLockLandscape()) {
    return playerOrientClassForAngle(getOrientationAngle());
  }

  // Immersive / CSS fullscreen while the viewport is still portrait:
  // force a landscape layout (Screen Orientation lock needs document FS and
  // often fails; CSS FS can never lock).
  const immersive = Boolean(opts.cssFullscreen || opts.isFullscreen);
  if (immersive && isViewportPortrait()) {
    return "kitty-orient-landscape";
  }

  return "";
}

export async function tryLockLandscapeOrientation(): Promise<void> {
  if (typeof screen === "undefined") return;
  const orient = screen.orientation as ScreenOrientation & {
    lock?: (orientation: string) => Promise<void>;
  };
  if (!orient?.lock) return;
  // Prefer generic "landscape" (either primary/secondary); fall back.
  try {
    await orient.lock("landscape");
    return;
  } catch {
    /* try primary */
  }
  try {
    await orient.lock("landscape-primary");
  } catch {
    // Unsupported, not document-fullscreen, or OS rotation lock — CSS handles it.
  }
}

export async function tryUnlockScreenOrientation(): Promise<void> {
  if (typeof screen === "undefined") return;
  try {
    await screen.orientation?.unlock?.();
  } catch {
    // ignored
  }
}

const ORIENT_EVENTS = ["orientationchange", "resize"] as const;

/** Keep player layout in sync when rotation lock prevents viewport rotation. */
export function onPlayerOrientationChange(handler: () => void): () => void {
  for (const type of ORIENT_EVENTS) {
    window.addEventListener(type, handler);
  }
  const mq = window.matchMedia("(orientation: landscape)");
  const onMq = () => handler();
  mq.addEventListener?.("change", onMq);
  return () => {
    for (const type of ORIENT_EVENTS) {
      window.removeEventListener(type, handler);
    }
    mq.removeEventListener?.("change", onMq);
  };
}
