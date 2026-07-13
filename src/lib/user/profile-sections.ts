/** Which blocks appear on a user's public profile page. All default to visible. */

export const PROFILE_SECTION_KEYS = [
  "headerBio",
  "continueWatching",
  "about",
  "watchlist",
  "activity",
  "libraryStats",
  "achievements",
  "skipContributions",
] as const;

export type ProfileSectionKey = (typeof PROFILE_SECTION_KEYS)[number];

export type ProfileSectionVisibility = Record<ProfileSectionKey, boolean>;

export const DEFAULT_PROFILE_SECTIONS: ProfileSectionVisibility = {
  headerBio: true,
  continueWatching: true,
  about: true,
  watchlist: true,
  activity: true,
  libraryStats: true,
  achievements: true,
  skipContributions: true,
};

export function sanitizeProfileSectionVisibility(raw: unknown): ProfileSectionVisibility {
  const out = { ...DEFAULT_PROFILE_SECTIONS };
  if (!raw || typeof raw !== "object") return out;
  for (const key of PROFILE_SECTION_KEYS) {
    const value = (raw as Record<string, unknown>)[key];
    if (typeof value === "boolean") out[key] = value;
  }
  return out;
}

export function readProfileSectionsFromPreferences(
  preferences: unknown,
): ProfileSectionVisibility {
  if (!preferences || typeof preferences !== "object") {
    return { ...DEFAULT_PROFILE_SECTIONS };
  }
  return sanitizeProfileSectionVisibility(
    (preferences as Record<string, unknown>).profileSections,
  );
}

export function isProfileSectionVisible(
  sections: ProfileSectionVisibility | undefined,
  key: ProfileSectionKey,
): boolean {
  return sections?.[key] !== false;
}
