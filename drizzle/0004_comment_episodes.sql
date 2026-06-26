ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "episode_id" varchar(100);
ALTER TABLE "comments" ADD COLUMN IF NOT EXISTS "episode_number" integer;
CREATE INDEX IF NOT EXISTS "comments_anime_episode_idx" ON "comments" ("anime_id", "episode_id");
