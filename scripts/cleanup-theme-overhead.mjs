/**
 * Remove duplicate/corrupt theme classes left by migrate-light-mode.mjs
 */
import fs from "fs";
import path from "path";

const ROOT = path.join(import.meta.dirname, "..", "src");

const REPLACEMENTS = [
  ["dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "dark:text-white"],
  ["dark:text-muted-foreground/25 dark:text-muted-foreground/25 dark:text-white", "dark:text-white"],
  ["dark:text-muted-foreground/70 dark:text-muted-foreground/70 dark:text-white", "dark:text-white"],
  ["hover:text-foreground dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "hover:text-foreground dark:hover:text-white"],
  ["hover:text-foreground dark:text-white/45 hover:text-foreground dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white"],
  ["text-muted-foreground dark:text-white/45 hover:text-foreground dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "text-muted-foreground dark:text-white/45 hover:text-foreground dark:hover:text-white"],
  ["text-foreground dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "text-foreground dark:text-white"],
  ["text-foreground/90 dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "text-foreground/90 dark:text-white"],
  ["text-foreground/85 dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "text-foreground/85 dark:text-white"],
  ["hover:text-foreground/90 dark:text-muted-foreground/20 dark:text-muted-foreground/20 dark:text-white", "hover:text-foreground/90 dark:hover:text-white/80"],
  ["placeholder:text-muted-foreground/80 dark:text-white/25", "placeholder:text-muted-foreground/80 dark:placeholder:text-white/25"],
  ["placeholder:text-muted-foreground/70 dark:text-white/20", "placeholder:text-muted-foreground/70 dark:placeholder:text-white/20"],
  ["dark:bg-muted/60 dark:bg-muted/60 dark:bg-white/", "dark:bg-white/"],
  ["hover:bg-accent dark:bg-white/10 hover:bg-accent dark:bg-white/", "hover:bg-accent dark:hover:bg-white/"],
  ["hover:bg-accent dark:bg-white/8 hover:bg-accent dark:bg-white/", "hover:bg-accent dark:hover:bg-white/"],
  ["dark:hover:bg-accent dark:hover:bg-white/", "dark:hover:bg-white/"],
  ["dark:hover:bg-accent dark:bg-white/", "dark:hover:bg-white/"],
  ["hover:text-foreground dark:text-white hover:bg-accent", "hover:text-foreground dark:hover:text-white hover:bg-accent"],
  ["hover:text-foreground dark:text-white transition", "hover:text-foreground dark:hover:text-white transition"],
  ["hover:text-foreground dark:text-white\"", "hover:text-foreground dark:hover:text-white\""],
  ["group-hover:text-foreground dark:text-white", "group-hover:text-foreground dark:group-hover:text-white"],
  ["hover:text-foreground dark:text-white/", "hover:text-foreground dark:hover:text-white/"],
  ["border-border dark:border-white/15 hover:border-border dark:border-white/", "border-border hover:border-primary/30 dark:border-white/15 dark:hover:border-white/"],
  ["focus:border-primary/40 dark:border-white/", "focus:border-primary/40 dark:focus:border-white/"],
  ["dark:text-white/30 hover:text-muted-foreground dark:text-white/", "dark:text-white/30 hover:text-muted-foreground dark:hover:text-white/"],
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
    const orig = content;
    for (const [from, to] of REPLACEMENTS) {
      content = content.split(from).join(to);
    }
    if (content !== orig) {
      fs.writeFileSync(full, content);
      stats.changed++;
      console.log("cleaned:", path.relative(ROOT, full));
    }
  }
}

const stats = { changed: 0 };
walk(ROOT, stats);
console.log(`\nCleaned ${stats.changed} files.`);
