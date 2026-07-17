import "server-only";

import {
  buildKittyAutoStreamPath,
  buildKittyStreamDirectPath,
  parseKittyStreamJson,
  type KittyStreamPayload,
} from "@/lib/kitty/kitty-api-core";
import { kittyApiFetch, withKittyApiNodeAsync } from "@/lib/kitty/kitty-api-server";
import {
  fetchAnilistSiteHardSubStream,
} from "@/lib/kitty/anilist-site-api";
import { isAnilistSiteProvider, type AnilistSiteProviderId } from "@/lib/kitty/anilist-site-providers";
import { isVideoVibProvider, videoVibStreamPaths } from "@/lib/kitty/videovib-provider";
import type { KittyProvider } from "@/lib/kitty/kitty-providers";
import {
  kittyNodeRaceOrder,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";
import {
  isValidKittyStreamWin,
  KITTY_RACE_ATTEMPT_TIMEOUT_MS,
  KITTY_RACE_STAGGER_MS,
  markKittyNodeDead,
  orderKittyNodesForRace,
  prefilterHealthyKittyNodes,
  recordKittyProviderNodeFail,
  recordKittyProviderNodeWin,
} from "@/lib/kitty/kitty-node-race";

export type KittyRawStream = KittyStreamPayload;

export type FetchKittyStreamOpts = {
  provider?: KittyProvider | string;
  anilistId: number;
  episode: number;
  audio: "sub" | "dub";
  title?: string | null;
  timeoutMs?: number;
  /** When true, skip `/auto/stream` after stream-direct fails. */
  directOnly?: boolean;
  /** MegaPlay / Anikoto — pick `HS:` site servers before soft-sub lines. */
  preferHardSub?: boolean;
  /** Pin to one cluster node (disables cross-node sequential failover when set with failover false). */
  nodeId?: KittyApiNodeId;
  /** Default true. Race probes set false so each attempt stays on one node. */
  failover?: boolean;
  signal?: AbortSignal;
};

async function fetchKittyStreamPath(
  path: string,
  timeoutMs: number,
  opts?: {
    nodeId?: KittyApiNodeId;
    failover?: boolean;
    signal?: AbortSignal;
  },
): Promise<KittyStreamPayload | null> {
  try {
    const timeout = AbortSignal.timeout(timeoutMs);
    const signal =
      opts?.signal && typeof AbortSignal.any === "function"
        ? AbortSignal.any([opts.signal, timeout])
        : opts?.signal ?? timeout;
    const res = await kittyApiFetch(
      path,
      {
        cache: "no-store",
        signal,
      },
      {
        nodeId: opts?.nodeId,
        failover: opts?.failover,
      },
    );
    return parseKittyStreamJson(await res.json(), res.ok);
  } catch {
    return null;
  }
}

/** GET /provider/{name}/stream-direct — primary one-request stream (see KittyAPI guide). */
export async function fetchKittyStreamDirect(
  opts: FetchKittyStreamOpts,
): Promise<KittyStreamPayload | null> {
  const provider = opts.provider?.trim();
  if (!provider) return null;

  const timeoutMs = opts.timeoutMs ?? 40_000;
  const fetchOpts = {
    nodeId: opts.nodeId,
    failover: opts.failover,
    signal: opts.signal,
  };

  if (
    opts.preferHardSub &&
    opts.audio === "sub" &&
    isAnilistSiteProvider(provider)
  ) {
    const hardSub = await withKittyApiNodeAsync(opts.nodeId, () =>
      fetchAnilistSiteHardSubStream({
        provider: provider as AnilistSiteProviderId,
        anilistId: opts.anilistId,
        episode: opts.episode,
        title: opts.title,
        timeoutMs,
      }),
    );
    if (hardSub?.file) return hardSub;
  }

  if (isVideoVibProvider(provider)) {
    for (const path of videoVibStreamPaths({
      anilistId: opts.anilistId,
      episode: opts.episode,
      audio: opts.audio,
      title: opts.title,
    })) {
      const result = await fetchKittyStreamPath(path, timeoutMs, fetchOpts);
      if (result?.file) return result;
    }
    return null;
  }

  const path = buildKittyStreamDirectPath({
    provider,
    anilistId: opts.anilistId,
    episode: opts.episode,
    audio: opts.audio,
    title: opts.title,
  });

  return fetchKittyStreamPath(path, timeoutMs, fetchOpts);
}

/** GET /auto/stream — tries providers automatically when stream-direct fails. */
export async function fetchKittyAutoStream(
  opts: Omit<FetchKittyStreamOpts, "provider" | "directOnly" | "preferHardSub">,
): Promise<KittyStreamPayload | null> {
  const path = buildKittyAutoStreamPath({
    anilistId: opts.anilistId,
    episode: opts.episode,
    // Never use dub auto/stream — it can match a different show. SUB keeps the same anime.
    dub: false,
  });

  return fetchKittyStreamPath(path, opts.timeoutMs ?? 45_000, {
    nodeId: opts.nodeId,
    failover: opts.failover,
    signal: opts.signal,
  });
}

/**
 * stream-direct for a named provider. `/auto/stream` is only used when no provider is set.
 * Dub→sub retry is handled by the stream API route (same provider, same anime).
 */
export async function fetchKittyProviderStream(
  opts: FetchKittyStreamOpts,
): Promise<KittyStreamPayload | null> {
  // Named providers must not fall back to /auto/stream — it can resolve a different anime.
  const directOnly = opts.directOnly ?? Boolean(opts.provider?.trim());

  if (opts.provider) {
    const direct = await fetchKittyStreamDirect(opts);
    if (direct?.file) return direct;
    if (directOnly) return null;
  }

  return fetchKittyAutoStream(opts);
}

export type RacedKittyStream = {
  stream: KittyStreamPayload;
  nodeId: KittyApiNodeId;
  /** Wall-clock ms from race start until first valid win (includes health prefilter). */
  raceMs: number;
};

/**
 * Parallel probe across KittyAPI nodes for the selected provider stream.
 * Health-prefilters, scores by recent provider wins, staggers starts, then
 * first valid `file` wins and losers are aborted immediately.
 * Not geo / lowest-ping — fastest successful stream-direct response.
 */
export async function raceKittyProviderStream(
  opts: FetchKittyStreamOpts,
  nodeIds: readonly KittyApiNodeId[] = kittyNodeRaceOrder(),
): Promise<RacedKittyStream | null> {
  const raceStarted = Date.now();
  const provider = opts.provider?.trim() || null;

  let candidates = orderKittyNodesForRace(
    nodeIds.length ? nodeIds : kittyNodeRaceOrder(),
    provider,
  );
  if (candidates.length === 0) return null;

  if (opts.signal?.aborted) return null;

  // Drop obviously dead peers before hammering stream-direct.
  if (candidates.length > 1) {
    candidates = orderKittyNodesForRace(
      await prefilterHealthyKittyNodes(candidates, { signal: opts.signal }),
      provider,
    );
  }
  if (candidates.length === 0) return null;

  if (candidates.length === 1) {
    const nodeId = candidates[0]!;
    const stream = await fetchKittyStreamDirect({
      ...opts,
      nodeId,
      failover: false,
      timeoutMs: Math.min(opts.timeoutMs ?? 40_000, KITTY_RACE_ATTEMPT_TIMEOUT_MS),
    });
    if (!isValidKittyStreamWin(stream)) {
      recordKittyProviderNodeFail(provider, nodeId);
      markKittyNodeDead(nodeId);
      return null;
    }
    recordKittyProviderNodeWin(provider, nodeId);
    return { stream: stream!, nodeId, raceMs: Date.now() - raceStarted };
  }

  // Per-node budget: stream-direct often needs 8–14s; fail faster than a hung peer.
  const attemptTimeoutMs = Math.min(
    opts.timeoutMs ?? 40_000,
    KITTY_RACE_ATTEMPT_TIMEOUT_MS,
  );

  return new Promise<RacedKittyStream | null>((resolve) => {
    let settled = false;
    let pending = candidates.length;
    const controllers = candidates.map(() => new AbortController());
    const staggerTimers: ReturnType<typeof setTimeout>[] = [];

    const abortLosers = (winnerIndex: number) => {
      for (let i = 0; i < controllers.length; i++) {
        if (i !== winnerIndex) controllers[i]!.abort();
      }
      for (const timer of staggerTimers) clearTimeout(timer);
    };

    const settleNull = () => {
      if (!settled && pending <= 0) {
        settled = true;
        for (const timer of staggerTimers) clearTimeout(timer);
        resolve(null);
      }
    };

    const launch = (nodeId: KittyApiNodeId, index: number) => {
      const controller = controllers[index]!;
      if (settled || controller.signal.aborted) {
        pending -= 1;
        settleNull();
        return;
      }

      void fetchKittyStreamDirect({
        ...opts,
        nodeId,
        failover: false,
        timeoutMs: attemptTimeoutMs,
        signal: controller.signal,
      })
        .then((stream) => {
          if (settled) return;
          if (isValidKittyStreamWin(stream)) {
            settled = true;
            abortLosers(index);
            recordKittyProviderNodeWin(provider, nodeId);
            resolve({
              stream: stream!,
              nodeId,
              raceMs: Date.now() - raceStarted,
            });
            return;
          }
          recordKittyProviderNodeFail(provider, nodeId);
          pending -= 1;
          settleNull();
        })
        .catch(() => {
          if (settled) return;
          // Transport hang / abort on this peer — short cooldown so failover skips it.
          if (!controller.signal.aborted) {
            markKittyNodeDead(nodeId);
            recordKittyProviderNodeFail(provider, nodeId);
          }
          pending -= 1;
          settleNull();
        });
    };

    candidates.forEach((nodeId, index) => {
      const controller = controllers[index]!;
      if (opts.signal) {
        if (opts.signal.aborted) {
          controller.abort();
        } else {
          opts.signal.addEventListener("abort", () => controller.abort(), { once: true });
        }
      }

      if (index === 0) {
        launch(nodeId, index);
        return;
      }

      const timer = setTimeout(() => launch(nodeId, index), index * KITTY_RACE_STAGGER_MS);
      staggerTimers.push(timer);
    });
  });
}
