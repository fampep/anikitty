import { NextResponse } from "next/server";
import { signAdminToken } from "@/lib/admin-auth";

export async function POST(req: Request) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) {
    return NextResponse.json({ error: "Admin access not configured" }, { status: 503 });
  }

  try {
    const { password } = await req.json();
    if (!password || password !== adminPassword) {
      // Constant-time-ish delay to slow brute force
      await new Promise((r) => setTimeout(r, 500));
      return NextResponse.json({ error: "Invalid password" }, { status: 401 });
    }

    const token = await signAdminToken();
    return NextResponse.json({ token });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
