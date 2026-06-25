import postgres from "postgres";

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
        current_time     INTEGER NOT NULL DEFAULT 0,
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
  } finally {
    await client.end();
  }
}
