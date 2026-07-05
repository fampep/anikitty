CREATE TABLE IF NOT EXISTS user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT user_follows_pair UNIQUE (follower_id, following_id)
);
CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows (following_id);
CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows (follower_id);
