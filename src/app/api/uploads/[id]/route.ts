import { getDb } from "@/db";
import { uploads } from "@/db/schema";
import { eq } from "drizzle-orm";

/** Serve a DB-stored user upload (avatar/banner) by id. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // Guard against malformed ids hitting the DB.
  if (!/^[0-9a-fA-F-]{36}$/.test(id)) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const db = getDb();
    const [row] = await db
      .select({ data: uploads.data, contentType: uploads.contentType })
      .from(uploads)
      .where(eq(uploads.id, id))
      .limit(1);

    if (!row) return new Response("Not found", { status: 404 });

    const bytes = Buffer.from(row.data, "base64");
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": row.contentType,
        // Immutable: each upload gets a fresh id/URL, so it can cache forever.
        "Cache-Control": "public, max-age=31536000, immutable",
        "Cross-Origin-Resource-Policy": "cross-origin",
      },
    });
  } catch (e) {
    console.error("[uploads GET]", e);
    return new Response("Error", { status: 500 });
  }
}

export const maxDuration = 15;
