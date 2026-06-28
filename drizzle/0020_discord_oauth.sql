ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100);
CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_unique ON users (discord_id) WHERE discord_id IS NOT NULL;
