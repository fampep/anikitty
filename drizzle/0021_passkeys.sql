CREATE TABLE IF NOT EXISTS user_passkeys (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id   TEXT NOT NULL UNIQUE,
  public_key      TEXT NOT NULL,
  counter         INTEGER NOT NULL DEFAULT 0,
  device_name     VARCHAR(120) NOT NULL DEFAULT 'Passkey',
  transports      TEXT,
  backed_up       BOOLEAN NOT NULL DEFAULT FALSE,
  device_type     VARCHAR(20),
  last_used_at    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_passkeys_user_id_idx ON user_passkeys (user_id);
