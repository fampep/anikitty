import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { verifyToken, extractToken } from "@/lib/auth/auth-jwt";
import { publicErrorMessage } from "@/lib/security/public-error";
import { sql } from "drizzle-orm";

const MAX_BYTES = 4 * 1024 * 1024; // 4 MB
const ALLOWED_TYPES = new Set(["image/webp", "image/jpeg", "image/png", "image/gif"]);

type DbClient = ReturnType<typeof getDb>;

/** True when the error is Postgres "relation does not exist" (missing table). */
function isMissingTable(e: unknown): boolean {
  const err = e as { code?: string; message?: string } | null;
  return (
    err?.code === "42P01" ||
    /relation "?uploads"? does not exist/i.test(err?.message ?? "")
  );
}

/** Create the uploads table on demand so a fresh/un-migrated DB still works. */
async function ensureUploadsTable(db: DbClient) {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS uploads (
      id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      kind         VARCHAR(16) NOT NULL,
      content_type VARCHAR(64) NOT NULL,
      data         TEXT NOT NULL,
      size         INTEGER NOT NULL DEFAULT 0,
      created_at   TIMESTAMP DEFAULT NOW()
    )
  `);
  await db.execute(
    sql`CREATE INDEX IF NOT EXISTS uploads_user_kind_idx ON uploads (user_id, kind)`,
  );
}

export async function POST(req: Request) {
  const token = extractToken(req);
  if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const payload = await verifyToken(token);
  if (!payload) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const form = await req.formData();
    const file = form.get("file");
    const kindRaw = String(form.get("kind") ?? "avatar");
    const kind =
      kindRaw === "banner" ? "banner" : kindRaw === "chat" ? "chat" : "avatar";

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: `Unsupported image type: ${file.type || "unknown"}` }, { status: 415 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 4 MB)" }, { status: 413 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const db = getDb();

    const values = {
      userId: payload.userId,
      kind,
      contentType: file.type,
      data: buffer.toString("base64"),
      size: buffer.byteLength,
    };

    // Store the image in-DB as base64. If the table isn't there yet (fresh or
    // un-migrated DB), create it once and retry so uploads don't hard-fail.
    let row: { id: string } | undefined;
    try {
      [row] = await db.insert(uploads).values(values).returning({ id: uploads.id });
    } catch (e) {
      if (!isMissingTable(e)) throw e;
      await ensureUploadsTable(db);
      [row] = await db.insert(uploads).values(values).returning({ id: uploads.id });
    }

    if (!row) {
      return NextResponse.json({ error: "Upload failed (no row)" }, { status: 500 });
    }

    // Tag GIFs with a ".gif" hint so the client renders them as an animated
    // <img> instead of running them through next/image (which flattens them).
    // Static images stay extensionless so next/image can still optimize them.
    // Chat attachments need an extension so gif-url validation accepts them.
    const ext =
      file.type === "image/gif"
        ? ".gif"
        : file.type === "image/png"
          ? ".png"
          : file.type === "image/webp"
            ? ".webp"
            : file.type === "image/jpeg"
              ? ".jpg"
              : kind === "chat"
                ? ".webp"
                : "";
    const url =
      file.type === "image/gif"
        ? `/api/uploads/${row.id}.gif`
        : kind === "chat"
          ? `/api/uploads/${row.id}${ext || ".webp"}`
          : `/api/uploads/${row.id}`;
    return NextResponse.json({ url });
  } catch (e) {
    console.error("[account/upload]", e);
    return NextResponse.json(
      { error: publicErrorMessage(e, "Upload failed") },
      { status: 500 },
    );
  }
}

export const maxDuration = 30;
