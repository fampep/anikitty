import postgres from "postgres";
import { LEVEL_TIERS } from "@/lib/user-level";

export async function migrateDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return;

  const ssl =
    url.includes("sslmode=require") || url.includes("neon.tech") ? "require" : false;
  const client = postgres(url, {
    ssl,
    max: 1,
    onnotice: () => {},
  });

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

    await client`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body       TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON chat_messages (created_at)
    `;

    await client`
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS gif_url TEXT
    `;

    await client`
      ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP
    `;

    await client`
      CREATE TABLE IF NOT EXISTS w2g_rooms (
        id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        code             VARCHAR(8) NOT NULL UNIQUE,
        host_user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id         VARCHAR(255) NOT NULL,
        anime_title      TEXT,
        anime_thumbnail  TEXT,
        episode_id       VARCHAR(100) NOT NULL,
        episode_number   INTEGER NOT NULL DEFAULT 0,
        provider         VARCHAR(50) NOT NULL DEFAULT 'Miruro',
        audio            VARCHAR(10) NOT NULL DEFAULT 'sub',
        is_playing       BOOLEAN NOT NULL DEFAULT FALSE,
        "current_time"   INTEGER NOT NULL DEFAULT 0,
        state_version    INTEGER NOT NULL DEFAULT 0,
        created_at       TIMESTAMP DEFAULT NOW(),
        updated_at       TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS w2g_rooms_code_idx ON w2g_rooms (code)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS w2g_members (
        id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id      UUID NOT NULL REFERENCES w2g_rooms(id) ON DELETE CASCADE,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_seen_at TIMESTAMP DEFAULT NOW(),
        joined_at    TIMESTAMP DEFAULT NOW(),
        UNIQUE(room_id, user_id)
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS w2g_members_room_id_idx ON w2g_members (room_id)
    `;

    await client`
      CREATE TABLE IF NOT EXISTS w2g_messages (
        id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        room_id    UUID NOT NULL REFERENCES w2g_rooms(id) ON DELETE CASCADE,
        user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body       TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      )
    `;

    await client`
      CREATE INDEX IF NOT EXISTS w2g_messages_room_id_idx ON w2g_messages (room_id)
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
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_private BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS anilist_synced_at TIMESTAMP`,
      `CREATE TABLE IF NOT EXISTS user_sessions (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user_agent      TEXT,
        device_label    VARCHAR(120),
        ip_address      VARCHAR(45),
        last_active_at  TIMESTAMP DEFAULT NOW(),
        revoked_at      TIMESTAMP,
        created_at      TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS user_sessions_user_id_idx ON user_sessions (user_id)`,
      `CREATE TABLE IF NOT EXISTS account_deletion_requests (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        reason TEXT,
        requested_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS anime_audio_availability (
        anilist_id   INTEGER PRIMARY KEY,
        mal_id       INTEGER,
        catalog_id   INTEGER,
        sub_count    INTEGER NOT NULL DEFAULT 0,
        dub_count    INTEGER NOT NULL DEFAULT 0,
        fetched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS episode_subtitles (
        id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        anilist_id   INTEGER NOT NULL,
        anime_title  TEXT,
        episode      INTEGER NOT NULL,
        audio        VARCHAR(10) NOT NULL DEFAULT 'sub',
        provider     VARCHAR(50) NOT NULL,
        label        VARCHAR(100) NOT NULL,
        kind         VARCHAR(30) NOT NULL DEFAULT 'subtitles',
        is_default   BOOLEAN NOT NULL DEFAULT FALSE,
        source_url   TEXT NOT NULL,
        content      TEXT NOT NULL,
        fetched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE (anilist_id, episode, audio, provider, label)
      )`,
      `CREATE INDEX IF NOT EXISTS episode_subtitles_lookup_idx
        ON episode_subtitles (anilist_id, episode, audio, provider)`,
      `CREATE TABLE IF NOT EXISTS subtitle_library_anime (
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
      )`,
      `CREATE INDEX IF NOT EXISTS subtitle_library_anime_complete_idx
        ON subtitle_library_anime (is_complete, last_subtitle_at DESC)`,
      `CREATE INDEX IF NOT EXISTS subtitle_library_anime_title_idx
        ON subtitle_library_anime (anime_title)`,
      `INSERT INTO subtitle_library_anime (
        anilist_id, anime_title, cached_episode_count, track_count, last_subtitle_at, updated_at
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
        updated_at = NOW()`,
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
