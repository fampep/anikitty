import type { LucideIcon } from "lucide-react";

export type FaqCategoryId = string;

export type FaqItem = {
  /** URL slug — used as `/faq#slug`. */
  id: string;
  category: FaqCategoryId;
  /** Searchable keywords + related matching. */
  tags: string[];
  title: string;
  /** Markdown-friendly body (lists, links, code, tables, images). */
  answer: string;
  /** ISO date — shown as “Updated …”. */
  updatedAt: string;
  /** Sort order within a category (lower first). */
  order: number;
  /** Higher = more likely in “Most Frequently Asked”. */
  popularity: number;
  /** Related question ids (3–5 preferred). */
  relatedIds: string[];
};

export type FaqCategoryDto = {
  id: FaqCategoryId;
  /** i18n key under `faq.categories.*`. */
  labelKey: string;
  /** Lucide icon name stored in DB (e.g. "Rocket"). */
  icon: string;
  /** Sidebar / section sort (lower first). */
  order: number;
};

export type FaqCategoryMeta = Omit<FaqCategoryDto, "icon"> & {
  icon: LucideIcon;
};

export type FaqPayload = {
  categories: FaqCategoryDto[];
  articles: FaqItem[];
};
