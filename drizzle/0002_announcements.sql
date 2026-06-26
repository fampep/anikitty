-- Site-wide announcements managed via the admin panel.
-- Safe to re-run.

CREATE TABLE IF NOT EXISTS "announcements" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "title" varchar(200) NOT NULL,
  "body" text DEFAULT '' NOT NULL,
  "severity" varchar(20) DEFAULT 'info' NOT NULL,
  "is_active" boolean DEFAULT true NOT NULL,
  "dismissible" boolean DEFAULT true NOT NULL,
  "link_url" text,
  "link_label" varchar(60),
  "forum_thread_id" uuid,
  "starts_at" timestamp,
  "ends_at" timestamp,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp
);

DO $$ BEGIN
  ALTER TABLE "announcements"
    ADD CONSTRAINT "announcements_forum_thread_id_forum_threads_id_fk"
    FOREIGN KEY ("forum_thread_id") REFERENCES "forum_threads"("id")
    ON DELETE set null ON UPDATE no action;
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE INDEX IF NOT EXISTS "announcements_active_idx" ON "announcements" ("is_active");
