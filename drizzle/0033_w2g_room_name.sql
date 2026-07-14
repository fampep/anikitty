ALTER TABLE w2g_rooms ADD COLUMN IF NOT EXISTS name VARCHAR(80);

UPDATE w2g_rooms
SET name = COALESCE(
  NULLIF(TRIM(anime_title), ''),
  'Watch party'
) || CASE WHEN episode_number > 0 THEN ' · EP ' || episode_number::text ELSE '' END
WHERE name IS NULL;

CREATE INDEX IF NOT EXISTS w2g_rooms_updated_at_idx ON w2g_rooms (updated_at DESC);
