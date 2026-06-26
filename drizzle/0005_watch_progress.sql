-- Continue-watching progress per user / anime / episode.
-- Safe to re-run: uses IF NOT EXISTS everywhere.
-- Note: "current_time" is quoted — it is a PostgreSQL reserved word.

CREATE TABLE IF NOT EXISTS "watch_progress" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "anime_id" varchar(255) NOT NULL,
  "episode_id" varchar(100) NOT NULL,
  "current_time" integer DEFAULT 0 NOT NULL,
  "duration" integer DEFAULT 0 NOT NULL,
  "language" varchar(10) DEFAULT 'sub',
  "server" varchar(100),
  "anime_title" text,
  "anime_thumbnail" text,
  "anilist_id" integer,
  "updated_at" timestamp DEFAULT now(),
  CONSTRAINT "progress_user_anime_ep" UNIQUE("user_id", "anime_id", "episode_id")
);

DO $$ BEGIN
  ALTER TABLE "watch_progress"
    ADD CONSTRAINT "watch_progress_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
