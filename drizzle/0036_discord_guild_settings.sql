ALTER TABLE users ADD COLUMN IF NOT EXISTS last_announced_discord_level INTEGER;

CREATE TABLE IF NOT EXISTS discord_guild_settings (
  guild_id VARCHAR(32) PRIMARY KEY,
  levelup_channel_id VARCHAR(32),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
