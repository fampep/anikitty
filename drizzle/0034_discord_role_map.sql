CREATE TABLE IF NOT EXISTS discord_role_map (
  guild_id VARCHAR(32) NOT NULL,
  site_role_key VARCHAR(50) NOT NULL,
  discord_role_id VARCHAR(32) NOT NULL,
  discord_role_name VARCHAR(100),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  PRIMARY KEY (guild_id, site_role_key)
);

CREATE INDEX IF NOT EXISTS discord_role_map_discord_role_id_idx
  ON discord_role_map (discord_role_id);
