import { clamp } from "./utils";

/** Gain multiplier range (1 = off / unity, 3 = 300%). */
export const VOLUME_BOOST_MIN = 1;
export const VOLUME_BOOST_MAX = 3;
export const VOLUME_BOOST_DEFAULT = 1;

export function sanitizeVolumeBoost(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return VOLUME_BOOST_DEFAULT;
  // Round to 0.05 so prefs stay tidy in localStorage / UI.
  const stepped = Math.round(n * 20) / 20;
  return clamp(stepped, VOLUME_BOOST_MIN, VOLUME_BOOST_MAX);
}

export function formatVolumeBoost(boost: number): string {
  const pct = Math.round(sanitizeVolumeBoost(boost) * 100);
  return `${pct}%`;
}

type AudioContextCtor = typeof AudioContext;

type BoostGraph = {
  ctx: AudioContext;
  source: MediaElementAudioSourceNode;
  gain: GainNode;
};

/**
 * Per-element cache. `createMediaElementSource` may only run once per media
 * element — never disconnect while the element still exists (React Strict Mode
 * remounts / src swaps reuse the same <video>).
 */
const graphByVideo = new WeakMap<HTMLVideoElement, BoostGraph>();
const failedVideos = new WeakSet<HTMLVideoElement>();

function getAudioContextCtor(): AudioContextCtor | null {
  if (typeof window === "undefined") return null;
  return (
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: AudioContextCtor })
      .webkitAudioContext ||
    null
  );
}

function applyGainValue(graph: BoostGraph, boost: number): void {
  const next = sanitizeVolumeBoost(boost);
  const param = graph.gain.gain;
  try {
    param.cancelScheduledValues(graph.ctx.currentTime);
    param.setValueAtTime(next, graph.ctx.currentTime);
  } catch {
    param.value = next;
  }
}

async function resumeContext(ctx: AudioContext): Promise<void> {
  if (ctx.state !== "suspended") return;
  try {
    await ctx.resume();
  } catch {
    /* autoplay / gesture policies */
  }
}

function createGraph(video: HTMLVideoElement): BoostGraph | null {
  if (failedVideos.has(video)) return null;
  const existing = graphByVideo.get(video);
  if (existing) return existing;

  const Ctor = getAudioContextCtor();
  if (!Ctor) {
    failedVideos.add(video);
    return null;
  }

  try {
    const ctx = new Ctor();
    const source = ctx.createMediaElementSource(video);
    const gain = ctx.createGain();
    gain.gain.value = VOLUME_BOOST_DEFAULT;
    source.connect(gain);
    gain.connect(ctx.destination);
    const graph: BoostGraph = { ctx, source, gain };
    graphByVideo.set(video, graph);
    return graph;
  } catch {
    // CORS / already-connected / unsupported — leave native volume path alone.
    failedVideos.add(video);
    return null;
  }
}

/**
 * Local-player sound boost via Web Audio GainNode.
 * Cast remote volume is unaffected — only the HTMLMediaElement graph.
 */
export class AudioBoostController {
  private video: HTMLVideoElement | null = null;
  private boost = VOLUME_BOOST_DEFAULT;

  get currentBoost(): number {
    return this.boost;
  }

  get isAttached(): boolean {
    return this.video != null && graphByVideo.has(this.video);
  }

  get attachFailed(): boolean {
    return this.video != null && failedVideos.has(this.video);
  }

  /**
   * Ensure the graph exists for `video` when boost > 1, or update gain.
   * Safe to call on every source attach / remount attempt with the same element.
   */
  ensure(video: HTMLVideoElement | null, boost: number): void {
    this.boost = sanitizeVolumeBoost(boost);
    if (!video) return;
    this.video = video;

    // Unity gain and no graph yet — stay on the default media path.
    if (this.boost <= VOLUME_BOOST_DEFAULT + 1e-6 && !graphByVideo.has(video)) {
      return;
    }

    const graph = createGraph(video);
    if (!graph) return;
    applyGainValue(graph, this.boost);
    void resumeContext(graph.ctx);
  }

  setBoost(boost: number): void {
    this.boost = sanitizeVolumeBoost(boost);
    if (!this.video) return;
    this.ensure(this.video, this.boost);
  }

  async resume(): Promise<void> {
    if (!this.video) return;
    const graph = graphByVideo.get(this.video);
    if (!graph) return;
    await resumeContext(graph.ctx);
  }

  /**
   * Drop controller→video binding only. Do not disconnect MediaElementSource —
   * that permanently silences or bricks the element if it stays in the DOM.
   */
  dispose(): void {
    this.video = null;
  }
}
