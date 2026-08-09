import "server-only";
import { AsyncLocalStorage } from "async_hooks";
import {
  DEFAULT_KITTY_API_NODE_ID,
  parseKittyNodeParam,
  type KittyApiNodeId,
} from "@/lib/kitty/kitty-api-nodes";
import { getKittyApiNodeDirectUrl } from "@/lib/kitty/kitty-api-node-origins.server";
import {
  kittyApiFetch as kittyApiFetchCore,
  type KittyApiFetchOptions,
} from "@/lib/kitty/kitty-api-core";

export {
  buildKittyAutoStreamPath,
  buildKittyStreamDirectPath,
  parseKittyStreamAudio,
  parseKittyStreamJson,
  kittyApiHeaders,
  kittyApiPath,
  kittyStreamHeaders,
} from "@/lib/kitty/kitty-api-core";

export { parseKittyNodeParam, type KittyApiNodeId } from "@/lib/kitty/kitty-api-nodes";

type KittyRequestContext = {
  nodeId?: KittyApiNodeId;
};

const kittyRequestStore = new AsyncLocalStorage<KittyRequestContext>();

export function getKittyRequestNodeId(): KittyApiNodeId | undefined {
  return kittyRequestStore.getStore()?.nodeId;
}

export function withKittyApiNode<T>(nodeId: KittyApiNodeId | undefined, fn: () => T): T {
  return kittyRequestStore.run({ nodeId }, fn);
}

export async function withKittyApiNodeAsync<T>(
  nodeId: KittyApiNodeId | undefined,
  fn: () => Promise<T>,
): Promise<T> {
  return kittyRequestStore.run({ nodeId }, fn);
}

/** Fetch KittyAPI on the selected node (request context or explicit nodeId). */
export async function kittyApiFetch(
  path: string,
  init?: RequestInit,
  opts?: KittyApiFetchOptions,
): Promise<Response> {
  const nodeId = opts?.nodeId ?? getKittyRequestNodeId() ?? DEFAULT_KITTY_API_NODE_ID;
  return kittyApiFetchCore(path, init, {
    ...opts,
    nodeId,
    resolveBase: opts?.resolveBase ?? getKittyApiNodeDirectUrl,
  });
}

export async function handleKittyApiRequest(
  req: Request,
  handler: () => Promise<Response>,
): Promise<Response> {
  const nodeId = parseKittyNodeParam(new URL(req.url).searchParams.get("kittyNode"));
  return withKittyApiNodeAsync(nodeId, handler);
}
