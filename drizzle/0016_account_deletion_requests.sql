-- Fixed migration (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS account_deletion_requests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW()
);
