import { NextResponse } from "next/server";
import { signAdminToken } from "@/lib/admin-auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { safeEqual } from "@/lib/security";

export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Admin access not configured" }, { status: 503 });
  }

  const ip = getClientIp(req);
  const limited = rateLimit(`admin-auth:${ip}`, 8, 15 * 60 * 1000);
  if (!limited.ok) {
    return NextResponse.json(
      { error: `Too many attempts. Try again in ${limited.retryAfterSec}s.` },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  try {
    const { password } = await req.json();
    if (!password || !safeEqual(String(password), adminPassword)) {
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await signAdminToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
