export const revalidate = 86400;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (isNaN(numId)) return Response.json({ mappings: null, images: null });

  try {
    const res = await fetch(
      `https://api.ani.zip/mappings?anilist_id=${numId}`,
      { signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return Response.json({ mappings: null, images: null });

    const data = await res.json();
    return Response.json({
      mappings: data.mappings ?? null,
      images: data.images ?? null,
    });
  } catch {
    return Response.json({ mappings: null, images: null });
  }
}
