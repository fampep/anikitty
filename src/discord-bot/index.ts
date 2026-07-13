import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  type ChatInputCommandInteraction,
  type GuildMember,
} from "discord.js";
import {
  getDiscordBotToken,
  getDiscordGuildId,
  getDiscordBotApiSecret,
  getInternalApiBaseUrl,
  getDiscordBoosterRoleId,
} from "@/lib/discord/bot-config";

declare global {
  // eslint-disable-next-line no-var
  var __akDiscordBotStarted: boolean | undefined;
}

type LevelResponse = {
  ok: boolean;
  reason?: string;
  username?: string;
  profileUrl?: string;
  level?: number;
  tier?: string;
  tierColor?: string;
  xp?: number;
  xpProgress?: number;
  xpNeeded?: number;
  completedEpisodes?: number;
  commentCount?: number;
  role?: string;
  boosting?: boolean;
};

async function botFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<{ ok: boolean; status: number; data: T }> {
  const secret = getDiscordBotApiSecret();
  const base = getInternalApiBaseUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  const data = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, data };
}

async function syncBoostForMember(member: GuildMember, boosting: boolean) {
  const result = await botFetch<{ ok: boolean; reason?: string; username?: string }>(
    "/api/internal/discord/boost",
    {
      method: "POST",
      body: JSON.stringify({ discordId: member.id, boosting }),
    },
  );

  if (!result.ok && result.status !== 404) {
    console.warn("[discord-bot] boost sync failed", member.id, result.status);
    return;
  }

  const boosterRoleId = getDiscordBoosterRoleId();
  if (boosterRoleId) {
    const role = member.guild.roles.cache.get(boosterRoleId);
    if (role && member.guild.members.me?.permissions.has("ManageRoles")) {
      if (boosting) await member.roles.add(role).catch(() => {});
      else await member.roles.remove(role).catch(() => {});
    }
  }

  if (result.data.ok && boosting) {
    console.info("[discord-bot] boost granted", result.data.username);
  }
}

async function handleLink(interaction: ChatInputCommandInteraction) {
  const code = interaction.options.getString("code", true);
  await interaction.deferReply({ ephemeral: true });

  const result = await botFetch<{ ok: boolean; reason?: string; username?: string }>(
    "/api/internal/discord/link",
    {
      method: "POST",
      body: JSON.stringify({
        code,
        discordId: interaction.user.id,
        discordUsername: interaction.user.username,
        discordGlobalName: interaction.user.globalName,
      }),
    },
  );

  if (result.data.ok) {
    const member = interaction.member as GuildMember | null;
    if (member?.premiumSince) await syncBoostForMember(member, true);
    await interaction.editReply(
      `Linked to **${result.data.username}** on AniKitty! Use \`/level\` to check your site level.`,
    );
    return;
  }

  const messages: Record<string, string> = {
    invalid_code: "That code doesn't look valid. Generate a new one in Settings → Connections.",
    expired: "That code expired. Generate a fresh one on the site (Settings → Connections).",
    taken: "That Discord account is already linked to another AniKitty user.",
    already_linked: "Your AniKitty account already has a different Discord linked.",
    user_missing: "Account not found. Try generating a new code on the site.",
  };
  await interaction.editReply(messages[result.data.reason ?? ""] ?? "Could not link account. Try again.");
}

async function handleLevel(interaction: ChatInputCommandInteraction) {
  const target = interaction.options.getUser("user") ?? interaction.user;
  await interaction.deferReply();

  const result = await botFetch<LevelResponse>(
    `/api/internal/discord/level?discordId=${encodeURIComponent(target.id)}`,
  );

  if (!result.ok || !result.data.ok) {
    const msg =
      target.id === interaction.user.id
        ? "Link your account first with `/link` — get a code from **Settings → Connections** on AniKitty."
        : `${target.displayName} hasn't linked their AniKitty account yet.`;
    await interaction.editReply(msg);
    return;
  }

  const d = result.data;
  const embedColor = d.tierColor ? parseInt(d.tierColor.replace("#", ""), 16) : 0x818cf8;
  const embed = new EmbedBuilder()
    .setColor(embedColor)
    .setTitle(`${d.username} · Level ${d.level}`)
    .setDescription(`**${d.tier}** tier`)
    .addFields(
      { name: "XP", value: `${d.xp?.toLocaleString()} (${d.xpProgress}/${d.xpNeeded} to next level)`, inline: true },
      { name: "Episodes", value: String(d.completedEpisodes ?? 0), inline: true },
      { name: "Comments", value: String(d.commentCount ?? 0), inline: true },
    )
    .setURL(d.profileUrl ?? null);

  if (d.boosting) {
    embed.addFields({ name: "Server Booster", value: "Active — Booster role on AniKitty", inline: false });
  }

  await interaction.editReply({ embeds: [embed] });
}

async function handleProfile(interaction: ChatInputCommandInteraction) {
  await interaction.deferReply({ ephemeral: true });

  const result = await botFetch<LevelResponse>(
    `/api/internal/discord/level?discordId=${encodeURIComponent(interaction.user.id)}`,
  );

  if (!result.ok || !result.data.ok || !result.data.profileUrl) {
    await interaction.editReply(
      "Link your account first with `/link` — get a code from **Settings → Connections** on AniKitty.",
    );
    return;
  }

  await interaction.editReply(`Your AniKitty profile: ${result.data.profileUrl}`);
}

async function registerSlashCommands(clientId: string, guild: string) {
  const commands = [
    new SlashCommandBuilder()
      .setName("link")
      .setDescription("Link your Discord account to AniKitty")
      .addStringOption((o) =>
        o.setName("code").setDescription("Link code from Settings → Connections").setRequired(true),
      ),
    new SlashCommandBuilder()
      .setName("level")
      .setDescription("Show AniKitty level and XP")
      .addUserOption((o) =>
        o.setName("user").setDescription("Another linked Discord user").setRequired(false),
      ),
    new SlashCommandBuilder()
      .setName("profile")
      .setDescription("Get your AniKitty profile link"),
  ].map((c) => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(getDiscordBotToken()!);
  await rest.put(Routes.applicationGuildCommands(clientId, guild), { body: commands });
}

async function syncExistingBoosters(client: Client, guild: string) {
  const resolved = await client.guilds.fetch(guild).catch(() => null);
  if (!resolved) return;

  const members = await resolved.members.fetch().catch(() => null);
  if (!members) return;

  for (const member of members.values()) {
    if (member.user.bot) continue;
    if (member.premiumSince) await syncBoostForMember(member, true);
  }
}

async function waitForSiteReady(maxMs = 120_000): Promise<void> {
  const base = getInternalApiBaseUrl();
  const started = Date.now();
  while (Date.now() - started < maxMs) {
    try {
      const res = await fetch(`${base}/api/account/auth/discord/status`, {
        signal: AbortSignal.timeout(4000),
      });
      if (res.ok) return;
    } catch {
      // server still booting
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  console.warn("[discord-bot] site health check timed out — starting anyway");
}

async function startDiscordBotNow(): Promise<void> {
  const token = getDiscordBotToken();
  const guildId = getDiscordGuildId();
  const secret = getDiscordBotApiSecret();

  if (!token || !guildId || !secret) {
    console.info("[discord-bot] skipped — set DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, DISCORD_BOT_API_SECRET");
    return;
  }

  await waitForSiteReady();

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once("ready", async () => {
    console.info(`[discord-bot] logged in as ${client.user?.tag}`);
    try {
      await registerSlashCommands(client.user!.id, guildId);
      console.info("[discord-bot] slash commands registered");
      await syncExistingBoosters(client, guildId);
    } catch (e) {
      console.error("[discord-bot] setup failed:", e);
    }
  });

  client.on("guildMemberUpdate", async (oldMember, newMember) => {
    if (newMember.guild.id !== guildId) return;
    const wasBoosting = !!oldMember.premiumSince;
    const isBoosting = !!newMember.premiumSince;
    if (wasBoosting === isBoosting) return;
    await syncBoostForMember(newMember, isBoosting);
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.guildId !== guildId) return;

    try {
      if (interaction.commandName === "link") await handleLink(interaction);
      else if (interaction.commandName === "level") await handleLevel(interaction);
      else if (interaction.commandName === "profile") await handleProfile(interaction);
    } catch (e) {
      console.error("[discord-bot] command error:", e);
      const method = interaction.deferred || interaction.replied ? "editReply" : "reply";
      await interaction[method]({
        content: "Something went wrong. Try again in a moment.",
        ephemeral: true,
      }).catch(() => {});
    }
  });

  client.on("error", (e) => console.error("[discord-bot] client error:", e));

  await client.login(token);
}

/** Start the Discord bot once per server process (after the site is up). */
export function startDiscordBot(): void {
  if (globalThis.__akDiscordBotStarted) return;
  globalThis.__akDiscordBotStarted = true;

  void startDiscordBotNow().catch((e) => console.error("[discord-bot] failed to start:", e));
}
