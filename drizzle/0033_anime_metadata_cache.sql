-- Server-side cache for resolved episode lists (images, titles, filler) and anime detail payloads.

CREATE TABLE IF NOT EXISTS anime_episode_cache (
  anilist_id    INTEGER PRIMARY KEY,
  mal_id        INTEGER,
  status        VARCHAR(30),
  aired_count   INTEGER NOT NULL DEFAULT 0,
  total_episodes INTEGER NOT NULL DEFAULT 0,
  episodes_json JSONB NOT NULL DEFAULT '[]',
  sources_json  JSONB,
  filler_json   JSONB,
  fetched_at    TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS anime_detail_cache (
  anilist_id  INTEGER PRIMARY KEY,
  status      VARCHAR(30),
  detail_json JSONB NOT NULL,
  fetched_at  TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMP NOT NULL DEFAULT NOW()
);
