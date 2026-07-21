-- Account recovery codes + password/email flags (also applied via migrateDb on startup).
ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP;

CREATE TABLE IF NOT EXISTS user_recovery_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_recovery_codes_user_idx ON user_recovery_codes (user_id);
CREATE INDEX IF NOT EXISTS user_recovery_codes_hash_idx ON user_recovery_codes (code_hash);
