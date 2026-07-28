import type { FaqCategoryMeta, FaqItem } from "@/lib/faq/types";

export function getFaqItem(items: FaqItem[], id: string): FaqItem | undefined {
  return items.find((item) => item.id === id);
}

export function getPopularFaqItems(items: FaqItem[], limit = 6): FaqItem[] {
  return [...items]
    .sort((a, b) => b.popularity - a.popularity || a.order - b.order)
    .slice(0, limit);
}

export function getRelatedFaqItems(
  items: FaqItem[],
  item: FaqItem,
  limit = 5,
): FaqItem[] {
  const byId = new Map(items.map((x) => [x.id, x]));
  const fromIds = item.relatedIds
    .map((id) => byId.get(id))
    .filter((x): x is FaqItem => Boolean(x));

  if (fromIds.length >= limit) return fromIds.slice(0, limit);

  const tagSet = new Set(item.tags.map((t) => t.toLowerCase()));
  const extras = items
    .filter((other) => {
      if (other.id === item.id) return false;
      if (fromIds.some((x) => x.id === other.id)) return false;
      return (
        other.tags.some((t) => tagSet.has(t.toLowerCase())) ||
        other.category === item.category
      );
    })
    .sort((a, b) => b.popularity - a.popularity)
    .slice(0, limit - fromIds.length);

  return [...fromIds, ...extras].slice(0, limit);
}

export function categoriesWithContent(
  categories: FaqCategoryMeta[],
  items: FaqItem[],
): FaqCategoryMeta[] {
  const present = new Set(items.map((i) => i.category));
  return categories.filter((c) => present.has(c.id)).sort((a, b) => a.order - b.order);
}
