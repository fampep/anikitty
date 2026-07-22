-- Older deploys had discord_link_codes as (id, user_id, code, …) without discord_id.
-- Drop that leftover so the current bot /link schema can be created.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'discord_link_codes'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'discord_link_codes'
      AND column_name = 'discord_id'
  ) THEN
    DROP TABLE discord_link_codes;
  END IF;
END $$;

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
