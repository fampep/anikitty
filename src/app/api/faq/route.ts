import { getFaqContent } from "@/lib/faq/faq-server";

export async function GET() {
  try {
    const data = await getFaqContent();
    return Response.json(data, {
      headers: { "Cache-Control": "public, max-age=60, s-maxage=300" },
    });
  } catch {
    // Table may not exist yet (migration not run).
    return Response.json({ categories: [], articles: [] });
  }
}
