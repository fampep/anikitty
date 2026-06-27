CREATE TABLE IF NOT EXISTS episode_subtitles (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  anilist_id   INTEGER NOT NULL,
  anime_title  TEXT,
  episode      INTEGER NOT NULL,
  audio        VARCHAR(10) NOT NULL DEFAULT 'sub',
  provider     VARCHAR(50) NOT NULL,
  label        VARCHAR(100) NOT NULL,
  kind         VARCHAR(30) NOT NULL DEFAULT 'subtitles',
  is_default   BOOLEAN NOT NULL DEFAULT FALSE,
  source_url   TEXT NOT NULL,
  content      TEXT NOT NULL,
  fetched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (anilist_id, episode, audio, provider, label)
);

CREATE INDEX IF NOT EXISTS episode_subtitles_lookup_idx
  ON episode_subtitles (anilist_id, episode, audio, provider);
