CREATE TABLE IF NOT EXISTS discord_chat_xp (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  xp INTEGER NOT NULL DEFAULT 0,
  last_awarded_at TIMESTAMP NOT NULL,
  last_message_id VARCHAR(32),
  last_guild_id VARCHAR(32),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);
