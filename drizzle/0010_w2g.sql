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
);

CREATE INDEX IF NOT EXISTS w2g_rooms_code_idx ON w2g_rooms (code);

CREATE TABLE IF NOT EXISTS w2g_members (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id      UUID NOT NULL REFERENCES w2g_rooms(id) ON DELETE CASCADE,
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_seen_at TIMESTAMP DEFAULT NOW(),
  joined_at    TIMESTAMP DEFAULT NOW(),
  UNIQUE(room_id, user_id)
);

CREATE INDEX IF NOT EXISTS w2g_members_room_id_idx ON w2g_members (room_id);

CREATE TABLE IF NOT EXISTS w2g_messages (
  id         UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  room_id    UUID NOT NULL REFERENCES w2g_rooms(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body       TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS w2g_messages_room_id_idx ON w2g_messages (room_id);
