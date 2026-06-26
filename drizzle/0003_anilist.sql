ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anilist_access_token" text;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anilist_user_id" integer;
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "anilist_username" varchar(100);
