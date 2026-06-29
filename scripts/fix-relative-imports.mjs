import fs from "fs";
import path from "path";

const src = path.resolve("src");

const APP_IMPORT_FIXES = [
  ["src/app/messages/page.tsx", './messages-content', '@/components/messages/messages-content'],
  ["src/app/anime/watch/page.tsx", './video-player-section', '@/components/watch/video-player-section'],
  ["src/app/search/page.tsx", './search-results', '@/components/search/search-results'],
  ["src/app/anime/[slug]/page.tsx", './anime-detail', '@/components/anime/anime-detail'],
  ["src/app/faq/page.tsx", './faq-content', '@/components/faq/faq-content'],
];

const DOMAIN_FOLDERS = new Set([
  "anime", "auth", "comments", "home", "layout", "player", "profile",
  "shared", "subtitles", "watch", "search", "messages", "faq",
]);

function fixDomainImports(content, folder) {
  let c = content;

  if (folder !== "ui" && folder !== "common") {
    c = c.replaceAll('from "./ui/', 'from "@/components/ui/');
    c = c.replaceAll("from './ui/", "from '@/components/ui/");
    c = c.replaceAll('from "./common/', 'from "@/components/common/');
    c = c.replaceAll("from './common/", "from '@/components/common/");
  }

  if (folder !== "layout") {
    c = c.replaceAll('from "./container"', 'from "@/components/layout/container"');
    c = c.replaceAll("from './container'", "from '@/components/layout/container'");
  }

  const crossFolder = {
    home: {
      './anime-card"': '@/components/anime/anime-card"',
      "./anime-card'": "@/components/anime/anime-card'",
      './level-progress-card"': '@/components/profile/level-progress-card"',
      './user-badges"': '@/components/profile/user-badges"',
      './login-popover-button"': '@/components/auth/login-popover-button"',
    },
    layout: {
      './login-popover-button"': '@/components/auth/login-popover-button"',
      './ui/': '@/components/ui/',
    },
    watch: {},
    anime: {},
    auth: {},
    profile: {},
    continue_watching: {},
  };

  if (folder === "home") {
    for (const [from, to] of Object.entries(crossFolder.home)) {
      c = c.replaceAll(`from "${from.slice(0, -1)}"`, `from "${to.slice(0, -1)}"`);
      // simpler approach below
    }
    c = c.replaceAll('from "./anime-card"', 'from "@/components/anime/anime-card"');
    c = c.replaceAll('from "./level-progress-card"', 'from "@/components/profile/level-progress-card"');
    c = c.replaceAll('from "./user-badges"', 'from "@/components/profile/user-badges"');
    c = c.replaceAll('from "./login-popover-button"', 'from "@/components/auth/login-popover-button"');
  }

  if (folder === "layout") {
    c = c.replaceAll('from "./login-popover-button"', 'from "@/components/auth/login-popover-button"');
  }

  return c;
}

for (const [file, from, to] of APP_IMPORT_FIXES) {
  const p = path.join(src, "..", file);
  if (!fs.existsSync(p)) continue;
  let c = fs.readFileSync(p, "utf8");
  const next = c.replaceAll(from, to);
  if (next !== c) {
    fs.writeFileSync(p, next);
    console.log(`fixed app import: ${file}`);
  }
}

const componentsRoot = path.join(src, "components");
for (const folder of fs.readdirSync(componentsRoot)) {
  if (!DOMAIN_FOLDERS.has(folder)) continue;
  const dir = path.join(componentsRoot, folder);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const file of fs.readdirSync(dir)) {
    if (!/\.tsx?$/.test(file)) continue;
    const p = path.join(dir, file);
    const content = fs.readFileSync(p, "utf8");
    const next = fixDomainImports(content, folder);
    if (next !== content) {
      fs.writeFileSync(p, next);
      console.log(`fixed ${folder}/${file}`);
    }
  }
}

// Deep scan: any remaining ./ui/ or ./common/ in components subfolders
function walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p);
    else if (/\.tsx?$/.test(ent.name)) {
      let c = fs.readFileSync(p, "utf8");
      const rel = path.relative(componentsRoot, p).replace(/\\/g, "/");
      const top = rel.split("/")[0];
      if (!DOMAIN_FOLDERS.has(top) && top !== "forum" && top !== "w2g" && top !== "community") continue;
      if (top === "ui" || top === "common") continue;
      let next = c;
      next = next.replaceAll('from "./ui/', 'from "@/components/ui/');
      next = next.replaceAll('from "./common/', 'from "@/components/common/');
      if (top !== "layout") {
        next = next.replaceAll('from "./container"', 'from "@/components/layout/container"');
      }
      if (next !== c) {
        fs.writeFileSync(p, next);
        console.log(`deep fixed ${rel}`);
      }
    }
  }
}
walk(componentsRoot);

// Fix profile page imports for anilist-connect
const profilePage = path.join(src, "app/profile/[username]/page.tsx");
if (fs.existsSync(profilePage)) {
  let c = fs.readFileSync(profilePage, "utf8");
  let next = c.replace(
    '@/app/profile/[username]/components/anilist-connect',
    '@/components/profile/anilist-connect',
  );
  if (next !== c) {
    fs.writeFileSync(profilePage, next);
    console.log("fixed profile page anilist-connect import");
  }
}

console.log("done");
