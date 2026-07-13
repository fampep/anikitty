import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";
import { internalApiBase, resolveInternalApiBase } from "./internal-api-url.mjs";

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

function logBotEnvStatus() {
  const hasToken = !!process.env.DISCORD_BOT_TOKEN?.trim();
  const hasGuild = !!process.env.DISCORD_GUILD_ID?.trim();
  const hasSecret = !!process.env.DISCORD_BOT_API_SECRET?.trim();
  console.info(
    `[start] Discord bot env: token=${hasToken} guild=${hasGuild} apiSecret=${hasSecret} internalApi=${internalApiBase()}`,
  );
}

function resolveBotScript() {
  const candidates = [
    path.join(process.cwd(), "scripts", "discord-bot.mjs"),
    path.join(root, "scripts", "discord-bot.mjs"),
    path.join(process.cwd(), "discord-bot.mjs"),
    path.join(root, "discord-bot.mjs"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return path.join(root, "scripts", "discord-bot.mjs");
}

function resolveAppRoot() {
  const candidates = [
    process.cwd(),
    root,
    path.dirname(resolveServerScript() ?? root),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "server.js"))) return candidate;
  }
  return process.cwd();
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

async function waitForSite(maxMs = 120_000) {
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    const base = await resolveInternalApiBase({ timeoutMs: 4000 });
    if (base) {
      resolvedInternalApi = base;
      return true;
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  return false;
}

let botProc = null;
let serverProc = null;
let botRestartTimer = null;
/** Resolved after the site health check; passed to the bot subprocess. */
let resolvedInternalApi = internalApiBase();

function startBot() {
  if (!botConfigured()) {
    console.info(
      "[start] Discord bot skipped — set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, and DISCORD_BOT_API_SECRET as runtime env vars",
    );
    return;
  }

  const botScript = resolveBotScript();
  if (!fs.existsSync(botScript)) {
    console.error(`[start] Discord bot script missing at ${botScript}`);
    return;
  }

  const appRoot = resolveAppRoot();
  console.info(`[start] Starting Discord bot from ${botScript} (cwd=${appRoot})`);
  botProc = spawn(process.execPath, [botScript], {
    stdio: "inherit",
    env: {
      ...process.env,
      INTERNAL_API_URL: resolvedInternalApi,
      NO_PROXY: "127.0.0.1,localhost,0.0.0.0,::1",
      no_proxy: "127.0.0.1,localhost,0.0.0.0,::1",
    },
    cwd: appRoot,
  });

  botProc.on("exit", (code, signal) => {
    console.error(`[start] Discord bot stopped (code=${code ?? "null"}, signal=${signal ?? "null"})`);
    botProc = null;
    if (!isDev && botConfigured()) {
      clearTimeout(botRestartTimer);
      botRestartTimer = setTimeout(() => {
        console.info("[start] Restarting Discord bot…");
        startBot();
      }, 5000);
    }
  });
}

function shutdown() {
  clearTimeout(botRestartTimer);
  if (botProc) botProc.kill("SIGTERM");
  if (serverProc) serverProc.kill("SIGTERM");
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

async function main() {
  logBotEnvStatus();

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
    clearTimeout(botRestartTimer);
    if (botProc) botProc.kill("SIGTERM");
    process.exit(code ?? 0);
  });

  resolvedInternalApi = internalApiBase();
  console.info(
    `[start] Waiting for site health at ${resolvedInternalApi}/api/health (PORT=${process.env.PORT ?? "3000"}) …`,
  );
  const ready = await waitForSite();
  if (ready) {
    console.info(`[start] Site is ready at ${resolvedInternalApi} — launching bot`);
  } else {
    const probed = await resolveInternalApiBase({ timeoutMs: 2000 });
    resolvedInternalApi = probed ?? internalApiBase();
    console.warn(
      `[start] Site slow to respond — launching bot with ${resolvedInternalApi}`,
    );
  }

  startBot();
}

main().catch((e) => {
  console.error("[start] failed:", e);
  process.exit(1);
});
