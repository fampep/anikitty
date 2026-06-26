import postgres from "postgres";
import { LEVEL_TIERS } from "@/lib/user-level";

export async function migrateDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const ssl =
    url.includes("sslmode=require") || url.includes("neon.tech") ? "require" : false;
  const client = postgres(url, { ssl, max: 1 });

  try {
    await client`
      CREATE TABLE IF NOT EXISTS users (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username    VARCHAR(25)  NOT NULL UNIQUE,
        email       VARCHAR(255) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        avatar_url  TEXT,
        banner_url  TEXT,
        bio         TEXT,
        role        VARCHAR(20)  NOT NULL DEFAULT 'user',
        created_at  TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS watchlist (
        id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id         VARCHAR(255) NOT NULL,
        folder           VARCHAR(20)  NOT NULL DEFAULT 'WATCHING',
        anime_title      TEXT,
        anime_thumbnail  TEXT,
        anilist_id       INTEGER,
        mal_id           INTEGER,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, anime_id)
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS watch_progress (
        id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id         VARCHAR(255) NOT NULL,
        episode_id       VARCHAR(100) NOT NULL,
        "current_time"   INTEGER NOT NULL DEFAULT 0,
        duration         INTEGER NOT NULL DEFAULT 0,
        language         VARCHAR(10) DEFAULT 'sub',
        server           VARCHAR(100),
        anime_title      TEXT,
        anime_thumbnail  TEXT,
        anilist_id       INTEGER,
        updated_at       TIMESTAMP DEFAULT NOW(),
        UNIQUE(user_id, anime_id, episode_id)
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS roles (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name       VARCHAR(50) NOT NULL UNIQUE,
        color      VARCHAR(20) NOT NULL DEFAULT '#ffffff',
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS comments (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id   VARCHAR(255) NOT NULL,
        body       TEXT NOT NULL DEFAULT '',
        gif_url    TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS comments_anime_id_idx ON comments (anime_id)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS comment_reactions (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji       VARCHAR(16) NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(comment_id, user_id, emoji)
      )
    `;

    await client`
      CREATE TABLE IF NOT EXISTS comment_votes (
        id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        comment_id  UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
        user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote        INTEGER NOT NULL,
        created_at  TIMESTAMP DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      )
    `;

    // Add columns introduced after initial table creation — each isolated so one
    // failure does not prevent the rest from running.
    const alters = [
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anisurge_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anisurge_username VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_access_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_user_id INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_username VARCHAR(100)`,
      `ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS episode_number INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE`,
      `CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id)`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS episode_id VARCHAR(100)`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS episode_number INTEGER`,
      `CREATE INDEX IF NOT EXISTS comments_anime_episode_idx ON comments (anime_id, episode_id)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7)`,
      `ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS anilist_synced_at TIMESTAMP`,
    ];
    for (const sql of alters) {
      await client.unsafe(sql).catch((e: unknown) =>
        console.error("[migrate] alter failed:", sql, e),
      );
    }

    // Level tier names as display roles (computed from XP — not auto-assigned to users)
    for (const tier of LEVEL_TIERS) {
      await client`
        INSERT INTO roles (name, color)
        VALUES (${tier.name}, ${tier.color})
        ON CONFLICT (name) DO NOTHING
      `.catch((e: unknown) =>
        console.error("[migrate] level role seed failed:", tier.name, e),
      );
    }

    // Ensure the site owner always has admin role
    await client`UPDATE users SET role = 'admin' WHERE username = 'fampep' AND role != 'admin'`;
  } finally {
    await client.end();
  }
}
