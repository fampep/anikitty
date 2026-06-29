/**
 * Reorganize src/ into domain folders and rewrite @/ imports.
 * Run: node scripts/reorganize-src.mjs
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";

const root = path.resolve("src");

const COMPONENT_MOVES = {
  player: [
    "art-kitty-player.tsx",
    "kitsune-player.tsx",
    "player-overlays.tsx",
    "player-skip-button.tsx",
    "provider-select.tsx",
  ],
  watch: [
    "watch-button.tsx",
    "watch-trailer.tsx",
    "watch-episode-bar.tsx",
    "watch-download-panel.tsx",
    "watch-comments-preview.tsx",
    "episode-playlist.tsx",
  ],
  subtitles: [
    "anime-subtitles.tsx",
    "subtitle-settings-panel.tsx",
    "subtitle-library-card.tsx",
    "discover-subtitle-card.tsx",
  ],
  anime: [
    "anime-card.tsx",
    "anime-carousel.tsx",
    "anime-episodes.tsx",
    "anime-media-downloads.tsx",
    "anime-episode-alert-button.tsx",
    "anime-schedule.tsx",
    "lazy-poster-image.tsx",
  ],
  home: [
    "hero-section.tsx",
    "home-welcome-bar.tsx",
    "home-genre-bar.tsx",
    "home-schedule-strip.tsx",
    "continue-watching.tsx",
    "latest-episodes-section.tsx",
    "latest-comments.tsx",
    "anime-sections.tsx",
    "popular-section.tsx",
    "featured-collection.tsx",
    "featured-collection-card.tsx",
    "section-heading.tsx",
  ],
  profile: [
    "profile-account-badges.tsx",
    "profile-badge-pill.tsx",
    "profile-badges-row.tsx",
    "profile-level-badges.tsx",
    "profile-privacy-section.tsx",
    "profile-customization-form.tsx",
    "profile-media-preview.tsx",
    "level-progress-card.tsx",
    "user-badges.tsx",
    "role-badge.tsx",
  ],
  auth: [
    "login-popover-button.tsx",
    "passkeys-section.tsx",
    "two-factor-section.tsx",
    "active-sessions-section.tsx",
    "account-deletion-section.tsx",
    "discord-connect.tsx",
    "anisurge-connect.tsx",
  ],
  layout: [
    "navbar.tsx",
    "navbar-avatar.tsx",
    "footer.tsx",
    "container.tsx",
    "site-beta-badge.tsx",
    "site-announcement-banner.tsx",
    "notification-bell.tsx",
    "search-bar.tsx",
    "language-switcher.tsx",
    "i18n-root.tsx",
    "theme-provider.tsx",
    "user-theme-sync.tsx",
  ],
  comments: ["comment-section.tsx"],
  shared: ["lazy-mount.tsx", "gif-url-panel.tsx"],
};

const LIB_MOVES = {
  auth: [
    "auth-jwt.ts",
    "auth-cookie.ts",
    "auth-response.ts",
    "auth-fetch.ts",
    "local-auth.ts",
    "require-user.ts",
    "admin-auth.ts",
    "staff-auth.ts",
    "webauthn.ts",
    "totp.ts",
    "totp-reactive.ts",
    "passphrase.ts",
  ],
  oauth: [
    "discord-oauth.ts",
    "anilist-oauth.ts",
    "anilist-sync.ts",
    "anilist-import.ts",
    "anilist.ts",
    "anisurge.ts",
  ],
  kitty: [
    "kitty-api.ts",
    "kitty-providers.ts",
    "kitty-stream-fetch.ts",
    "kitty-hls-url.ts",
    "kitty-subs-api.ts",
    "stream-capabilities.ts",
    "hls-config.ts",
    "hls-download.ts",
    "video-player-types.ts",
    "video-download-config.ts",
    "video-download-utils.ts",
    "art-player-skip.ts",
    "fullscreen.ts",
  ],
  providers: [
    "animo-api.ts",
    "animex-api.ts",
    "miruro-api.ts",
    "hianime.ts",
    "anikoto-availability.ts",
  ],
  subtitles: [
    "subtitle-track-utils.ts",
    "subtitle-settings.ts",
    "subtitle-sync-config.ts",
    "subtitle-cache-store.ts",
    "subtitle-library-db.ts",
    "subtitle-library-sync.ts",
    "subtitle-library-enrich.ts",
    "ryuo-subtitles.ts",
    "vtt-parse.ts",
  ],
  user: [
    "public-user.ts",
    "public-profile-access.ts",
    "profile-privacy.ts",
    "user-level.ts",
    "user-xp.ts",
    "account-badges.ts",
    "level-tier-icons.ts",
    "user-sessions.ts",
    "device-label.ts",
    "delete-user.ts",
  ],
  social: [
    "chat.ts",
    "chat-config.ts",
    "chat-sweep.ts",
    "dm.ts",
    "dm-server.ts",
    "forum.ts",
    "comment-helpers.ts",
    "w2g.ts",
    "w2g-server.ts",
    "w2g-code.ts",
  ],
  watch: ["watchlist-response.ts", "episode-alerts.ts", "anime-audio-store.ts"],
  security: [
    "security.ts",
    "anti-scrape.ts",
    "rate-limit.ts",
    "permissions.ts",
    "moderation.ts",
    "message-crypto.ts",
    "data-encryption-key.ts",
  ],
  seo: ["site-seo.ts", "og-card-image.tsx"],
  core: ["utils.ts", "media-url.ts", "theme-color.ts", "home-data.ts", "pocketbase.ts", "api.ts"],
};

const QUERY_MOVES = {
  anime: [
    "get-anime-details.ts",
    "get-all-episodes.ts",
    "get-episode-data.ts",
    "get-episode-servers.ts",
    "get-anime-mappings.ts",
    "get-anime-schedule.ts",
  ],
  stream: [
    "get-kitty-stream.ts",
    "get-stream-capabilities.ts",
    "download-episode-video.ts",
  ],
  subtitles: ["get-anime-subtitles.ts", "get-subtitle-library.ts"],
  home: ["get-home-page-data.ts", "get-banner-anime.ts"],
  search: ["search-anime.ts", "get-search-results.ts"],
};

const APP_COMPONENT_MOVES = [
  ["app/anime/watch/video-player-section.tsx", "components/watch/video-player-section.tsx"],
  ["app/anime/[slug]/anime-detail.tsx", "components/anime/anime-detail.tsx"],
  ["app/search/search-results.tsx", "components/search/search-results.tsx"],
  ["app/messages/messages-content.tsx", "components/messages/messages-content.tsx"],
  ["app/faq/faq-content.tsx", "components/faq/faq-content.tsx"],
];

const PROFILE_COMPONENT_MOVES = [
  ["app/profile/[username]/components/anilist-connect.tsx", "components/profile/anilist-connect.tsx"],
  [
    "app/profile/[username]/components/profile-watchlist.tsx",
    "components/profile/profile-watchlist.tsx",
  ],
  [
    "app/profile/[username]/components/profile-comments.tsx",
    "components/profile/profile-comments.tsx",
  ],
  [
    "app/profile/[username]/components/profile-activity.tsx",
    "components/profile/profile-activity.tsx",
  ],
];

/** @type {{ from: string, to: string }[]} */
const allMoves = [];

function queueMoves(baseDir, movesMap) {
  for (const [folder, files] of Object.entries(movesMap)) {
    for (const file of files) {
      const from = path.join(baseDir, file).replace(/\\/g, "/");
      const to = path.join(baseDir, folder, file).replace(/\\/g, "/");
      allMoves.push({ from, to });
    }
  }
}

queueMoves("components", COMPONENT_MOVES);
queueMoves("lib", LIB_MOVES);
queueMoves("query", QUERY_MOVES);

for (const [from, to] of APP_COMPONENT_MOVES) {
  allMoves.push({ from, to });
}
for (const [from, to] of PROFILE_COMPONENT_MOVES) {
  allMoves.push({ from, to });
}

// use-aniskip belongs in hooks
allMoves.push({ from: "query/use-aniskip.ts", to: "hooks/use-aniskip.ts" });

// mutation folder
allMoves.push({
  from: "mutation/get-anilist-animes.ts",
  to: "query/anilist/get-anilist-animes.ts",
});

function moveFile(fromRel, toRel) {
  const from = path.join(root, "..", fromRel);
  const to = path.join(root, "..", toRel);
  if (!fs.existsSync(from)) {
    console.warn(`skip missing: ${fromRel}`);
    return;
  }
  fs.mkdirSync(path.dirname(to), { recursive: true });
  fs.renameSync(from, to);
  console.log(`moved ${fromRel} -> ${toRel}`);
}

for (const { from, to } of allMoves) {
  moveFile(`src/${from}`, `src/${to}`);
}

/** Build import replacement map: @/old -> @/new (longest first) */
const importReplacements = allMoves
  .map(({ from, to }) => {
    const fromImport = `@/${from.replace(/\.(tsx?)$/, "")}`;
    const toImport = `@/${to.replace(/\.(tsx?)$/, "")}`;
    return { from: fromImport, to: toImport, len: fromImport.length };
  })
  .sort((a, b) => b.len - a.len);

function walk(dir, cb) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name === "node_modules" || ent.name === ".next") continue;
      walk(p, cb);
    } else if (/\.(tsx?|jsx?|mjs)$/.test(ent.name)) {
      cb(p);
    }
  }
}

const srcRoot = path.join(root);
let filesUpdated = 0;

walk(srcRoot, (filePath) => {
  let content = fs.readFileSync(filePath, "utf8");
  let next = content;
  for (const { from, to } of importReplacements) {
    next = next.split(from).join(to);
  }
  if (next !== content) {
    fs.writeFileSync(filePath, next);
    filesUpdated++;
  }
});

console.log(`\nUpdated imports in ${filesUpdated} files.`);

// Fix relative imports within moved lib subfolders - files that imported sibling lib files
// The @/ paths should be enough for most; run build to verify.
