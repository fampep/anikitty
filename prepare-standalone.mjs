import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function rmDir(target) {
  if (!fs.existsSync(target)) return;
  fs.rmSync(target, { recursive: true, force: true });
}

if (!fs.existsSync(standaloneDir)) {
  console.warn("[prepare-standalone] .next/standalone missing — skip (dev build?)");
  process.exit(0);
}

copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));
copyDir(path.join(root, "scripts"), path.join(standaloneDir, "scripts"));

// Shrink deploy artifacts — safe after standalone bundle is written.
rmDir(path.join(root, ".next", "cache"));

const isCiBuild =
  process.env.CI === "true" ||
  Boolean(process.env.COOLIFY_RESOURCE_UUID) ||
  process.env.RAILPACK === "1";

// Discord bot runs from scripts/ in the standalone bundle — needs discord.js at runtime.
try {
  execSync("npm install discord.js@^14.26.5 --omit=dev --no-fund --no-audit", {
    cwd: standaloneDir,
    stdio: "inherit",
  });
} catch (e) {
  console.warn("[prepare-standalone] discord.js install failed:", e);
}

if (isCiBuild) {
  rmDir(path.join(root, "node_modules"));
  console.log("[prepare-standalone] standalone ready; root node_modules removed");
} else {
  console.log("[prepare-standalone] standalone ready");
}
