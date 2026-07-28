export const HOME_SECTION_IDS = [
  "continue",
  "new-episodes",
  "new-upcoming",
  "rankings",
  "recommended",
  "schedule",
  "upcoming",
  "recently-added",
  "completed",
  "seasonal",
  "discovery",
  "because-you-watched",
  "recently-viewed",
  "collections",
  "community-picks",
  "studios",
  "voice-actors",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type HomeLayoutPrefs = {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
  compact: boolean;
};

/** v2: slim default home — invalidates cluttered v1 localStorage layouts. */
const STORAGE_KEY = "kitty:home-layout-v2";

/** Default home: essential rails only. Everything else stays opt-in via Customize. */
export const DEFAULT_VISIBLE_SECTIONS: HomeSectionId[] = [
  "continue",
  "new-episodes",
  "new-upcoming",
  "rankings",
  "recommended",
];

export const DEFAULT_HIDDEN_SECTIONS: HomeSectionId[] = HOME_SECTION_IDS.filter(
  (id) => !DEFAULT_VISIBLE_SECTIONS.includes(id),
);

const DEFAULT_ORDER: HomeSectionId[] = [
  ...DEFAULT_VISIBLE_SECTIONS,
  ...DEFAULT_HIDDEN_SECTIONS,
];

export const DEFAULT_HOME_LAYOUT: HomeLayoutPrefs = {
  order: DEFAULT_ORDER,
  hidden: [...DEFAULT_HIDDEN_SECTIONS],
  compact: false,
};

/** Primary sections shown first in the customize panel. */
export const HOME_PRIMARY_SECTIONS: HomeSectionId[] = [...DEFAULT_VISIBLE_SECTIONS, "schedule"];

function isSectionId(value: unknown): value is HomeSectionId {
  return typeof value === "string" && (HOME_SECTION_IDS as readonly string[]).includes(value);
}

function normalizeOrder(order: HomeSectionId[]): HomeSectionId[] {
  const seen = new Set<HomeSectionId>();
  const next: HomeSectionId[] = [];
  for (const id of order) {
    if (!isSectionId(id) || seen.has(id)) continue;
    seen.add(id);
    next.push(id);
  }
  for (const id of DEFAULT_ORDER) {
    if (!seen.has(id)) next.push(id);
  }
  return next;
}

export function readHomeLayoutPrefs(): HomeLayoutPrefs {
  if (typeof window === "undefined") return DEFAULT_HOME_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<HomeLayoutPrefs>;
    const order = Array.isArray(parsed.order)
      ? normalizeOrder(parsed.order.filter(isSectionId))
      : DEFAULT_ORDER;
    const hidden = Array.isArray(parsed.hidden)
      ? parsed.hidden.filter(isSectionId)
      : [...DEFAULT_HIDDEN_SECTIONS];
    return {
      order,
      hidden,
      compact: Boolean(parsed.compact),
    };
  } catch {
    return DEFAULT_HOME_LAYOUT;
  }
}

export function writeHomeLayoutPrefs(prefs: HomeLayoutPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    window.dispatchEvent(new CustomEvent("anikitty:home-layout"));
  } catch {
    /* ignore quota */
  }
}

export function isHomeSectionVisible(prefs: HomeLayoutPrefs, id: HomeSectionId): boolean {
  return !prefs.hidden.includes(id);
}

export function orderedVisibleSections(prefs: HomeLayoutPrefs): HomeSectionId[] {
  return prefs.order.filter((id) => !prefs.hidden.includes(id));
}

export function isPrimaryHomeSection(id: HomeSectionId): boolean {
  return HOME_PRIMARY_SECTIONS.includes(id);
}
