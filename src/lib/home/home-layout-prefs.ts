export const HOME_SECTION_IDS = [
  "continue",
  "trending",
  "new-episodes",
  "seasonal",
  "recently-added",
  "recommended",
  "because-you-watched",
  "recently-viewed",
  "collections",
  "community-picks",
  "upcoming",
  "studios",
  "voice-actors",
  "schedule",
  "completed",
] as const;

export type HomeSectionId = (typeof HOME_SECTION_IDS)[number];

export type HomeLayoutPrefs = {
  order: HomeSectionId[];
  hidden: HomeSectionId[];
  compact: boolean;
};

const STORAGE_KEY = "kitty:home-layout";

const DEFAULT_ORDER: HomeSectionId[] = [...HOME_SECTION_IDS];

export const DEFAULT_HOME_LAYOUT: HomeLayoutPrefs = {
  order: DEFAULT_ORDER,
  hidden: [],
  compact: false,
};

function isSectionId(value: unknown): value is HomeSectionId {
  return typeof value === "string" && (HOME_SECTION_IDS as readonly string[]).includes(value);
}

export function readHomeLayoutPrefs(): HomeLayoutPrefs {
  if (typeof window === "undefined") return DEFAULT_HOME_LAYOUT;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_HOME_LAYOUT;
    const parsed = JSON.parse(raw) as Partial<HomeLayoutPrefs>;
    const order = Array.isArray(parsed.order)
      ? ([...parsed.order.filter(isSectionId), ...DEFAULT_ORDER.filter((id) => !parsed.order?.includes(id))] as HomeSectionId[])
      : DEFAULT_ORDER;
    const hidden = Array.isArray(parsed.hidden) ? parsed.hidden.filter(isSectionId) : [];
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
