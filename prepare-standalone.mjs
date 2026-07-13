import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");

const botScripts = ["start-with-bot.mjs", "discord-bot.mjs", "internal-api-url.mjs"];

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

function safeRmDir(target) {
  if (!fs.existsSync(target)) return;
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (e) {
    console.warn(`[prepare-standalone] could not remove ${target}:`, e?.message ?? e);
  }
}

/** Railpack copies bot scripts to /app/*.mjs; repo + Docker use scripts/*.mjs */
function resolveScriptSource(file) {
  const candidates = [
    path.join(root, "scripts", file),
    path.join(root, file),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

if (!fs.existsSync(standaloneDir)) {
  console.warn("[prepare-standalone] .next/standalone missing — skip (dev build?)");
  process.exit(0);
}

copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));

const standaloneScriptsDir = path.join(standaloneDir, "scripts");
const rootScriptsDir = path.join(root, "scripts");

for (const file of botScripts) {
  const src = resolveScriptSource(file);
  if (!src) {
    console.warn(`[prepare-standalone] missing ${file}`);
    continue;
  }
  copyFile(src, path.join(standaloneScriptsDir, file));
  // Railpack runtime starts `node scripts/start-with-bot.mjs` from /app.
  copyFile(src, path.join(rootScriptsDir, file));
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

// Railpack mounts .next/cache — deletion fails with EBUSY; best-effort only.
safeRmDir(path.join(root, ".next", "cache"));

// Docker runner copies only standalone; Railpack deploys the full app tree.
if (process.env.STANDALONE_ONLY_BUILD === "1") {
  safeRmDir(path.join(root, "node_modules"));
  console.log("[prepare-standalone] standalone ready; root node_modules removed");
} else {
  console.log("[prepare-standalone] standalone ready");
}
