import postgres from "postgres";
import { LEVEL_TIERS } from "@/lib/user/user-level";
import { DEFAULT_BUILTIN_PERMISSIONS, ROLE_PERMISSIONS_KEY } from "@/lib/security/permissions";
import { FAQ_SEED_ARTICLES, FAQ_SEED_CATEGORIES } from "@/db/faq-seed";

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
      CREATE TABLE IF NOT EXISTS uploads (
        id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        kind         VARCHAR(16) NOT NULL,
        content_type VARCHAR(64) NOT NULL,
        data         TEXT NOT NULL,
        size         INTEGER NOT NULL DEFAULT 0,
        created_at   TIMESTAMP DEFAULT NOW()
      )
    `;
    await client`
      CREATE INDEX IF NOT EXISTS uploads_user_kind_idx ON uploads (user_id, kind)
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
        permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
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
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_access_token TEXT`,
      `ALTER TABLE users DROP COLUMN IF EXISTS anisurge_token`,
      `ALTER TABLE users DROP COLUMN IF EXISTS anisurge_username`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_user_id INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS anilist_username VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mal_access_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mal_refresh_token TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mal_user_id INTEGER`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mal_username VARCHAR(100)`,
      `ALTER TABLE watch_progress ADD COLUMN IF NOT EXISTS episode_number INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS is_spoiler BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES comments(id) ON DELETE CASCADE`,
      `CREATE INDEX IF NOT EXISTS comments_parent_id_idx ON comments (parent_id)`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS episode_id VARCHAR(100)`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS episode_number INTEGER`,
      `CREATE INDEX IF NOT EXISTS comments_anime_episode_idx ON comments (anime_id, episode_id)`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS like_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE comments ADD COLUMN IF NOT EXISTS dislike_count INTEGER NOT NULL DEFAULT 0`,
      // Backfill denormalized vote tallies once from the votes table.
      `UPDATE comments c SET
        like_count = COALESCE((SELECT count(*) FROM comment_votes v WHERE v.comment_id = c.id AND v.vote = 1), 0),
        dislike_count = COALESCE((SELECT count(*) FROM comment_votes v WHERE v.comment_id = c.id AND v.vote = -1), 0)
       WHERE (like_count = 0 AND dislike_count = 0)
         AND EXISTS (SELECT 1 FROM comment_votes v WHERE v.comment_id = c.id)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS theme_color VARCHAR(7)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_secret TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS totp_enabled BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_private BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_id VARCHAR(32)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_username VARCHAR(100)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS discord_boosting BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_at TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS ban_reason TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS banned_by UUID REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_until TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS mute_reason TEXT`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS muted_by UUID REFERENCES users(id) ON DELETE SET NULL`,
      `ALTER TABLE roles ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '[]'::jsonb`,
      `CREATE UNIQUE INDEX IF NOT EXISTS users_discord_id_unique ON users (discord_id) WHERE discord_id IS NOT NULL`,
      `CREATE TABLE IF NOT EXISTS user_passkeys (
        id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        credential_id   TEXT NOT NULL UNIQUE,
        public_key      TEXT NOT NULL,
        counter         INTEGER NOT NULL DEFAULT 0,
        device_name     VARCHAR(120) NOT NULL DEFAULT 'Passkey',
        transports      TEXT,
        backed_up       BOOLEAN NOT NULL DEFAULT FALSE,
        device_type     VARCHAR(20),
        last_used_at    TIMESTAMP,
        created_at      TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS user_passkeys_user_id_idx ON user_passkeys (user_id)`,
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
        source       VARCHAR(40),
        status       VARCHAR(30),
        fetched_at   TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at   TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS mal_id INTEGER`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS catalog_id INTEGER`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS sub_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS dub_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS source VARCHAR(40)`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS status VARCHAR(30)`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP NOT NULL DEFAULT NOW()`,
      `ALTER TABLE anime_audio_availability ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
      `CREATE INDEX IF NOT EXISTS anime_audio_availability_fetched_at_idx
        ON anime_audio_availability (fetched_at)`,
      `CREATE INDEX IF NOT EXISTS anime_audio_availability_status_idx
        ON anime_audio_availability (status)`,
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
      // The table may predate later columns; CREATE TABLE IF NOT EXISTS won't add
      // them. Without these, SELECT * / ORDER BY last_subtitle_at throws and the
      // library list comes back empty even though counts work.
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS anime_title TEXT`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS poster TEXT`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS status VARCHAR(30)`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS total_episodes INTEGER`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS cached_episode_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS track_count INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS is_complete BOOLEAN NOT NULL DEFAULT FALSE`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS score INTEGER`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS year INTEGER`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS last_subtitle_at TIMESTAMP`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS meta_fetched_at TIMESTAMP`,
      `ALTER TABLE subtitle_library_anime ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
      `CREATE INDEX IF NOT EXISTS subtitle_library_anime_complete_idx
        ON subtitle_library_anime (is_complete, last_subtitle_at DESC)`,
      `CREATE INDEX IF NOT EXISTS subtitle_library_anime_title_idx
        ON subtitle_library_anime (anime_title)`,
      // Durable AniList catalog metadata (titles, image URLs, detail/related JSON).
      `CREATE TABLE IF NOT EXISTS anime_metadata (
        anilist_id          INTEGER PRIMARY KEY,
        mal_id              INTEGER,
        title               TEXT,
        title_english       TEXT,
        title_romaji        TEXT,
        title_native        TEXT,
        description         TEXT,
        cover_image         TEXT,
        banner_image        TEXT,
        episodes            INTEGER,
        format              VARCHAR(30),
        status              VARCHAR(30),
        season              VARCHAR(20),
        season_year         INTEGER,
        average_score       INTEGER,
        genres              JSONB NOT NULL DEFAULT '[]'::jsonb,
        studios             JSONB NOT NULL DEFAULT '[]'::jsonb,
        detail_payload      JSONB,
        related_payload     JSONB,
        detail_fetched_at   TIMESTAMP,
        related_fetched_at  TIMESTAMP,
        fetched_at          TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at          TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS mal_id INTEGER`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS title TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS title_english TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS title_romaji TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS title_native TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS description TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS cover_image TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS banner_image TEXT`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS episodes INTEGER`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS format VARCHAR(30)`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS status VARCHAR(30)`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS season VARCHAR(20)`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS season_year INTEGER`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS average_score INTEGER`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS genres JSONB NOT NULL DEFAULT '[]'::jsonb`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS studios JSONB NOT NULL DEFAULT '[]'::jsonb`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS detail_payload JSONB`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS related_payload JSONB`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS detail_fetched_at TIMESTAMP`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS related_fetched_at TIMESTAMP`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS fetched_at TIMESTAMP NOT NULL DEFAULT NOW()`,
      `ALTER TABLE anime_metadata ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW()`,
      `CREATE INDEX IF NOT EXISTS anime_metadata_title_idx ON anime_metadata (title)`,
      `CREATE INDEX IF NOT EXISTS anime_metadata_status_idx ON anime_metadata (status)`,
      `CREATE INDEX IF NOT EXISTS anime_metadata_fetched_at_idx ON anime_metadata (fetched_at)`,
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
      `CREATE TABLE IF NOT EXISTS dm_conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        participant_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        participant_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_activity_at TIMESTAMP DEFAULT NOW(),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT dm_conversations_pair UNIQUE (participant_a_id, participant_b_id)
      )`,
      `CREATE INDEX IF NOT EXISTS dm_conversations_activity_idx ON dm_conversations (last_activity_at DESC)`,
      `CREATE TABLE IF NOT EXISTS dm_messages (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
        sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL,
        gif_url TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS dm_messages_conv_created_idx ON dm_messages (conversation_id, created_at)`,
      `CREATE TABLE IF NOT EXISTS dm_read_state (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        last_read_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT dm_read_state_conv_user UNIQUE (conversation_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS user_notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(30) NOT NULL,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(200),
        body TEXT,
        link_url TEXT,
        reference_type VARCHAR(30),
        reference_id UUID,
        read_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx ON user_notifications (user_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx ON user_notifications (user_id, read_at)`,
      `CREATE TABLE IF NOT EXISTS anime_episode_alerts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anilist_id INTEGER NOT NULL,
        anime_title TEXT,
        anime_thumbnail TEXT,
        notify_sub BOOLEAN NOT NULL DEFAULT TRUE,
        notify_dub BOOLEAN NOT NULL DEFAULT FALSE,
        last_notified_sub_episode INTEGER NOT NULL DEFAULT 0,
        last_notified_dub_episode INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT anime_episode_alerts_user_anilist UNIQUE (user_id, anilist_id)
      )`,
      `CREATE INDEX IF NOT EXISTS anime_episode_alerts_anilist_idx ON anime_episode_alerts (anilist_id)`,
      `CREATE TABLE IF NOT EXISTS app_settings (
        key VARCHAR(100) PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      )`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS supporter_until TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS show_ads BOOLEAN NOT NULL DEFAULT TRUE`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS preferences JSONB NOT NULL DEFAULT '{}'::jsonb`,
      `CREATE TABLE IF NOT EXISTS kofi_webhook_events (
        message_id VARCHAR(64) PRIMARY KEY,
        kofi_transaction_id VARCHAR(64),
        email VARCHAR(255),
        type VARCHAR(32),
        amount VARCHAR(16),
        currency VARCHAR(8),
        raw JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS kittycoin_balance INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_frame VARCHAR(64)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_sticker VARCHAR(64)`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_icon VARCHAR(64)`,
      `CREATE TABLE IF NOT EXISTS user_shop_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        item_slug VARCHAR(64) NOT NULL,
        purchased_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_shop_items_user_slug UNIQUE (user_id, item_slug)
      )`,
      `CREATE INDEX IF NOT EXISTS user_shop_items_user_id_idx ON user_shop_items (user_id)`,
      `CREATE TABLE IF NOT EXISTS kittycoin_ledger (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        delta INTEGER NOT NULL,
        reason VARCHAR(64) NOT NULL,
        reference_id VARCHAR(128),
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT kittycoin_ledger_user_reason_ref UNIQUE (user_id, reason, reference_id)
      )`,
      `CREATE INDEX IF NOT EXISTS kittycoin_ledger_user_id_idx ON kittycoin_ledger (user_id)`,
      `CREATE TABLE IF NOT EXISTS mod_audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action VARCHAR(40) NOT NULL,
        target_type VARCHAR(20),
        target_id VARCHAR(255),
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reason TEXT,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS mod_audit_log_created_idx ON mod_audit_log (created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS mod_audit_log_actor_idx ON mod_audit_log (actor_user_id)`,
      `CREATE TABLE IF NOT EXISTS user_reports (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        reporter_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        target_type VARCHAR(20) NOT NULL,
        target_id VARCHAR(255) NOT NULL,
        target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reason VARCHAR(40) NOT NULL,
        details TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'open',
        resolved_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_reports_reporter_target UNIQUE (reporter_user_id, target_type, target_id)
      )`,
      `CREATE INDEX IF NOT EXISTS user_reports_status_idx ON user_reports (status, created_at)`,
      `CREATE TABLE IF NOT EXISTS user_follows (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_follows_pair UNIQUE (follower_id, following_id)
      )`,
      `CREATE INDEX IF NOT EXISTS user_follows_following_idx ON user_follows (following_id)`,
      `CREATE INDEX IF NOT EXISTS user_follows_follower_idx ON user_follows (follower_id)`,
      `CREATE TABLE IF NOT EXISTS user_friends (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(16) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT NOW(),
        responded_at TIMESTAMP,
        CONSTRAINT user_friends_pair UNIQUE (requester_id, addressee_id)
      )`,
      `CREATE INDEX IF NOT EXISTS user_friends_addressee_idx ON user_friends (addressee_id, status)`,
      `CREATE INDEX IF NOT EXISTS user_friends_requester_idx ON user_friends (requester_id, status)`,
      `CREATE TABLE IF NOT EXISTS user_blocks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_blocks_pair UNIQUE (blocker_id, blocked_id)
      )`,
      `CREATE INDEX IF NOT EXISTS user_blocks_blocker_idx ON user_blocks (blocker_id)`,
      `CREATE INDEX IF NOT EXISTS user_blocks_blocked_idx ON user_blocks (blocked_id)`,
      // Ratings & reviews (first-party "AniKitty Score").
      `CREATE TABLE IF NOT EXISTS anime_reviews (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id VARCHAR(255) NOT NULL,
        score INTEGER NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        has_spoiler BOOLEAN NOT NULL DEFAULT FALSE,
        like_count INTEGER NOT NULL DEFAULT 0,
        anime_title TEXT,
        anime_thumbnail TEXT,
        anilist_id INTEGER,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        CONSTRAINT anime_reviews_user_anime UNIQUE (user_id, anime_id)
      )`,
      `CREATE INDEX IF NOT EXISTS anime_reviews_anime_id_idx ON anime_reviews (anime_id)`,
      // Site-only episode ratings (0.5–10). Not AniList.
      `CREATE TABLE IF NOT EXISTS episode_ratings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id VARCHAR(255) NOT NULL,
        episode_number INTEGER NOT NULL,
        score REAL NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        CONSTRAINT episode_ratings_user_anime_ep UNIQUE (user_id, anime_id, episode_number)
      )`,
      `CREATE INDEX IF NOT EXISTS episode_ratings_anime_ep_idx ON episode_ratings (anime_id, episode_number)`,
      `CREATE TABLE IF NOT EXISTS review_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        review_id UUID NOT NULL REFERENCES anime_reviews(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT review_likes_review_user UNIQUE (review_id, user_id)
      )`,
      // Native list state: rewatch counter.
      `ALTER TABLE watchlist ADD COLUMN IF NOT EXISTS rewatch_count INTEGER NOT NULL DEFAULT 0`,
      // Daily-login streak tracking.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS login_streak INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS longest_streak INTEGER NOT NULL DEFAULT 0`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_date VARCHAR(10)`,
      // Achievements (catalog lives in code; rows record unlocks).
      `CREATE TABLE IF NOT EXISTS user_achievements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        slug VARCHAR(48) NOT NULL,
        unlocked_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT user_achievements_user_slug UNIQUE (user_id, slug)
      )`,
      `CREATE INDEX IF NOT EXISTS user_achievements_user_idx ON user_achievements (user_id)`,
      // Admin dashboard scans watch_progress by recency and per-user latest — without
      // these it full-scans a growing table and the stats/activity views time out.
      `CREATE INDEX IF NOT EXISTS watch_progress_updated_at_idx ON watch_progress (updated_at DESC)`,
      `CREATE INDEX IF NOT EXISTS watch_progress_user_updated_idx ON watch_progress (user_id, updated_at DESC)`,
      // Forum + announcements — were defined in the schema but missing here, so on
      // DBs built from migrate() they never existed and the admin stats query
      // (which counts forum_threads) failed, breaking the whole overview.
      `CREATE TABLE IF NOT EXISTS forum_threads (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        category VARCHAR(30) NOT NULL DEFAULT 'general',
        is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
        is_locked BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        last_activity_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS forum_threads_category_idx ON forum_threads (category)`,
      `CREATE INDEX IF NOT EXISTS forum_threads_activity_idx ON forum_threads (last_activity_at)`,
      `CREATE TABLE IF NOT EXISTS forum_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        body TEXT NOT NULL DEFAULT '',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS forum_posts_thread_id_idx ON forum_posts (thread_id)`,
      `CREATE TABLE IF NOT EXISTS forum_thread_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        thread_id UUID NOT NULL REFERENCES forum_threads(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT forum_thread_votes_thread_user UNIQUE (thread_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS forum_post_votes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        post_id UUID NOT NULL REFERENCES forum_posts(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        vote INTEGER NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        CONSTRAINT forum_post_votes_post_user UNIQUE (post_id, user_id)
      )`,
      `CREATE TABLE IF NOT EXISTS announcements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        severity VARCHAR(20) NOT NULL DEFAULT 'info',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        dismissible BOOLEAN NOT NULL DEFAULT TRUE,
        link_url TEXT,
        link_label VARCHAR(60),
        forum_thread_id UUID REFERENCES forum_threads(id) ON DELETE SET NULL,
        starts_at TIMESTAMP,
        ends_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP
      )`,
      `CREATE INDEX IF NOT EXISTS announcements_active_idx ON announcements (is_active)`,
      `ALTER TABLE chat_messages ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages(id) ON DELETE SET NULL`,
      `CREATE INDEX IF NOT EXISTS chat_messages_reply_to_id_idx ON chat_messages (reply_to_id)`,
      `CREATE TABLE IF NOT EXISTS episode_skip_submissions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anilist_id INTEGER NOT NULL,
        mal_id INTEGER,
        anime_title TEXT,
        episode INTEGER NOT NULL,
        intro_start REAL,
        intro_end REAL,
        outro_start REAL,
        outro_end REAL,
        notes TEXT,
        status VARCHAR(20) NOT NULL DEFAULT 'pending',
        reject_reason TEXT,
        reviewed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS episode_skip_submissions_status_idx ON episode_skip_submissions (status, created_at)`,
      `CREATE INDEX IF NOT EXISTS episode_skip_submissions_user_episode_idx ON episode_skip_submissions (user_id, anilist_id, episode)`,
      `CREATE TABLE IF NOT EXISTS episode_skip_times (
        anilist_id INTEGER NOT NULL,
        episode INTEGER NOT NULL,
        intro_start REAL,
        intro_end REAL,
        outro_start REAL,
        outro_end REAL,
        submission_id UUID REFERENCES episode_skip_submissions(id) ON DELETE SET NULL,
        approved_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (anilist_id, episode)
      )`,
      // Segment-based skip model (IntroDB-style, AniList absolute episodes)
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS episodes INTEGER[]`,
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS segment_type VARCHAR(20) NOT NULL DEFAULT 'intro'`,
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS start_sec REAL`,
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS end_sec REAL`,
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS duration_sec REAL`,
      `ALTER TABLE episode_skip_submissions ADD COLUMN IF NOT EXISTS no_segment BOOLEAN NOT NULL DEFAULT FALSE`,
      `CREATE TABLE IF NOT EXISTS episode_skip_segments (
        anilist_id INTEGER NOT NULL,
        episode INTEGER NOT NULL,
        segment_type VARCHAR(20) NOT NULL,
        start_sec REAL,
        end_sec REAL,
        no_segment BOOLEAN NOT NULL DEFAULT FALSE,
        submission_id UUID REFERENCES episode_skip_submissions(id) ON DELETE SET NULL,
        approved_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        PRIMARY KEY (anilist_id, episode, segment_type)
      )`,
      // Backfill submissions: legacy intro/outro rows → segment columns
      `UPDATE episode_skip_submissions
       SET
         episodes = ARRAY[episode],
         segment_type = CASE
           WHEN intro_start IS NOT NULL AND intro_end IS NOT NULL THEN 'intro'
           WHEN outro_start IS NOT NULL AND outro_end IS NOT NULL THEN 'credits'
           ELSE segment_type
         END,
         start_sec = COALESCE(start_sec, intro_start, outro_start),
         end_sec = COALESCE(end_sec, intro_end, outro_end)
       WHERE episodes IS NULL
          OR (start_sec IS NULL AND (intro_start IS NOT NULL OR outro_start IS NOT NULL))`,
      // Backfill live segments from legacy episode_skip_times
      `INSERT INTO episode_skip_segments (anilist_id, episode, segment_type, start_sec, end_sec, no_segment, submission_id, approved_at, updated_at)
       SELECT anilist_id, episode, 'intro', intro_start, intro_end, FALSE, submission_id, approved_at, updated_at
       FROM episode_skip_times
       WHERE intro_start IS NOT NULL AND intro_end IS NOT NULL
       ON CONFLICT (anilist_id, episode, segment_type) DO NOTHING`,
      `INSERT INTO episode_skip_segments (anilist_id, episode, segment_type, start_sec, end_sec, no_segment, submission_id, approved_at, updated_at)
       SELECT anilist_id, episode, 'credits', outro_start, outro_end, FALSE, submission_id, approved_at, updated_at
       FROM episode_skip_times
       WHERE outro_start IS NOT NULL AND outro_end IS NOT NULL
       ON CONFLICT (anilist_id, episode, segment_type) DO NOTHING`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_online_at TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS activity_status VARCHAR(12) NOT NULL DEFAULT 'online'`,
      `ALTER TABLE w2g_rooms ADD COLUMN IF NOT EXISTS name VARCHAR(80)`,
      `CREATE INDEX IF NOT EXISTS w2g_rooms_updated_at_idx ON w2g_rooms (updated_at DESC)`,
      `CREATE TABLE IF NOT EXISTS online_visitors (
        visitor_key VARCHAR(80) PRIMARY KEY,
        last_seen_at TIMESTAMP NOT NULL DEFAULT NOW(),
        user_id UUID
      )`,
      `CREATE INDEX IF NOT EXISTS online_visitors_last_seen_at_idx ON online_visitors (last_seen_at)`,
      // Discord bot role sync — site role key → Discord snowflake per guild.
      `CREATE TABLE IF NOT EXISTS discord_role_map (
        guild_id VARCHAR(32) NOT NULL,
        site_role_key VARCHAR(50) NOT NULL,
        discord_role_id VARCHAR(32) NOT NULL,
        discord_role_name VARCHAR(100),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        PRIMARY KEY (guild_id, site_role_key)
      )`,
      `CREATE INDEX IF NOT EXISTS discord_role_map_discord_role_id_idx
        ON discord_role_map (discord_role_id)`,
      // One-time Discord /link codes (bot creates, logged-in user consumes).
      // Older deploys had a different shape (user_id + short code, no discord_id).
      // Drop that leftover so CREATE TABLE can install the current schema.
      `DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = 'discord_link_codes'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'discord_link_codes'
            AND column_name = 'discord_id'
        ) THEN
          DROP TABLE discord_link_codes;
        END IF;
      END $$`,
      `CREATE TABLE IF NOT EXISTS discord_link_codes (
        code VARCHAR(64) PRIMARY KEY,
        discord_id VARCHAR(32) NOT NULL,
        discord_username VARCHAR(100),
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        used_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS discord_link_codes_discord_id_idx
        ON discord_link_codes (discord_id)`,
      `CREATE INDEX IF NOT EXISTS discord_link_codes_expires_at_idx
        ON discord_link_codes (expires_at)`,
      // Discord guild settings (level-up channel) + last announced level for announce idempotency.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_announced_discord_level INTEGER`,
      `CREATE TABLE IF NOT EXISTS discord_guild_settings (
        guild_id VARCHAR(32) PRIMARY KEY,
        levelup_channel_id VARCHAR(32),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // Discord chat XP (linked users) + per-user cooldown.
      `CREATE TABLE IF NOT EXISTS discord_chat_xp (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        xp INTEGER NOT NULL DEFAULT 0,
        last_awarded_at TIMESTAMP NOT NULL,
        last_message_id VARCHAR(32),
        last_guild_id VARCHAR(32),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      // Account recovery codes + password/email recovery flags.
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMP`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS password_set_at TIMESTAMP`,
      `CREATE TABLE IF NOT EXISTS user_recovery_codes (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        code_hash VARCHAR(64) NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS user_recovery_codes_user_idx ON user_recovery_codes (user_id)`,
      `CREATE INDEX IF NOT EXISTS user_recovery_codes_hash_idx ON user_recovery_codes (code_hash)`,
      // FAQ help center
      `CREATE TABLE IF NOT EXISTS faq_categories (
        id VARCHAR(64) PRIMARY KEY,
        label_key VARCHAR(120) NOT NULL,
        icon VARCHAR(48) NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE INDEX IF NOT EXISTS faq_categories_sort_idx ON faq_categories (sort_order)`,
      `CREATE TABLE IF NOT EXISTS faq_articles (
        id VARCHAR(96) PRIMARY KEY,
        category_id VARCHAR(64) NOT NULL REFERENCES faq_categories(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        answer TEXT NOT NULL,
        tags JSONB NOT NULL DEFAULT '[]'::jsonb,
        related_slugs JSONB NOT NULL DEFAULT '[]'::jsonb,
        popularity INTEGER NOT NULL DEFAULT 0,
        sort_order INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        published BOOLEAN NOT NULL DEFAULT TRUE
      )`,
      `CREATE INDEX IF NOT EXISTS faq_articles_category_idx ON faq_articles (category_id, sort_order)`,
      `CREATE INDEX IF NOT EXISTS faq_articles_published_pop_idx ON faq_articles (published, popularity)`,
      `CREATE TABLE IF NOT EXISTS faq_feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        article_id VARCHAR(96) NOT NULL REFERENCES faq_articles(id) ON DELETE CASCADE,
        helpful BOOLEAN NOT NULL,
        note TEXT,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        visitor_key VARCHAR(80),
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS faq_feedback_article_idx ON faq_feedback (article_id)`,
      `CREATE UNIQUE INDEX IF NOT EXISTS faq_feedback_user_article
        ON faq_feedback (user_id, article_id) WHERE user_id IS NOT NULL`,
      `CREATE UNIQUE INDEX IF NOT EXISTS faq_feedback_visitor_article
        ON faq_feedback (visitor_key, article_id) WHERE visitor_key IS NOT NULL`,
      // History dashboard per-user anime notes
      `CREATE TABLE IF NOT EXISTS user_anime_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        anime_id VARCHAR(255) NOT NULL,
        note TEXT NOT NULL DEFAULT '',
        updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT user_anime_notes_user_anime UNIQUE (user_id, anime_id)
      )`,
      `CREATE INDEX IF NOT EXISTS user_anime_notes_user_idx ON user_anime_notes (user_id)`,
      // Per-user chat pins (snapshot — messages TTL-expire)
      `CREATE TABLE IF NOT EXISTS chat_pins (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message_id UUID NOT NULL,
        body TEXT NOT NULL DEFAULT '',
        gif_url TEXT,
        username VARCHAR(25) NOT NULL,
        avatar_url TEXT,
        message_created_at TIMESTAMP,
        pinned_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chat_pins_user_message UNIQUE (user_id, message_id)
      )`,
      `CREATE INDEX IF NOT EXISTS chat_pins_user_pinned_idx ON chat_pins (user_id, pinned_at DESC)`,
      // Shared chat reactions (cascade when message sweeps)
      `CREATE TABLE IF NOT EXISTS chat_reactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        emoji VARCHAR(32) NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        CONSTRAINT chat_reactions_message_user_emoji UNIQUE (message_id, user_id, emoji)
      )`,
      `CREATE INDEX IF NOT EXISTS chat_reactions_message_idx ON chat_reactions (message_id)`,
      // ── Discord Webhooks ──
      `CREATE TABLE IF NOT EXISTS discord_webhooks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        webhook_url TEXT NOT NULL,
        category VARCHAR(30) NOT NULL DEFAULT 'system',
        description TEXT,
        enabled BOOLEAN NOT NULL DEFAULT TRUE,
        embed_color VARCHAR(7),
        custom_avatar TEXT,
        custom_username VARCHAR(80),
        last_success_at TIMESTAMP,
        last_failure_at TIMESTAMP,
        total_sent INTEGER NOT NULL DEFAULT 0,
        total_failed INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE TABLE IF NOT EXISTS discord_webhook_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id UUID NOT NULL REFERENCES discord_webhooks(id) ON DELETE CASCADE,
        event_type VARCHAR(60) NOT NULL,
        payload JSONB,
        http_status INTEGER,
        response_body TEXT,
        error TEXT,
        retry_count INTEGER NOT NULL DEFAULT 0,
        processing_ms INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS discord_webhook_logs_webhook_created_idx ON discord_webhook_logs (webhook_id, created_at DESC)`,
      `CREATE INDEX IF NOT EXISTS discord_webhook_logs_event_type_idx ON discord_webhook_logs (event_type)`,
      // ── Analytics Events ──
      `CREATE TABLE IF NOT EXISTS anime_view_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        anime_id VARCHAR(255) NOT NULL,
        episode_id VARCHAR(100),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        event_type VARCHAR(30) NOT NULL,
        watch_time_seconds INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS anime_view_events_anime_created_idx ON anime_view_events (anime_id, created_at)`,
      `CREATE INDEX IF NOT EXISTS anime_view_events_anime_ep_event_idx ON anime_view_events (anime_id, episode_id, event_type)`,
      `CREATE INDEX IF NOT EXISTS anime_view_events_created_idx ON anime_view_events (created_at)`,
      // ── Provider Health Logs ──
      `CREATE TABLE IF NOT EXISTS provider_health_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        provider VARCHAR(60) NOT NULL,
        success BOOLEAN NOT NULL,
        response_time_ms INTEGER,
        error_message TEXT,
        http_status INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE INDEX IF NOT EXISTS provider_health_logs_provider_created_idx ON provider_health_logs (provider, created_at DESC)`,
      // ── Daily Stats Rollup ──
      `CREATE TABLE IF NOT EXISTS daily_stats (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        date VARCHAR(10) NOT NULL,
        total_views INTEGER NOT NULL DEFAULT 0,
        unique_viewers INTEGER NOT NULL DEFAULT 0,
        episodes_completed INTEGER NOT NULL DEFAULT 0,
        new_users INTEGER NOT NULL DEFAULT 0,
        total_watch_minutes INTEGER NOT NULL DEFAULT 0,
        active_users INTEGER NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      )`,
      `CREATE UNIQUE INDEX IF NOT EXISTS daily_stats_date_unique ON daily_stats (date)`,
    ];
    for (const sql of alters) {
      await client.unsafe(sql).catch((e: unknown) =>
        console.error("[migrate] alter failed:", sql, e),
      );
    }

    // Seed / refresh FAQ content so fresh deploys get the full help center.
    for (const cat of FAQ_SEED_CATEGORIES) {
      await client`
        INSERT INTO faq_categories (id, label_key, icon, sort_order)
        VALUES (${cat.id}, ${cat.labelKey}, ${cat.icon}, ${cat.order})
        ON CONFLICT (id) DO UPDATE SET
          label_key = EXCLUDED.label_key,
          icon = EXCLUDED.icon,
          sort_order = EXCLUDED.sort_order
      `.catch((e: unknown) =>
        console.error("[migrate] faq category seed failed:", cat.id, e),
      );
    }
    for (const art of FAQ_SEED_ARTICLES) {
      const tags = JSON.stringify(art.tags);
      const related = JSON.stringify(art.relatedIds);
      await client`
        INSERT INTO faq_articles (
          id, category_id, title, answer, tags, related_slugs,
          popularity, sort_order, updated_at, published
        )
        VALUES (
          ${art.id},
          ${art.category},
          ${art.title},
          ${art.answer},
          ${tags}::jsonb,
          ${related}::jsonb,
          ${art.popularity},
          ${art.order},
          ${art.updatedAt}::timestamp,
          TRUE
        )
        ON CONFLICT (id) DO UPDATE SET
          category_id = EXCLUDED.category_id,
          title = EXCLUDED.title,
          answer = EXCLUDED.answer,
          tags = EXCLUDED.tags,
          related_slugs = EXCLUDED.related_slugs,
          popularity = EXCLUDED.popularity,
          sort_order = EXCLUDED.sort_order,
          updated_at = EXCLUDED.updated_at,
          published = TRUE
      `.catch((e: unknown) =>
        console.error("[migrate] faq article seed failed:", art.id, e),
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

    await client`
      INSERT INTO roles (name, color, permissions)
      VALUES ('donator', '#f472b6', '[]'::jsonb)
      ON CONFLICT (name) DO UPDATE SET
        color = EXCLUDED.color,
        permissions = '[]'::jsonb
    `.catch((e: unknown) => console.error("[migrate] donator role seed failed:", e));

    await client`
      INSERT INTO roles (name, color, permissions)
      VALUES ('timestamp_helper', '#38bdf8', '[]'::jsonb)
      ON CONFLICT (name) DO NOTHING
    `.catch((e: unknown) => console.error("[migrate] timestamp_helper role seed failed:", e));

    for (const tier of [
      { name: "timestamp_rookie", color: "#7dd3fc" },
      { name: "timestamp_helper", color: "#38bdf8" },
      { name: "timestamp_scout", color: "#0ea5e9" },
      { name: "timestamp_curator", color: "#6366f1" },
      { name: "timestamp_veteran", color: "#8b5cf6" },
      { name: "timestamp_master", color: "#d946ef" },
      { name: "timestamp_legend", color: "#f59e0b" },
      { name: "timestamp_oracle", color: "#f43f5e" },
    ] as const) {
      await client`
        INSERT INTO roles (name, color, permissions)
        VALUES (${tier.name}, ${tier.color}, '[]'::jsonb)
        ON CONFLICT (name) DO UPDATE SET color = EXCLUDED.color
      `.catch((e: unknown) =>
        console.error("[migrate] timestamp tier seed failed:", tier.name, e),
      );
    }

    await client`
      INSERT INTO roles (name, color, permissions)
      VALUES ('booster', '#ff73fa', '[]'::jsonb)
      ON CONFLICT (name) DO UPDATE SET
        color = EXCLUDED.color,
        permissions = '[]'::jsonb
    `.catch((e: unknown) => console.error("[migrate] booster role seed failed:", e));

    // Ensure the site owner always has admin role
    await client`UPDATE users SET role = 'admin' WHERE username = 'fampep' AND role != 'admin'`;

    const defaultRolePerms = JSON.stringify(DEFAULT_BUILTIN_PERMISSIONS);
    await client`
      INSERT INTO app_settings (key, value)
      VALUES (${ROLE_PERMISSIONS_KEY}, ${defaultRolePerms})
      ON CONFLICT (key) DO NOTHING
    `.catch((e: unknown) =>
      console.error("[migrate] role permissions seed failed:", e),
    );
  } finally {
    await client.end();
  }
}
