import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/container";
import AnimeCard from "@/components/anime/anime-card";
import AniListRichText from "@/components/anime/anilist-rich-text";
import { ROUTES } from "@/constants/routes";
import { getVoiceActor } from "@/lib/core/voice-actors";
import { Mic, Search } from "lucide-react";

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const numId = parseInt(id, 10);
  if (Number.isNaN(numId)) return { title: "Voice Actor | AniKitty" };
  try {
    const va = await getVoiceActor(numId);
    if (!va) return { title: "Voice Actor | AniKitty" };
    return {
      title: `${va.name} — Voice Actor | AniKitty`,
      description: `Anime roles voiced by ${va.name}${va.native ? ` (${va.native})` : ""}.`,
    };
  } catch {
    return { title: "Voice Actor | AniKitty" };
  }
}

export default async function VoiceActorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const numId = parseInt(id, 10);

  let va = null;
  let failed = false;
  try {
    va = Number.isNaN(numId) ? null : await getVoiceActor(numId);
  } catch {
    failed = true;
  }

  if (!va) {
    return (
      <Container className="mt-20 pb-24 max-w-3xl text-center">
        <Mic className="mx-auto h-10 w-10 text-muted-foreground/40" />
        <h1 className="mt-4 text-xl font-bold text-foreground dark:text-white">
          {failed ? "Couldn't load this voice actor" : "Voice actor not found"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground dark:text-white/45">
          {failed ? "Please try again in a moment." : "We don't have data for this person."}
        </p>
        <Link
          href={ROUTES.VOICE_ACTORS}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-violet-500/30 bg-violet-500/15 px-4 py-2 text-sm font-medium text-violet-100 hover:bg-violet-500/25"
        >
          <Search className="h-4 w-4" /> Search voice actors
        </Link>
      </Container>
    );
  }

  return (
    <Container className="mt-16 sm:mt-20 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-violet-400/25 shadow-xl">
          {va.image ? (
            <Image src={va.image} alt={va.name} fill sizes="128px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-violet-500/10 text-violet-300">
              <Mic className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-violet-300">
            <Mic className="h-3 w-3" /> Voice Actor
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight">{va.name}</h1>
          <div className="mt-1 flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1 text-sm text-muted-foreground dark:text-white/45">
            {va.native && <span>{va.native}</span>}
            {va.language && <span className="font-mono text-[12px]">{va.language}</span>}
            {va.home && <span className="text-[12px]">· {va.home}</span>}
          </div>
        </div>
      </div>

      {va.description && (
        <AniListRichText
          text={va.description}
          className="mt-6 max-w-3xl text-sm text-muted-foreground dark:text-white/55 leading-7"
        />
      )}

      {/* Roles */}
      <h2 className="mt-10 mb-5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30">
        Anime roles ({va.roles.length})
      </h2>

      {va.roles.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground dark:text-white/35 font-mono">
          No anime roles found.
        </p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-4">
          {va.roles.map((r) => (
            <div key={`${r.anime.id}-${r.character?.id ?? ""}`} className="flex flex-col gap-1.5">
              <AnimeCard
                title={r.anime.name}
                poster={r.anime.poster}
                href={`${ROUTES.ANIME_DETAILS}/${r.anime.id}`}
                displayDetails={false}
                variant="sm"
              />
              {r.character && (
                <div className="px-0.5">
                  <p className="text-[11px] font-medium text-foreground/85 dark:text-white/70 line-clamp-1">
                    {r.character.name}
                  </p>
                  <p className="text-[9px] font-mono uppercase tracking-wide text-muted-foreground/70 dark:text-white/30">
                    {r.role ?? "Cast"}{r.anime.year ? ` · ${r.anime.year}` : ""}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
