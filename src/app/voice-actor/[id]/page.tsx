import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/layout/container";
import AniListRichText from "@/components/anime/anilist-rich-text";
import VoiceActorFilmography from "@/components/voice-actor/voice-actor-filmography";
import { ROUTES } from "@/constants/routes";
import { formatVaBirthday, getVoiceActor } from "@/lib/core/voice-actors";
import { ExternalLink, MapPin, Mic, Search, Star } from "lucide-react";

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
      description: `Complete filmography for ${va.name}${va.native ? ` (${va.native})` : ""} — every anime role.`,
    };
  } catch {
    return { title: "Voice Actor | AniKitty" };
  }
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/70 dark:text-white/30">
        {label}
      </dt>
      <dd className="mt-0.5 text-sm text-foreground/85 dark:text-white/75">{value}</dd>
    </div>
  );
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
          href={`${ROUTES.SEARCH}?q=`}
          className="mt-6 inline-flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/15 px-4 py-2 text-sm font-medium text-zinc-100 hover:bg-primary/25"
        >
          <Search className="h-4 w-4" /> Search
        </Link>
      </Container>
    );
  }

  const birthday = formatVaBirthday(va.birthday);
  const metaItems: Array<{ label: string; value: string }> = [];
  if (va.native) metaItems.push({ label: "Japanese name", value: va.native });
  if (birthday) metaItems.push({ label: "Birthday", value: birthday });
  if (va.age != null) metaItems.push({ label: "Age", value: String(va.age) });
  if (va.gender) metaItems.push({ label: "Gender", value: va.gender });
  if (va.home) metaItems.push({ label: "Place of birth", value: va.home });
  if (va.language) metaItems.push({ label: "Language", value: va.language });
  if (va.favourites != null && va.favourites > 0) {
    metaItems.push({ label: "Favourites", value: va.favourites.toLocaleString() });
  }

  return (
    <Container className="mt-16 sm:mt-20 pb-24">
      <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5 sm:gap-6">
        <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl ring-1 ring-primary/25 shadow-xl">
          {va.image ? (
            <Image src={va.image} alt={va.name} fill sizes="128px" className="object-cover" unoptimized />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-primary/10 text-zinc-300">
              <Mic className="h-8 w-8" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left min-w-0">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/10 px-2.5 py-0.5 text-[10px] font-mono uppercase tracking-wide text-zinc-300">
            <Mic className="h-3 w-3" /> Voice Actor
          </span>
          <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-foreground dark:text-white tracking-tight">
            {va.name}
          </h1>
          <div className="mt-2 flex flex-wrap justify-center sm:justify-start gap-x-3 gap-y-1.5 text-sm text-muted-foreground dark:text-white/45">
            {va.native && <span>{va.native}</span>}
            {va.home && (
              <span className="inline-flex items-center gap-1 text-[12px]">
                <MapPin className="h-3 w-3" /> {va.home}
              </span>
            )}
            {va.favourites != null && va.favourites > 0 && (
              <span className="inline-flex items-center gap-1 text-[12px] font-mono">
                <Star className="h-3 w-3" /> {va.favourites.toLocaleString()}
              </span>
            )}
          </div>
          {va.siteUrl && (
            <a
              href={va.siteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-muted-foreground dark:text-white/40 hover:text-foreground dark:hover:text-white/70 transition-colors"
            >
              <ExternalLink className="h-3 w-3" /> AniList profile
            </a>
          )}
        </div>
      </div>

      {metaItems.length > 0 && (
        <dl className="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-4 gap-y-4 max-w-3xl">
          {metaItems.map((item) => (
            <MetaItem key={item.label} label={item.label} value={item.value} />
          ))}
        </dl>
      )}

      {va.description && (
        <AniListRichText
          text={va.description}
          className="mt-6 max-w-3xl text-sm text-muted-foreground dark:text-white/55 leading-7"
        />
      )}

      <h2 className="mt-10 mb-5 text-[11px] font-mono uppercase tracking-widest text-muted-foreground dark:text-white/30">
        Complete Filmography ({va.roles.length})
      </h2>

      <VoiceActorFilmography roles={va.roles} />
    </Container>
  );
}
