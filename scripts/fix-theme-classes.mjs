/**
 * Fix duplicate/malformed theme classes after migrate-light-mode.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");

const FIXES = [
  ["dark:hover:bg-accent dark:bg-white/", "dark:bg-white/"],
  ["dark:hover:bg-accent dark:hover:bg-white/", "dark:hover:bg-white/"],
  ["dark:hover:text-foreground dark:text-white", "dark:text-white"],
  ["dark:hover:text-foreground dark:hover:text-white", "dark:hover:text-white"],
  ["hover:text-foreground dark:hover:text-foreground dark:text-white", "hover:text-foreground dark:text-white"],
  ["hover:text-foreground dark:hover:text-foreground dark:hover:text-white", "hover:text-foreground dark:hover:text-white"],
  ["dark:hover:border-border dark:border-white/", "dark:border-white/"],
  ["dark:hover:border-border dark:hover:border-white/", "dark:hover:border-white/"],
  ["placeholder:text-muted-foreground dark:text-white/30", "placeholder:text-muted-foreground dark:placeholder:text-white/30"],
  ["focus:border-border dark:border-white/", "focus:border-primary/40 dark:border-white/"],
  ["focus:bg-muted/60 dark:bg-white/", "focus:bg-accent dark:bg-white/"],
  ["data-[state=active]:border-white data-[state=active]:bg-muted/40 dark:bg-white/4", "data-[state=active]:border-primary data-[state=active]:bg-accent dark:data-[state=active]:border-white dark:data-[state=active]:bg-white/4"],
  ["text-white/28", "text-muted-foreground/70 dark:text-white/28"],
  ["text-white/42", "text-muted-foreground dark:text-white/42"],
  ["text-white/12", "text-muted-foreground/30 dark:text-white/12"],
  ["text-white/10", "text-muted-foreground/25 dark:text-white/10"],
  ["text-white/8", "text-muted-foreground/20 dark:text-white/8"],
  ["bg-white/[0.025]", "bg-muted/30 dark:bg-white/[0.025]"],
  ["bg-white/[0.015]", "bg-muted/20 dark:bg-white/[0.015]"],
  ["bg-white/[0.01]", "bg-muted/10 dark:bg-white/[0.01]"],
  ["border-white/5", "border-border/60 dark:border-white/5"],
  ["border-white/[0.04]", "border-border dark:border-white/[0.04]"],
  ["border-white/18", "border-border dark:border-white/18"],
  ["hover:border-white/18", "hover:border-border dark:hover:border-white/18"],
  ["bg-white/15", "bg-muted dark:bg-white/15"],
  ["border-white/30", "border-border dark:border-white/30"],
  ["bg-white/6", "bg-muted/60 dark:bg-white/6"],
];

function walk(dir, stats) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full, stats);
      continue;
    }
    if (!/\.(tsx|ts|css)$/.test(name)) continue;
    let content = fs.readFileSync(full, "utf8");
    let orig = content;
    for (const [from, to] of FIXES) {
      content = content.split(from).join(to);
    }
    if (content !== orig) {
      fs.writeFileSync(full, content);
      stats.changed++;
      console.log("fixed:", path.relative(ROOT, full));
    }
  }
}

const stats = { changed: 0 };
walk(ROOT, stats);
console.log(`\nFixed ${stats.changed} files.`);
