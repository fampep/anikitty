-- Forum feature: threads, posts, and votes
-- Run this against your Postgres database to add the 4 new tables.
-- Safe to re-run: uses IF NOT EXISTS everywhere.

-- ── forum_threads ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "forum_threads" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "title" varchar(200) NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "category" varchar(30) DEFAULT 'general' NOT NULL,
  "is_pinned" boolean DEFAULT false NOT NULL,
  "is_locked" boolean DEFAULT false NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "last_activity_at" timestamp DEFAULT now()
);

DO $$ BEGIN
  ALTER TABLE "forum_threads"
    ADD CONSTRAINT "forum_threads_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "forum_threads_category_idx" ON "forum_threads" ("category");
CREATE INDEX IF NOT EXISTS "forum_threads_activity_idx" ON "forum_threads" ("last_activity_at");

-- ── forum_posts ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "forum_posts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "forum_posts"
    ADD CONSTRAINT "forum_posts_thread_id_forum_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "forum_posts"
    ADD CONSTRAINT "forum_posts_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "forum_posts_thread_id_idx" ON "forum_posts" ("thread_id");

-- ── forum_thread_votes ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "forum_thread_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "thread_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "vote" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "forum_thread_votes_thread_user" UNIQUE("thread_id","user_id")
);

DO $$ BEGIN
  ALTER TABLE "forum_thread_votes"
    ADD CONSTRAINT "forum_thread_votes_thread_id_forum_threads_id_fk"
    FOREIGN KEY ("thread_id") REFERENCES "forum_threads"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "forum_thread_votes"
    ADD CONSTRAINT "forum_thread_votes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ── forum_post_votes ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "forum_post_votes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "post_id" uuid NOT NULL,
  "user_id" uuid NOT NULL,
  "vote" integer NOT NULL,
  "created_at" timestamp DEFAULT now(),
  CONSTRAINT "forum_post_votes_post_user" UNIQUE("post_id","user_id")
);

DO $$ BEGIN
  ALTER TABLE "forum_post_votes"
    ADD CONSTRAINT "forum_post_votes_post_id_forum_posts_id_fk"
    FOREIGN KEY ("post_id") REFERENCES "forum_posts"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  ALTER TABLE "forum_post_votes"
    ADD CONSTRAINT "forum_post_votes_user_id_users_id_fk"
    FOREIGN KEY ("user_id") REFERENCES "users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;
