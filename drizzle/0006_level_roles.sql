-- Seed level tier names as display roles (XP-computed; not auto-assigned to users).
-- Safe to re-run.

INSERT INTO "roles" ("name", "color") VALUES ('Newcomer', '#94a3b8') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Watcher', '#60a5fa') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Bingewatcher', '#22d3ee') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Enthusiast', '#2dd4bf') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Fan', '#818cf8') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Weeb', '#a78bfa') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Otaku', '#c084fc') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Senpai', '#f472b6') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Sensei', '#fb923c') ON CONFLICT ("name") DO NOTHING;
INSERT INTO "roles" ("name", "color") VALUES ('Kage', '#fbbf24') ON CONFLICT ("name") DO NOTHING;
