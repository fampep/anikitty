// Site changelog. Entries are added manually — newest first.
// To add one, prepend a ChangelogEntry to CHANGELOG below.

export type ChangeType = "added" | "improved" | "fixed" | "removed";

export type ChangelogChange = {
  type: ChangeType;
  text: string;
};

export type ChangelogEntry = {
  /** Version or label, e.g. "0.6.0". */
  version: string;
  /** ISO date, e.g. "2026-07-05". */
  date: string;
  /** Optional headline for the release. */
  title?: string;
  changes: ChangelogChange[];
};

export const CHANGE_TYPE_META: Record<ChangeType, { label: string; className: string }> = {
  added: { label: "New", className: "bg-emerald-500/12 text-emerald-300 border-emerald-500/25" },
  improved: { label: "Improved", className: "bg-violet-500/12 text-violet-300 border-violet-500/25" },
  fixed: { label: "Fixed", className: "bg-sky-500/12 text-sky-300 border-sky-500/25" },
  removed: { label: "Removed", className: "bg-rose-500/12 text-rose-300 border-rose-500/25" },
};

// ── Entries (newest first) ───────────────────────────────────────────────────
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "0.6.6",
    date: "2026-07-09",
    title: "Friends, animated avatars & more servers",
    changes: [
      { type: "added", text: "Friends — send a friend request from someone's profile, accept or decline requests, and unfriend anytime. Both of you get notified." },
      { type: "added", text: "Animated GIF avatars and banners — upload a GIF and it stays animated everywhere it shows." },
      { type: "added", text: "Two new streaming servers: Netherlands and Montreal, Canada." },
      { type: "improved", text: "The online counter now counts everyone browsing or watching, instead of only people who scrolled to the footer." },
      { type: "fixed", text: "Uploaded profile pictures and banners failed to save — they now save correctly." },
      { type: "fixed", text: "Servers no longer show as unreachable on the status page while they're actually online." },
      { type: "fixed", text: "The Bulgaria server moved to a new address and works again." },
    ],
  },
  {
    version: "0.6.4",
    date: "2026-07-08",
    title: "GIF search, image uploads & watch history",
    changes: [
      { type: "added", text: "Search GIFs right in comments and chat — a pop-out Giphy picker with trending and search, instead of pasting a link." },
      { type: "added", text: "Upload your avatar and banner: pick an image, drag to reposition and zoom to frame it, and it's saved in high quality — no more pasting URLs." },
      { type: "added", text: "Watch History page — a full, paginated list of everything you've watched, with one-tap resume or rewatch. Find it in the account menu." },
      { type: "added", text: "\"Mark whole series as watched\" button on anime pages — moves it to Completed and syncs to AniList in one tap." },
      { type: "added", text: "Subtitle timing control in Settings — nudge subtitles earlier or later to sync them to the audio." },
      { type: "added", text: "DMCA & copyright page for submitting takedown requests." },
      { type: "improved", text: "Auto-failover: if a stream fails to play, the player now automatically switches to another server instead of getting stuck." },
      { type: "improved", text: "Reduced the dark fade behind the player controls so the video and subtitles stay easy to read." },
      { type: "fixed", text: "Profile picture frames are now round instead of showing a square box." },
    ],
  },
  {
    version: "0.6.1",
    date: "2026-07-07",
    title: "Profile redesign & a new source",
    changes: [
      { type: "improved", text: "Redesigned profile pages — a cleaner header with your avatar, quick action buttons, icon stat tiles, and a full-width level bar, plus a two-column layout with a Quick Stats and Achievements sidebar." },
      { type: "added", text: "New AnimaxAnime streaming source (SUB & DUB) added to the server list." },
      { type: "fixed", text: "The Reviews tab no longer errors on titles that don't have any reviews yet." },
    ],
  },
  {
    version: "0.6.0",
    date: "2026-07-06",
    title: "Reviews, achievements & richer anime pages",
    changes: [
      { type: "added", text: "Rate anime 1–10 and write reviews — every title now has its own community \"AniKitty Score\" and a Reviews tab, with helpful votes and spoiler tags." },
      { type: "added", text: "Achievements: unlock badges for watching, reviewing, commenting, leveling up, and login streaks — shown on your profile." },
      { type: "added", text: "Daily login streaks with bonus Kittycoins every 7 days in a row." },
      { type: "added", text: "Link your MyAnimeList account (official MAL login) in Settings → Connections." },
      { type: "added", text: "Rewatch counter on completed titles, and your personal score now shows on your list cards." },
      { type: "added", text: "Ratings from MyAnimeList, TMDB, Kitsu and IMDb on every anime page." },
      { type: "added", text: "Voice actor pages — search actors, browse their full filmography, and tap any actor on an anime to see their roles." },
      { type: "added", text: "New level tiers all the way to level 200, including prestige ranks above 100 (Legend, Sage, Ascendant, Immortal, Deity)." },
      { type: "added", text: "\"Recently viewed\" row on the home page, plus more content rows to browse." },
      { type: "added", text: "Branded 404 page and a scroll-to-top button." },
      { type: "improved", text: "Shared anime links now unfurl with a branded poster + score card on Discord and social." },
      { type: "improved", text: "Anime synopses and voice-actor bios render properly with spoilers hidden until you tap." },
      { type: "improved", text: "Clickable genres, a clearer \"resume episode\" label, animated tab switches, and a remembered profile list tab." },
      { type: "improved", text: "Faster, smoother home page and a reworked status page; added a Singapore server node." },
      { type: "fixed", text: "Avatars no longer look stretched or squished." },
      { type: "fixed", text: "Autoplay now correctly counts down and advances to the next episode." },
      { type: "fixed", text: "Skip, next-episode, and countdown buttons now show in fullscreen." },
    ],
  },
  {
    version: "0.5.5",
    date: "2026-07-05",
    title: "Social, personalization & player upgrades",
    changes: [
      { type: "added", text: "Personalized \"Recommended for you\" row on the home page, based on what you've watched." },
      { type: "added", text: "Follow other users — followers/following counts and lists on profiles, plus a notification when someone follows you." },
      { type: "added", text: "Block users to hide their comments and stop them messaging or following you (manage the list in Settings → Privacy)." },
      { type: "added", text: "Report comments to moderators with a flag button." },
      { type: "added", text: "Comment upgrades: clickable timestamps that jump the video, @mentions, moderator-pinned comments, and inline ||spoilers||." },
      { type: "added", text: "Quick-add: a \"+\" on anime cards adds a title to your watchlist without opening the page." },
      { type: "added", text: "Notification preferences in Settings to control mention, reply, and follow alerts." },
      { type: "added", text: "Lock-screen media controls on mobile — play/pause, seek, and next episode." },
      { type: "added", text: "\"Best\" comment sort that surfaces genuinely well-received comments." },
      { type: "added", text: "Offline page when your connection drops, and a new Changelog page." },
      { type: "improved", text: "Watch progress now saves reliably, including when you background the app on mobile." },
      { type: "improved", text: "Volume and playback speed are remembered across episodes and sessions." },
      { type: "improved", text: "The notification bell now shows what each alert is at a glance." },
      { type: "improved", text: "Faster comment loading on busy anime, plus better search-engine discovery and general performance." },
      { type: "fixed", text: "The player no longer drops out of fullscreen when moving to the next episode." },
    ],
  },
];
