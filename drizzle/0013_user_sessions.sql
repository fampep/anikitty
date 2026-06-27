CREATE TABLE IF NOT EXISTS user_sessions (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_agent      TEXT,
  device_label    VARCHAR(120),
  ip_address      VARCHAR(45),
  last_active_at  TIMESTAMP DEFAULT NOW(),
  revoked_at      TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id);
