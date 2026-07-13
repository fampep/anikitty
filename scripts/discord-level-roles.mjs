import {
  LEVEL_TIERS,
  LEVEL_ROLE_PREFIX,
  hexToDiscordColor,
} from "./discord-level-tiers.mjs";

/** @type {Map<string, import('discord.js').Role>} */
let tierRoleCache = new Map();

export function getTierRoleMap() {
  return tierRoleCache;
}

export function isAniKittyLevelRole(role) {
  return role?.name?.startsWith(LEVEL_ROLE_PREFIX) ?? false;
}

/** Create or resolve all AniKitty tier roles in the guild. */
export async function ensureLevelRoles(guild) {
  const map = new Map();
  const me = guild.members.me;
  if (!me?.permissions.has("ManageRoles")) {
    console.warn("[discord-bot] missing Manage Roles — cannot create level roles");
    return map;
  }

  for (const tier of LEVEL_TIERS) {
    const name = `${LEVEL_ROLE_PREFIX}${tier.name}`;
    let role = guild.roles.cache.find((r) => r.name === name);
    if (!role) {
      try {
        role = await guild.roles.create({
          name,
          color: hexToDiscordColor(tier.color),
          reason: "AniKitty level tier (auto-created)",
          mentionable: false,
        });
        console.info(`[discord-bot] created level role ${name}`);
      } catch (e) {
        console.warn(`[discord-bot] could not create role ${name}:`, e?.message ?? e);
        continue;
      }
    }
    map.set(tier.name, role);
  }

  tierRoleCache = map;
  return map;
}

/** Assign the member's current tier role and remove other AniKitty tier roles. */
export async function syncMemberTierRole(member, tierName, roleMap = tierRoleCache) {
  if (!member?.guild || member.user.bot) return;
  const me = member.guild.members.me;
  if (!me?.permissions.has("ManageRoles")) return;

  const target = roleMap.get(tierName);
  if (!target) return;

  const removable = member.roles.cache.filter(
    (role) =>
      isAniKittyLevelRole(role) &&
      role.id !== target.id &&
      role.position < me.roles.highest.position,
  );

  const toAdd =
    member.roles.cache.has(target.id) || target.position >= me.roles.highest.position
      ? []
      : [target];

  if (removable.size === 0 && toAdd.length === 0) return;

  try {
    await member.roles.remove(removable);
    if (toAdd.length > 0) await member.roles.add(toAdd);
  } catch (e) {
    console.warn(`[discord-bot] tier role sync failed for ${member.user.tag}:`, e?.message ?? e);
  }
}

/** Sync tier roles for every linked member in the guild. */
export async function syncAllLinkedMemberRoles(guild, fetchSiteAccount, roleMap = tierRoleCache) {
  const members = await guild.members.fetch().catch(() => null);
  if (!members) return;

  let synced = 0;
  for (const member of members.values()) {
    if (member.user.bot) continue;
    const account = await fetchSiteAccount(member.id);
    if (!account?.tier) continue;
    await syncMemberTierRole(member, account.tier, roleMap);
    synced++;
  }
  if (synced > 0) {
    console.info(`[discord-bot] synced level roles for ${synced} linked member(s)`);
  }
}
