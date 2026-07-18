CREATE TABLE IF NOT EXISTS discord_link_codes (
  code VARCHAR(64) PRIMARY KEY,
  discord_id VARCHAR(32) NOT NULL,
  discord_username VARCHAR(100),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS discord_link_codes_discord_id_idx
  ON discord_link_codes (discord_id);

CREATE INDEX IF NOT EXISTS discord_link_codes_expires_at_idx
  ON discord_link_codes (expires_at);
