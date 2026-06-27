CREATE TABLE IF NOT EXISTS subtitle_library_anime (
  anilist_id             INTEGER PRIMARY KEY,
  anime_title            TEXT,
  poster                 TEXT,
  status                 VARCHAR(30),
  total_episodes         INTEGER,
  cached_episode_count   INTEGER NOT NULL DEFAULT 0,
  track_count            INTEGER NOT NULL DEFAULT 0,
  is_complete            BOOLEAN NOT NULL DEFAULT FALSE,
  score                  INTEGER,
  year                   INTEGER,
  last_subtitle_at       TIMESTAMP,
  meta_fetched_at        TIMESTAMP,
  updated_at             TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS subtitle_library_anime_complete_idx
  ON subtitle_library_anime (is_complete, last_subtitle_at DESC);

CREATE INDEX IF NOT EXISTS subtitle_library_anime_title_idx
  ON subtitle_library_anime (anime_title);

INSERT INTO subtitle_library_anime (
  anilist_id,
  anime_title,
  cached_episode_count,
  track_count,
  last_subtitle_at,
  updated_at
)
SELECT
  anilist_id,
  MAX(anime_title),
  COUNT(DISTINCT episode)::INTEGER,
  COUNT(*)::INTEGER,
  MAX(fetched_at),
  NOW()
FROM episode_subtitles
WHERE provider IN ('Anitaku', 'Miruro')
GROUP BY anilist_id
ON CONFLICT (anilist_id) DO UPDATE SET
  anime_title = EXCLUDED.anime_title,
  cached_episode_count = EXCLUDED.cached_episode_count,
  track_count = EXCLUDED.track_count,
  last_subtitle_at = EXCLUDED.last_subtitle_at,
  updated_at = NOW();
