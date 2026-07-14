import fs from "node:fs";
import path from "node:path";

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

function safeRmDir(target) {
  if (!fs.existsSync(target)) return;
  try {
    fs.rmSync(target, { recursive: true, force: true });
  } catch (e) {
    console.warn(`[prepare-standalone] could not remove ${target}:`, e?.message ?? e);
  }
}

if (!fs.existsSync(standaloneDir)) {
  console.warn("[prepare-standalone] .next/standalone missing — skip (dev build?)");
  process.exit(0);
}

copyDir(path.join(root, "public"), path.join(standaloneDir, "public"));
copyDir(path.join(root, ".next", "static"), path.join(standaloneDir, ".next", "static"));

// Railpack mounts .next/cache — deletion fails with EBUSY; best-effort only.
safeRmDir(path.join(root, ".next", "cache"));

// Docker runner copies only standalone; Railpack deploys the full app tree.
if (process.env.STANDALONE_ONLY_BUILD === "1") {
  safeRmDir(path.join(root, "node_modules"));
  console.log("[prepare-standalone] standalone ready; root node_modules removed");
} else {
  console.log("[prepare-standalone] standalone ready");
}
