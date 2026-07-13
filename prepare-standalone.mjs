import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

function copyFile(src, dest) {
  if (!fs.existsSync(src)) return false;
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  return true;
}

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

const scriptsDir = path.join(standaloneDir, "scripts");
const botScripts = ["start-with-bot.mjs", "discord-bot.mjs", "internal-api-url.mjs"];
for (const file of botScripts) {
  const copied = copyFile(path.join(root, "scripts", file), path.join(scriptsDir, file));
  if (!copied) {
    console.warn(`[prepare-standalone] missing scripts/${file}`);
  }
}

// Discord bot runs outside the Next bundle — install runtime deps into standalone.
try {
  execSync("npm install discord.js@^14.26.5 --omit=dev --no-fund --no-audit", {
    cwd: standaloneDir,
    stdio: "inherit",
  });
} catch (e) {
  console.warn("[prepare-standalone] discord.js install failed:", e);
}

rmDir(path.join(root, ".next", "cache"));

const isCiBuild =
  process.env.CI === "true" ||
  Boolean(process.env.COOLIFY_RESOURCE_UUID) ||
  process.env.RAILPACK === "1";

if (isCiBuild) {
  rmDir(path.join(root, "node_modules"));
  console.log("[prepare-standalone] standalone ready; root node_modules removed");
} else {
  console.log("[prepare-standalone] standalone ready");
}
