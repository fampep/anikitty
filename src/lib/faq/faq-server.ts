import { unstable_cache } from "next/cache";
import { asc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { faqArticles, faqCategories } from "@/db/schema";
import type { FaqItem, FaqPayload } from "@/lib/faq/types";

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((x): x is string => typeof x === "string");
}

function toIsoDate(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString().slice(0, 10);
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

async function fetchFaqContentUncached(): Promise<FaqPayload> {
  const db = getDb();
  const [cats, arts] = await Promise.all([
    db
      .select({
        id: faqCategories.id,
        labelKey: faqCategories.labelKey,
        icon: faqCategories.icon,
        order: faqCategories.sortOrder,
      })
      .from(faqCategories)
      .orderBy(asc(faqCategories.sortOrder)),
    db
      .select({
        id: faqArticles.id,
        categoryId: faqArticles.categoryId,
        title: faqArticles.title,
        answer: faqArticles.answer,
        tags: faqArticles.tags,
        relatedSlugs: faqArticles.relatedSlugs,
        popularity: faqArticles.popularity,
        order: faqArticles.sortOrder,
        updatedAt: faqArticles.updatedAt,
      })
      .from(faqArticles)
      .where(eq(faqArticles.published, true))
      .orderBy(asc(faqArticles.sortOrder)),
  ]);

  const articles: FaqItem[] = arts.map((row) => ({
    id: row.id,
    category: row.categoryId,
    title: row.title,
    answer: row.answer,
    tags: asStringArray(row.tags),
    relatedIds: asStringArray(row.relatedSlugs),
    popularity: row.popularity,
    order: row.order,
    updatedAt: toIsoDate(row.updatedAt),
  }));

  return {
    categories: cats.map((c) => ({
      id: c.id,
      labelKey: c.labelKey,
      icon: c.icon,
      order: c.order,
    })),
    articles,
  };
}

export const getFaqContent = unstable_cache(fetchFaqContentUncached, ["faq-content-v1"], {
  revalidate: 300,
});
