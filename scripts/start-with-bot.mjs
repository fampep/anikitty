import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const isDev = process.argv.includes("--dev");

function botConfigured() {
  return !!(
    process.env.DISCORD_BOT_TOKEN?.trim() &&
    process.env.DISCORD_GUILD_ID?.trim() &&
    process.env.DISCORD_BOT_API_SECRET?.trim()
  );
}

function resolveBotScript() {
  const candidates = [
    path.join(process.cwd(), "scripts", "discord-bot.mjs"),
    path.join(root, "scripts", "discord-bot.mjs"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(root, "scripts", "discord-bot.mjs");
}

function resolveServerScript() {
  if (isDev) return null;
  const candidates = [
    path.join(process.cwd(), "server.js"),
    path.join(root, "server.js"),
    path.join(root, ".next", "standalone", "server.js"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(root, ".next", "standalone", "server.js");
}

function siteBaseUrl() {
  const port = process.env.PORT ?? "3000";
  return (
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `http://127.0.0.1:${port}`
  ).replace(/\/$/, "");
}

async function waitForSite(maxMs = 120_000) {
  const base = siteBaseUrl();
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${base}/api/account/auth/discord/status`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return true;
    } catch {
      // site still booting
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

let botProc = null;
let serverProc = null;

function startBot() {
  if (!botConfigured()) {
    console.info(
      "[start] Discord bot skipped — set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_BOT_API_SECRET",
    );
    return;
  }

  const botScript = resolveBotScript();
  console.info("[start] Starting Discord bot…");
  botProc = spawn(process.execPath, [botScript], {
    stdio: "inherit",
    env: process.env,
    cwd: path.dirname(botScript),
  });

  botProc.on("exit", (code, signal) => {
    console.error(`[start] Discord bot stopped (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    botProc = null;
    if (!isDev && serverProc) {
      serverProc.kill("SIGTERM");
    }
  });
}

function shutdown() {
  if (botProc) botProc.kill("SIGTERM");
  if (serverProc) serverProc.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  if (isDev) {
    const nextBin = path.join(root, "node_modules", "next", "dist", "bin", "next");
    serverProc = spawn(process.execPath, [nextBin, "dev"], {
      stdio: "inherit",
      env: process.env,
      cwd: root,
    });
  } else {
    const serverScript = resolveServerScript();
    if (!fs.existsSync(serverScript)) {
      console.error(`[start] Next server not found at ${serverScript} — run npm run build first`);
      process.exit(1);
    }
    serverProc = spawn(process.execPath, [serverScript], {
      stdio: "inherit",
      env: process.env,
      cwd: path.dirname(serverScript),
    });
  }

  serverProc.on("exit", (code) => {
    if (botProc) botProc.kill("SIGTERM");
    process.exit(code ?? 0);
  });

  console.info(`[start] Waiting for site at ${siteBaseUrl()}…`);
  const ready = await waitForSite();
  if (ready) console.info("[start] Site is ready — launching bot");
  else console.warn("[start] Site slow to respond — launching bot anyway");

  startBot();
}

main().catch((e) => {
  console.error("[start] failed:", e);
  process.exit(1);
});
