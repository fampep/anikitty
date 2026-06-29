import { proxyMiruroRequest } from "@/lib/providers/miruro-api";

type RouteContext = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: RouteContext) {
  const { path } = await ctx.params;
  const { searchParams } = new URL(req.url);
  return proxyMiruroRequest(path ?? [], searchParams);
}

export const maxDuration = 30;
