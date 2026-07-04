/**
 * One-time migration: replace hardcoded dark-only Tailwind classes with theme-aware pairs.
 * Run: node scripts/migrate-light-mode.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");

/** Files that should keep dark styling (video overlays, etc.) */
const SKIP_FILES = new Set([
  "kitty-player.tsx",
  "kitsune-player.tsx",
  "player-overlays.tsx",
  "player-skip-button.tsx",
]);

/** Longest-first replacements */
const REPLACEMENTS = [
  // Backgrounds (hex)
  ["bg-[#0c0c14]/95", "bg-popover/95 dark:bg-[#0c0c14]/95"],
  ["bg-[#0c0c14]", "bg-popover dark:bg-[#0c0c14]"],
  ["bg-[#050508]/98", "bg-background/98 dark:bg-[#050508]/98"],
  ["bg-[#050508]", "bg-background dark:bg-[#050508]"],
  ["bg-[#08080f]/88", "bg-background/90 dark:bg-[#08080f]/88"],
  ["bg-[#0a0a10]/95", "bg-popover/95 dark:bg-[#0a0a10]/95"],
  ["bg-[#0a0a12]/80", "bg-background/85 dark:bg-[#0a0a12]/80"],
  ["bg-black/30", "bg-muted dark:bg-black/30"],
  ["bg-black/25", "bg-muted dark:bg-black/25"],
  ["bg-black/50", "bg-muted/80 dark:bg-black/50"],

  // Backgrounds (white alpha) — bracket forms first
  ["bg-white/[0.09]", "bg-accent dark:bg-white/[0.09]"],
  ["bg-white/[0.08]", "bg-accent dark:bg-white/[0.08]"],
  ["bg-white/[0.07]", "bg-accent dark:bg-white/[0.07]"],
  ["bg-white/[0.06]", "bg-accent dark:bg-white/[0.06]"],
  ["bg-white/[0.05]", "bg-muted/60 dark:bg-white/[0.05]"],
  ["bg-white/[0.045]", "bg-muted/50 dark:bg-white/[0.045]"],
  ["bg-white/[0.04]", "bg-muted/50 dark:bg-white/[0.04]"],
  ["bg-white/[0.035]", "bg-muted/40 dark:bg-white/[0.035]"],
  ["bg-white/[0.03]", "bg-muted/40 dark:bg-white/[0.03]"],
  ["bg-white/[0.02]", "bg-muted/30 dark:bg-white/[0.02]"],
  ["bg-white/12", "bg-accent dark:bg-white/12"],
  ["bg-white/10", "bg-accent dark:bg-white/10"],
  ["bg-white/8", "bg-accent dark:bg-white/8"],
  ["bg-white/5", "bg-muted/50 dark:bg-white/5"],
  ["bg-white/4", "bg-muted/40 dark:bg-white/4"],
  ["bg-white/3", "bg-muted/30 dark:bg-white/3"],

  // Hover backgrounds
  ["hover:bg-white/[0.09]", "hover:bg-accent dark:hover:bg-white/[0.09]"],
  ["hover:bg-white/[0.08]", "hover:bg-accent dark:hover:bg-white/[0.08]"],
  ["hover:bg-white/[0.07]", "hover:bg-accent dark:hover:bg-white/[0.07]"],
  ["hover:bg-white/[0.06]", "hover:bg-accent dark:hover:bg-white/[0.06]"],
  ["hover:bg-white/[0.05]", "hover:bg-accent dark:hover:bg-white/[0.05]"],
  ["hover:bg-white/10", "hover:bg-accent dark:hover:bg-white/10"],
  ["hover:bg-white/8", "hover:bg-accent dark:hover:bg-white/8"],

  // Borders — bracket forms first
  ["border-white/[0.14]", "border-border dark:border-white/[0.14]"],
  ["border-white/[0.12]", "border-border dark:border-white/[0.12]"],
  ["border-white/[0.10]", "border-border dark:border-white/[0.10]"],
  ["border-white/[0.08]", "border-border dark:border-white/[0.08]"],
  ["border-white/[0.06]", "border-border dark:border-white/[0.06]"],
  ["border-white/[0.1]", "border-border dark:border-white/[0.1]"],
  ["border-white/25", "border-border dark:border-white/25"],
  ["border-white/20", "border-border dark:border-white/20"],
  ["border-white/15", "border-border dark:border-white/15"],
  ["border-white/14", "border-border dark:border-white/14"],
  ["border-white/12", "border-border dark:border-white/12"],
  ["border-white/10", "border-border dark:border-white/10"],
  ["border-white/8", "border-border dark:border-white/8"],
  ["border-white/6", "border-border dark:border-white/6"],

  // Hover borders
  ["hover:border-white/25", "hover:border-border dark:hover:border-white/25"],
  ["hover:border-white/20", "hover:border-border dark:hover:border-white/20"],
  ["hover:border-white/15", "hover:border-border dark:hover:border-white/15"],
  ["hover:border-white/14", "hover:border-border dark:hover:border-white/14"],
  ["hover:border-white/12", "hover:border-border dark:hover:border-white/12"],
  ["hover:border-white/10", "hover:border-border dark:hover:border-white/10"],
  ["hover:border-white/8", "hover:border-border dark:hover:border-white/8"],
  ["hover:border-white/[0.15]", "hover:border-border dark:hover:border-white/[0.15]"],
  ["hover:border-white/[0.08]", "hover:border-border dark:hover:border-white/[0.08]"],
  ["hover:border-white/[0.06]", "hover:border-border dark:hover:border-white/[0.06]"],

  // Ring
  ["ring-white/20", "ring-border dark:ring-white/20"],
  ["ring-white/10", "ring-border dark:ring-white/10"],

  // Text — most specific opacity first
  ["text-white/95", "text-foreground dark:text-white/95"],
  ["text-white/90", "text-foreground dark:text-white/90"],
  ["text-white/85", "text-foreground dark:text-white/85"],
  ["text-white/80", "text-foreground/90 dark:text-white/80"],
  ["text-white/75", "text-foreground/85 dark:text-white/75"],
  ["text-white/70", "text-muted-foreground dark:text-white/70"],
  ["text-white/65", "text-muted-foreground dark:text-white/65"],
  ["text-white/60", "text-muted-foreground dark:text-white/60"],
  ["text-white/55", "text-muted-foreground dark:text-white/55"],
  ["text-white/50", "text-muted-foreground dark:text-white/50"],
  ["text-white/45", "text-muted-foreground dark:text-white/45"],
  ["text-white/40", "text-muted-foreground dark:text-white/40"],
  ["text-white/35", "text-muted-foreground dark:text-white/35"],
  ["text-white/30", "text-muted-foreground dark:text-white/30"],
  ["text-white/25", "text-muted-foreground/80 dark:text-white/25"],
  ["text-white/20", "text-muted-foreground/70 dark:text-white/20"],
  ["text-white/18", "text-muted-foreground/60 dark:text-white/18"],
  ["text-white/15", "text-muted-foreground/50 dark:text-white/15"],

  // Hover text
  ["hover:text-white/95", "hover:text-foreground dark:hover:text-white/95"],
  ["hover:text-white/80", "hover:text-foreground dark:hover:text-white/80"],
  ["hover:text-white/70", "hover:text-foreground dark:hover:text-white/70"],
  ["hover:text-white/65", "hover:text-foreground dark:hover:text-white/65"],
  ["hover:text-white/55", "hover:text-foreground dark:hover:text-white/55"],
  ["hover:text-white", "hover:text-foreground dark:hover:text-white"],

  // Gradients
  ["from-black/80", "from-background/95 dark:from-black/80"],
  ["via-black/40", "via-background/50 dark:via-black/40"],
  ["from-black/60", "from-background/90 dark:from-black/60"],

  // Focus
  ["focus-visible:bg-white/[0.08]", "focus-visible:bg-accent dark:focus-visible:bg-white/[0.08]"],
  ["focus-visible:border-violet-400/50", "focus-visible:border-primary/50"],
];

/** Standalone text-white (not followed by /) on common UI patterns */
const TEXT_WHITE_PATTERNS = [
  [/(\s)text-white(\s)/g, "$1text-foreground dark:text-white$2"],
  [/(\s)text-white"/g, '$1text-foreground dark:text-white"'],
  [/(\s)text-white'/g, "$1text-foreground dark:text-white'"],
];

function shouldSkipToken(content, index, token) {
  // Skip if already part of a dark: pair for this token
  const before = content.slice(Math.max(0, index - 6), index);
  if (before.endsWith("dark:")) return true;
  // Skip if replacement already applied adjacent
  const after = content.slice(index, index + token.length + 30);
  if (after.includes(`dark:${token}`)) return true;
  return false;
}

function migrateContent(content) {
  let out = content;
  for (const [from, to] of REPLACEMENTS) {
    let idx = 0;
    while ((idx = out.indexOf(from, idx)) !== -1) {
      if (shouldSkipToken(out, idx, from)) {
        idx += from.length;
        continue;
      }
      out = out.slice(0, idx) + to + out.slice(idx + from.length);
      idx += to.length;
    }
  }

  // text-white on headings — skip when on colored buttons (text-white after bg-violet/bg-primary)
  for (const re of TEXT_WHITE_PATTERNS) {
    out = out.replace(re, (match, ...args) => {
      // Don't replace text-white on brand/colored buttons
      const full = match;
      if (/bg-(?:violet|primary|amber|emerald|destructive|gradient)/.test(full)) return match;
      return match;
    });
  }

  // Safer standalone text-white: only in className contexts without bg-violet nearby
  out = out.replace(
    /className=\{cn\(([\s\S]*?)\)\}/g,
    (block) => {
      if (/bg-violet|bg-primary|bg-gradient|text-primary-foreground|site-brand-btn/.test(block)) {
        return block;
      }
      return block
        .replace(/\btext-white\b(?![\[/])/g, "text-foreground dark:text-white");
    },
  );

  out = out.replace(
    /className="([^"]*)"/g,
    (full, classes) => {
      if (/bg-violet|bg-primary|from-violet|site-brand-btn|text-primary-foreground/.test(classes)) {
        return full;
      }
      const updated = classes.replace(/\btext-white\b(?![\[/])/g, "text-foreground dark:text-white");
      return updated === classes ? full : `className="${updated}"`;
    },
  );

  return out;
}

function walk(dir, stats) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      walk(full, stats);
      continue;
    }
    if (!/\.(tsx|ts|jsx|js)$/.test(name)) continue;
    if (SKIP_FILES.has(name)) {
      stats.skipped++;
      continue;
    }
    const original = fs.readFileSync(full, "utf8");
    const migrated = migrateContent(original);
    if (migrated !== original) {
      fs.writeFileSync(full, migrated);
      stats.changed++;
      console.log("updated:", path.relative(ROOT, full));
    }
  }
}

const stats = { changed: 0, skipped: 0 };
walk(ROOT, stats);
console.log(`\nDone: ${stats.changed} files updated, ${stats.skipped} skipped.`);
