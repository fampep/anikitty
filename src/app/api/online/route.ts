const sessions = new Map<string, number>();
const TTL_MS = 90_000;

function prune() {
  const now = Date.now();
  for (const [id, ts] of sessions) {
    if (now - ts > TTL_MS) sessions.delete(id);
  }
}

export async function GET() {
  prune();
  return Response.json({ count: sessions.size });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sessionId, action } = body ?? {};

    if (typeof sessionId !== "string" || sessionId.length > 64) {
      return Response.json({ count: sessions.size }, { status: 400 });
    }

    if (action === "leave") {
      sessions.delete(sessionId);
    } else {
      sessions.set(sessionId, Date.now());
    }

    prune();
    return Response.json({ count: sessions.size });
  } catch {
    prune();
    return Response.json({ count: sessions.size });
  }
}
