CREATE TABLE IF NOT EXISTS anime_episode_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  anilist_id INTEGER NOT NULL,
  anime_title TEXT,
  anime_thumbnail TEXT,
  notify_sub BOOLEAN NOT NULL DEFAULT TRUE,
  notify_dub BOOLEAN NOT NULL DEFAULT FALSE,
  last_notified_sub_episode INTEGER NOT NULL DEFAULT 0,
  last_notified_dub_episode INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT anime_episode_alerts_user_anilist UNIQUE (user_id, anilist_id)
);

CREATE INDEX IF NOT EXISTS anime_episode_alerts_anilist_idx ON anime_episode_alerts (anilist_id);
