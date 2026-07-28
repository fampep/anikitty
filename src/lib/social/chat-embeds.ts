/** Shared AniKitty URL patterns for chat link embeds. */

export type ChatEmbedKind =
  | "anime"
  | "watch"
  | "profile"
  | "voiceActor"
  | "list"
  | "character";

export type ChatEmbedRef = {
  kind: ChatEmbedKind;
  id: string;
  href: string;
  label?: string;
};

const PATH_RULES: Array<{
  kind: ChatEmbedKind;
  re: RegExp;
  id: (m: RegExpMatchArray) => string;
  label?: (m: RegExpMatchArray) => string | undefined;
}> = [
  {
    kind: "watch",
    re: /^\/anime\/watch\/([^/?#]+)/i,
    id: (m) => decodeURIComponent(m[1]),
  },
  {
    kind: "anime",
    re: /^\/anime\/(\d+)(?:\/|$)/i,
    id: (m) => m[1],
  },
  {
    kind: "profile",
    re: /^\/profile\/([^/?#]+)/i,
    id: (m) => decodeURIComponent(m[1]),
    label: (m) => decodeURIComponent(m[1]),
  },
  {
    kind: "voiceActor",
    re: /^\/voice-actors?\/([^/?#]+)/i,
    id: (m) => decodeURIComponent(m[1]),
  },
  {
    kind: "character",
    re: /^\/character\/([^/?#]+)/i,
    id: (m) => decodeURIComponent(m[1]),
  },
  {
    kind: "list",
    re: /^\/(?:history|watchlist)(?:\/|$)/i,
    id: () => "list",
  },
];

function pathFromUrl(raw: string): string | null {
  try {
    if (raw.startsWith("/")) return raw.split(/[?#]/)[0];
    const u = new URL(raw);
    if (typeof window !== "undefined" && u.origin === window.location.origin) {
      return u.pathname;
    }
    // Relative-looking absolute paths on known hosts still work when pasted
    // without origin during SSR/embed parse of message text.
    if (/anikitty/i.test(u.hostname) || u.hostname === "localhost") {
      return u.pathname;
    }
    return null;
  } catch {
    return null;
  }
}

export function parseChatEmbed(url: string): ChatEmbedRef | null {
  const path = pathFromUrl(url);
  if (!path) return null;
  for (const rule of PATH_RULES) {
    const m = path.match(rule.re);
    if (!m) continue;
    return {
      kind: rule.kind,
      id: rule.id(m),
      href: path.startsWith("/") ? path : `/${path}`,
      label: rule.label?.(m),
    };
  }
  return null;
}

const URL_IN_TEXT = /(https?:\/\/[^\s<]+[^\s<.,;:!?)}\]'"]|\/(?:anime|profile|voice-actors?|character|history|watchlist)\/[^\s<]*)/gi;

/** First embeddable AniKitty link in a message body. */
export function findChatEmbedInText(text: string): ChatEmbedRef | null {
  const re = new RegExp(URL_IN_TEXT.source, "gi");
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const ref = parseChatEmbed(match[0]);
    if (ref) return ref;
  }
  return null;
}

export type ChatEmbedData = {
  title: string;
  description?: string | null;
  image?: string | null;
  rating?: number | null;
  subtitle?: string | null;
  href: string;
  kind: ChatEmbedKind;
};

export async function fetchChatEmbed(ref: ChatEmbedRef): Promise<ChatEmbedData | null> {
  try {
    if (ref.kind === "anime" || ref.kind === "watch") {
      const res = await fetch(`/api/anime/${encodeURIComponent(ref.id)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const info = data?.anime?.info ?? {};
      const title =
        info.name || info.romaji || info.english || info.native || `Anime #${ref.id}`;
      const description =
        typeof info.description === "string"
          ? info.description.replace(/<[^>]+>/g, "").slice(0, 160)
          : null;
      const image = info.poster || info.coverImage || null;
      const rating =
        typeof info.rating === "number"
          ? info.rating
          : typeof info.malscore === "number"
            ? info.malscore
            : null;
      return {
        kind: ref.kind,
        href: ref.kind === "watch" ? `/anime/watch/${ref.id}` : `/anime/${ref.id}`,
        title: String(title),
        description,
        image: image ? String(image) : null,
        rating: rating != null ? Number(rating) : null,
        subtitle: info.stats?.rating || info.type || null,
      };
    }

    if (ref.kind === "profile") {
      const res = await fetch(`/api/users/${encodeURIComponent(ref.id)}`);
      if (!res.ok) return null;
      const data = await res.json();
      const user = data?.user ?? {};
      return {
        kind: "profile",
        href: `/profile/${encodeURIComponent(user.username ?? ref.id)}`,
        title: `@${user.username ?? ref.id}`,
        description: typeof user.bio === "string" ? user.bio.slice(0, 160) : null,
        image: user.avatarUrl ?? null,
        rating: null,
        subtitle: user.role ? String(user.role) : null,
      };
    }

    if (ref.kind === "voiceActor") {
      const res = await fetch(`/api/voice-actor/${encodeURIComponent(ref.id)}`);
      if (!res.ok) return null;
      const json = await res.json();
      const va = json?.data ?? json?.voiceActor ?? json ?? {};
      return {
        kind: "voiceActor",
        href: `/voice-actor/${encodeURIComponent(ref.id)}`,
        title: String(va.name ?? va.fullName ?? `VA #${ref.id}`),
        description: typeof va.description === "string" ? va.description.slice(0, 160) : null,
        image: va.image ?? va.imageUrl ?? va.avatarUrl ?? null,
        rating: null,
        subtitle: va.language ? String(va.language) : null,
      };
    }

    if (ref.kind === "list") {
      return {
        kind: "list",
        href: ref.href,
        title: "Watch list",
        description: "Open this AniKitty list",
        image: null,
        rating: null,
        subtitle: null,
      };
    }

    if (ref.kind === "character") {
      return {
        kind: "character",
        href: ref.href,
        title: ref.label || `Character ${ref.id}`,
        description: null,
        image: null,
        rating: null,
        subtitle: "Character",
      };
    }
  } catch {
    return null;
  }
  return null;
}
