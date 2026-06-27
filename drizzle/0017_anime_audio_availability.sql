CREATE TABLE IF NOT EXISTS anime_audio_availability (
  anilist_id   INTEGER PRIMARY KEY,
  mal_id       INTEGER,
  catalog_id   INTEGER,
  sub_count    INTEGER NOT NULL DEFAULT 0,
  dub_count    INTEGER NOT NULL DEFAULT 0,
  fetched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
);
