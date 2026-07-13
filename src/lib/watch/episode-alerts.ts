import { getDb } from "@/db";
import { animeEpisodeAlerts, animeAudioAvailability, userNotifications } from "@/db/schema";
import { getAudioAvailability } from "@/lib/providers/anikoto-availability";
import { queryAniList, toTitle } from "@/lib/oauth/anilist";
import { airedCountFromAnilist } from "@/lib/anime/episode-availability";
import { eq, and } from "drizzle-orm";

export type EpisodeAlertPrefs = {
  subscribed: boolean;
  notifySub: boolean;
  notifyDub: boolean;
  anilistId: number;
};

type EpisodeCounts = { sub: number; dub: number };

const ANILIST_META_QUERY = `
  query ($id: Int) {
    Media(id: $id, type: ANIME) {
      id
      idMal
      title { english romaji }
      episodes
      status
      nextAiringEpisode { episode airingAt }
    }
  }
`;

function episodeLabel(fromEp: number, toEp: number): string {
  if (fromEp >= toEp) return `Episode ${toEp}`;
  return `Episodes ${fromEp}–${toEp}`;
}

function watchLink(anilistId: number, episode: number, audio: "sub" | "dub"): string {
  const params = new URLSearchParams({
    anime: String(anilistId),
    episode: `ep-${episode}`,
  });
  if (audio === "dub") params.set("dub", "1");
  return `/anime/watch?${params.toString()}`;
}

function notificationBody(fromEp: number, toEp: number, audio: "sub" | "dub"): string {
  const label = episodeLabel(fromEp, toEp);
  const kind = audio === "dub" ? "Dub" : "Sub";
  return `${label} is now available (${kind})`;
}

async function createEpisodeNotification(opts: {
  userId: string;
  anilistId: number;
  animeTitle: string;
  fromEp: number;
  toEp: number;
  audio: "sub" | "dub";
}) {
  const db = getDb();
  await db.insert(userNotifications).values({
    userId: opts.userId,
    type: "episode",
    title: opts.animeTitle,
    body: notificationBody(opts.fromEp, opts.toEp, opts.audio),
    linkUrl: watchLink(opts.anilistId, opts.toEp, opts.audio),
    referenceType: "anime",
    referenceId: null,
  });
}

export async function processEpisodeCountChange(
  anilistId: number,
  prev: EpisodeCounts | null,
  next: EpisodeCounts,
): Promise<void> {
  const oldSub = prev?.sub ?? 0;
  const oldDub = prev?.dub ?? 0;
  if (next.sub <= oldSub && next.dub <= oldDub) return;

  const db = getDb();
  const alerts = await db
    .select()
    .from(animeEpisodeAlerts)
    .where(eq(animeEpisodeAlerts.anilistId, anilistId));

  if (alerts.length === 0) return;

  for (const alert of alerts) {
    const title = alert.animeTitle ?? "Anime";
    const patch: {
      lastNotifiedSubEpisode?: number;
      lastNotifiedDubEpisode?: number;
      updatedAt: Date;
    } = { updatedAt: new Date() };

    if (alert.notifySub && next.sub > alert.lastNotifiedSubEpisode) {
      const fromEp = Math.max(alert.lastNotifiedSubEpisode + 1, oldSub + 1);
      const toEp = next.sub;
      if (fromEp <= toEp) {
        await createEpisodeNotification({
          userId: alert.userId,
          anilistId,
          animeTitle: title,
          fromEp,
          toEp,
          audio: "sub",
        });
        patch.lastNotifiedSubEpisode = toEp;
      }
    }

    if (alert.notifyDub && next.dub > alert.lastNotifiedDubEpisode) {
      const fromEp = Math.max(alert.lastNotifiedDubEpisode + 1, oldDub + 1);
      const toEp = next.dub;
      if (fromEp <= toEp) {
        await createEpisodeNotification({
          userId: alert.userId,
          anilistId,
          animeTitle: title,
          fromEp,
          toEp,
          audio: "dub",
        });
        patch.lastNotifiedDubEpisode = toEp;
      }
    }

    if (patch.lastNotifiedSubEpisode !== undefined || patch.lastNotifiedDubEpisode !== undefined) {
      await db
        .update(animeEpisodeAlerts)
        .set(patch)
        .where(eq(animeEpisodeAlerts.id, alert.id));
    }
  }
}

async function currentCountsForAnilist(anilistId: number): Promise<EpisodeCounts> {
  const db = getDb();
  const [row] = await db
    .select({
      subCount: animeAudioAvailability.subCount,
      dubCount: animeAudioAvailability.dubCount,
    })
    .from(animeAudioAvailability)
    .where(eq(animeAudioAvailability.anilistId, anilistId))
    .limit(1);

  return { sub: row?.subCount ?? 0, dub: row?.dubCount ?? 0 };
}

export async function getUserEpisodeAlert(
  userId: string,
  anilistId: number,
): Promise<EpisodeAlertPrefs | null> {
  const db = getDb();
  const [row] = await db
    .select({
      notifySub: animeEpisodeAlerts.notifySub,
      notifyDub: animeEpisodeAlerts.notifyDub,
    })
    .from(animeEpisodeAlerts)
    .where(and(eq(animeEpisodeAlerts.userId, userId), eq(animeEpisodeAlerts.anilistId, anilistId)))
    .limit(1);

  if (!row) {
    return { subscribed: false, notifySub: true, notifyDub: false, anilistId };
  }

  return {
    subscribed: true,
    notifySub: row.notifySub,
    notifyDub: row.notifyDub,
    anilistId,
  };
}

export async function upsertEpisodeAlert(opts: {
  userId: string;
  anilistId: number;
  animeTitle?: string | null;
  animeThumbnail?: string | null;
  notifySub: boolean;
  notifyDub: boolean;
  titles?: (string | null | undefined)[];
  fallbackSub?: number;
  status?: string | null;
  malId?: number | null;
}): Promise<EpisodeAlertPrefs> {
  if (!opts.notifySub && !opts.notifyDub) {
    throw new Error("At least one of notifySub or notifyDub must be enabled");
  }

  const db = getDb();
  let counts = await currentCountsForAnilist(opts.anilistId);

  if (counts.sub === 0 && counts.dub === 0 && opts.titles?.length) {
    try {
      const availability = await getAudioAvailability({
        anilistId: opts.anilistId,
        malId: opts.malId,
        titles: opts.titles,
        fallbackSub: opts.fallbackSub ?? 0,
        status: opts.status,
      });
      counts = { sub: availability.sub, dub: availability.dub };
    } catch {
      // keep zero baseline
    }
  }

  const now = new Date();

  await db
    .insert(animeEpisodeAlerts)
    .values({
      userId: opts.userId,
      anilistId: opts.anilistId,
      animeTitle: opts.animeTitle ?? null,
      animeThumbnail: opts.animeThumbnail ?? null,
      notifySub: opts.notifySub,
      notifyDub: opts.notifyDub,
      lastNotifiedSubEpisode: counts.sub,
      lastNotifiedDubEpisode: counts.dub,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [animeEpisodeAlerts.userId, animeEpisodeAlerts.anilistId],
      set: {
        animeTitle: opts.animeTitle ?? null,
        animeThumbnail: opts.animeThumbnail ?? null,
        notifySub: opts.notifySub,
        notifyDub: opts.notifyDub,
        updatedAt: now,
      },
    });

  return {
    subscribed: true,
    notifySub: opts.notifySub,
    notifyDub: opts.notifyDub,
    anilistId: opts.anilistId,
  };
}

export async function removeEpisodeAlert(userId: string, anilistId: number): Promise<void> {
  const db = getDb();
  await db
    .delete(animeEpisodeAlerts)
    .where(and(eq(animeEpisodeAlerts.userId, userId), eq(animeEpisodeAlerts.anilistId, anilistId)));
}

/** Refresh availability for all anime with active alerts (cron / background). */
export async function refreshAllEpisodeAlerts(opts?: { limit?: number }): Promise<{
  checked: number;
  refreshed: number;
}> {
  const limit = opts?.limit ?? 40;
  const db = getDb();

  const rows = await db
    .selectDistinct({ anilistId: animeEpisodeAlerts.anilistId })
    .from(animeEpisodeAlerts)
    .limit(limit);

  let refreshed = 0;

  for (const { anilistId } of rows) {
    try {
      const raw = await queryAniList(ANILIST_META_QUERY, { id: anilistId });
      const m = raw.Media;
      if (!m) continue;

      const fallbackSub = airedCountFromAnilist(m.nextAiringEpisode, {
        status: m.status,
        episodes: m.episodes,
      });

      const [prevRow] = await db
        .select({
          subCount: animeAudioAvailability.subCount,
          dubCount: animeAudioAvailability.dubCount,
        })
        .from(animeAudioAvailability)
        .where(eq(animeAudioAvailability.anilistId, anilistId))
        .limit(1);

      const prev = prevRow
        ? { sub: prevRow.subCount, dub: prevRow.dubCount }
        : null;

      const availability = await getAudioAvailability({
        anilistId,
        malId: m.idMal,
        titles: [toTitle(m.title), m.title?.romaji, m.title?.english],
        fallbackSub,
        status: m.status,
      });

      await processEpisodeCountChange(anilistId, prev, {
        sub: availability.sub,
        dub: availability.dub,
      });
      refreshed++;
    } catch (err) {
      console.error("[episode-alerts] refresh failed for", anilistId, err);
    }
  }

  return { checked: rows.length, refreshed };
}
