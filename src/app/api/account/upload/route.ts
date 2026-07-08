import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"]);

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "avatar");
    const kind = kindRaw === "banner" ? "banner" : "avatar";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: "Unsupported image type" }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 4 MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const db = getDb();

    // Store the image in-DB as base64.
    const [row] = await db
      .insert(uploads)
      .values({
        userId: payload.userId,
        kind,
        contentType: file.type,
        data: buffer.toString("base64"),
        size: buffer.byteLength,
      })
      .returning({ id: uploads.id });

    // Tag GIFs with a ".gif" hint so the client renders them as an animated
    // <img> instead of running them through next/image (which flattens them).
    // Static images stay extensionless so next/image can still optimize them.
    const url =
      file.type === "image/gif"
        ? `/api/uploads/${row.id}.gif`
        : `/api/uploads/${row.id}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[account/upload]", e);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}

export const maxDuration = 30;
