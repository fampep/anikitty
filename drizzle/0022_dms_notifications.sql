-- Direct messages + user notifications

CREATE TABLE IF NOT EXISTS dm_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_activity_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT dm_conversations_pair UNIQUE (participant_a_id, participant_b_id)
);

CREATE INDEX IF NOT EXISTS dm_conversations_activity_idx ON dm_conversations (last_activity_at DESC);

CREATE TABLE IF NOT EXISTS dm_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  gif_url TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS dm_messages_conv_created_idx ON dm_messages (conversation_id, created_at);

CREATE TABLE IF NOT EXISTS dm_read_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES dm_conversations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT dm_read_state_conv_user UNIQUE (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS user_notifications (
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
);

CREATE INDEX IF NOT EXISTS user_notifications_user_created_idx ON user_notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS user_notifications_user_unread_idx ON user_notifications (user_id, read_at);
