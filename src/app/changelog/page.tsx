import type { Metadata } from "next";
import Container from "@/components/layout/container";
import { CHANGELOG, CHANGE_TYPE_META } from "@/lib/changelog";
import { ScrollText } from "lucide-react";

export const metadata: Metadata = {
  title: "Changelog | AniKitty",
  description: "What's new on AniKitty — features, improvements, and fixes.",
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export default function ChangelogPage() {
  const entries = [...CHANGELOG].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <Container className="mt-16 sm:mt-20 pb-20 max-w-3xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
          <ScrollText className="w-5 h-5" />
        </div>
        <h1 className="text-2xl font-bold text-foreground dark:text-white tracking-tight">Changelog</h1>
      </div>
      <p className="text-sm text-muted-foreground dark:text-white/45 mb-10">
        What&apos;s new on AniKitty — features, improvements, and fixes.
      </p>

      {entries.length === 0 ? (
        <div className="rounded-2xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground dark:text-white/40 font-mono">
            No entries yet — check back soon.
          </p>
        </div>
      ) : (
        <div className="relative flex flex-col gap-10 before:absolute before:left-[7px] before:top-2 before:bottom-2 before:w-px before:bg-border before:dark:bg-white/10 sm:before:left-[calc(9rem+7px)]">
          {entries.map((entry) => (
            <article key={`${entry.version}-${entry.date}`} className="relative sm:flex sm:gap-8">
              {/* Timeline dot + date rail */}
              <div className="flex items-center gap-3 sm:w-36 sm:flex-col sm:items-end sm:gap-1 sm:pt-0.5 mb-3 sm:mb-0">
                <span className="relative z-10 h-3.5 w-3.5 shrink-0 rounded-full bg-violet-500 ring-4 ring-background dark:ring-[#0a0a12] sm:order-2 sm:mt-1" />
                <div className="sm:order-1 sm:text-right">
                  <p className="text-sm font-bold text-foreground dark:text-white tabular-nums">{entry.version}</p>
                  <p className="text-[11px] font-mono text-muted-foreground/70 dark:text-white/30">{formatDate(entry.date)}</p>
                </div>
              </div>

              <div className="flex-1 min-w-0 sm:pl-2">
                {entry.title && (
                  <h2 className="text-base font-semibold text-foreground dark:text-white/90 mb-3">{entry.title}</h2>
                )}
                <ul className="flex flex-col gap-2.5">
                  {entry.changes.map((change, i) => {
                    const meta = CHANGE_TYPE_META[change.type];
                    return (
                      <li key={i} className="flex items-start gap-2.5">
                        <span
                          className={`mt-0.5 shrink-0 inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                        <span className="text-sm text-muted-foreground dark:text-white/60 leading-relaxed">{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </article>
          ))}
        </div>
      )}
    </Container>
  );
}
