"use client";

import Image from "next/image";
import { useMemo } from "react";
import { cn } from "@/lib/core/utils";
import { useT } from "@/providers/i18n-provider";
import type { AnimeStaffMember } from "@/types/anime-details";

const ROLE_PRIORITY = [
  "Director",
  "Series Composition",
  "Original Creator",
  "Character Design",
  "Chief Animation Director",
  "Music",
  "Sound Director",
  "Art Director",
  "Producer",
  "Animation Producer",
  "Executive Producer",
];

function roleSortKey(role: string): number {
  const idx = ROLE_PRIORITY.findIndex(
    (r) => role.toLowerCase() === r.toLowerCase() || role.toLowerCase().includes(r.toLowerCase()),
  );
  return idx === -1 ? 100 : idx;
}

type Props = {
  staff: AnimeStaffMember[];
};

export default function AnimeStaffPanel({ staff }: Props) {
  const t = useT();

  const grouped = useMemo(() => {
    const map = new Map<string, AnimeStaffMember[]>();
    const sorted = [...staff].sort(
      (a, b) => roleSortKey(a.role) - roleSortKey(b.role) || a.name.localeCompare(b.name),
    );
    for (const member of sorted) {
      const role = member.role || t("anime.staff.other");
      const list = map.get(role) ?? [];
      list.push(member);
      map.set(role, list);
    }
    return [...map.entries()];
  }, [staff, t]);

  if (staff.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
        {t("anime.staff.empty")}
      </p>
    );
  }

  return (
    <div className="space-y-8">
      {grouped.map(([role, members]) => (
        <section key={role}>
          <h3 className="text-[10px] font-mono text-muted-foreground dark:text-white/30 uppercase tracking-widest mb-4">
            {role}
            <span className="ml-2 text-muted-foreground/50 dark:text-white/15">{members.length}</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {members.map((m) => (
              <StaffCard key={`${m.id}-${m.role}`} member={m} />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

function StaffCard({ member }: { member: AnimeStaffMember }) {
  return (
    <a
      href={`https://anilist.co/staff/${member.id}`}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-3 rounded-xl border border-border dark:border-white/8 bg-muted/20 dark:bg-white/[0.02] p-3",
        "hover:border-white/20 hover:bg-muted/30 dark:hover:bg-white/[0.04] transition-colors",
      )}
    >
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full ring-1 ring-white/10">
        {member.poster ? (
          <Image src={member.poster} alt={member.name} fill sizes="56px" className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 bg-muted/60 dark:bg-white/5" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground/90 dark:text-white/85 line-clamp-1">{member.name}</p>
        {member.native && (
          <p className="text-[11px] text-muted-foreground/80 dark:text-white/35 line-clamp-1 font-mono">
            {member.native}
          </p>
        )}
        <p className="text-[10px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30 mt-0.5">
          {member.role}
        </p>
      </div>
    </a>
  );
}
