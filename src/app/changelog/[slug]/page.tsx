import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import Container from "@/components/layout/container";
import { getChangelogEntry } from "@/lib/changelog/changelog-server";
import { CHANGELOG_CATEGORIES, CHANGELOG_CATEGORY_META, type ChangelogCategory } from "@/lib/changelog/changelog-shared";
import { buildPageMetadata } from "@/lib/seo/site-seo";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const entry = await getChangelogEntry(slug).catch(() => null);
  if (!entry) {
    return buildPageMetadata({
      title: "Changelog | AniKitty",
      description: "AniKitty release notes.",
      path: `/changelog/${slug}`,
    });
  }
  return buildPageMetadata({
    title: `Version ${entry.version} | AniKitty Changelog`,
    description: entry.summary ?? `What's new in AniKitty ${entry.version}.`,
    path: `/changelog/${entry.slug}`,
  });
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso.slice(0, 10);
  }
}

export default async function ChangelogEntryPage({ params }: Props) {
  const { slug } = await params;
  const entry = await getChangelogEntry(slug).catch(() => null);
  if (!entry) notFound();

  const grouped = new Map<ChangelogCategory, string[]>();
  for (const item of entry.items) {
    const list = grouped.get(item.category) ?? [];
    list.push(item.text);
    grouped.set(item.category, list);
  }

  return (
    <Container className="py-8 sm:py-12">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/changelog"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground dark:text-white/50 hover:text-foreground dark:hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All updates
        </Link>

        <h1 className="text-2xl font-bold tracking-tight text-foreground dark:text-white sm:text-3xl">
          Version {entry.version}
        </h1>
        <p className="mt-1 text-sm font-mono text-muted-foreground dark:text-white/40">
          Released {formatDate(entry.releasedAt)}
        </p>
        {entry.title ? (
          <p className="mt-3 text-base font-semibold text-foreground/90 dark:text-white/80">
            {entry.title}
          </p>
        ) : null}
        {entry.summary ? (
          <p className="mt-2 text-sm text-muted-foreground dark:text-white/55">{entry.summary}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-5">
          {CHANGELOG_CATEGORIES.filter((c) => grouped.has(c)).map((c) => {
            const meta = CHANGELOG_CATEGORY_META[c];
            return (
              <div key={c}>
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground dark:text-white/50">
                  <span aria-hidden>{meta.emoji}</span>
                  {meta.label}
                </p>
                <ul className="mt-2 flex flex-col gap-1.5 pl-1">
                  {grouped.get(c)!.map((text, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-foreground/85 dark:text-white/75"
                    >
                      <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current opacity-50" />
                      {text}
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </div>
    </Container>
  );
}
