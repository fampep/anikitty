import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
} from "discord.js";

const token = process.env.DISCORD_BOT_TOKEN?.trim();
const guildId = process.env.DISCORD_GUILD_ID?.trim();
const secret = process.env.DISCORD_BOT_API_SECRET?.trim();
const boosterRoleId = process.env.DISCORD_BOOSTER_ROLE_ID?.trim() || null;

function apiBase() {
  return (
    process.env.INTERNAL_API_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    `http://127.0.0.1:${process.env.PORT ?? "3000"}`
  ).replace(/\/$/, "");
}

async function botFetch(path, init) {
  const res = await fetch(`${apiBase()}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      ...(init?.headers ?? {}),
    },
    signal: AbortSignal.timeout(12_000),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function syncBoostForMember(member, boosting) {
  const result = await botFetch("/api/internal/discord/boost", {
    method: "POST",
    body: JSON.stringify({ discordId: member.id, boosting }),
  });

  if (!result.ok && result.status !== 404) {
    console.warn("[discord-bot] boost sync failed", member.id, result.status);
    return;
  }

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

async function handleLink(interaction) {
  const code = interaction.options.getString("code", true);
  await interaction.deferReply({ ephemeral: true });

  const result = await botFetch("/api/internal/discord/link", {
    method: "POST",
    body: JSON.stringify({
      code,
      discordId: interaction.user.id,
      discordUsername: interaction.user.username,
      discordGlobalName: interaction.user.globalName,
    }),
  });

  if (result.data.ok) {
    const member = interaction.member;
    if (member?.premiumSince) await syncBoostForMember(member, true);
    await interaction.editReply(
      `Linked to **${result.data.username}** on AniKitty! Use \`/level\` to check your site level.`,
    );
    return;
  }

  const messages = {
    invalid_code: "That code doesn't look valid. Generate a new one in Settings → Connections.",
    expired: "That code expired. Generate a fresh one on the site (Settings → Connections).",
    taken: "That Discord account is already linked to another AniKitty user.",
    already_linked: "Your AniKitty account already has a different Discord linked.",
    user_missing: "Account not found. Try generating a new code on the site.",
  };
  await interaction.editReply(messages[result.data.reason] ?? "Could not link account. Try again.");
}

async function handleLevel(interaction) {
  const target = interaction.options.getUser("user") ?? interaction.user;
  await interaction.deferReply();

  const result = await botFetch(
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

async function handleProfile(interaction) {
  await interaction.deferReply({ ephemeral: true });

  const result = await botFetch(
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

async function registerSlashCommands(clientId) {
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

  const rest = new REST({ version: "10" }).setToken(token);
  await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
}

async function syncExistingBoosters(client) {
  const guild = await client.guilds.fetch(guildId).catch(() => null);
  if (!guild) return;

  const members = await guild.members.fetch().catch(() => null);
  if (!members) return;

  for (const member of members.values()) {
    if (member.user.bot) continue;
    if (member.premiumSince) await syncBoostForMember(member, true);
  }
}

async function main() {
  if (!token || !guildId || !secret) {
    console.error("[discord-bot] missing DISCORD_BOT_TOKEN, DISCORD_GUILD_ID, or DISCORD_BOT_API_SECRET");
    process.exit(1);
  }

  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  });

  client.once("ready", async () => {
    console.info(`[discord-bot] logged in as ${client.user?.tag}`);
    try {
      await registerSlashCommands(client.user.id);
      console.info("[discord-bot] slash commands registered");
      await syncExistingBoosters(client);
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

main().catch((e) => {
  console.error("[discord-bot] fatal:", e);
  process.exit(1);
});
