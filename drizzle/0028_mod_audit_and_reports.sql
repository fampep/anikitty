CREATE TABLE IF NOT EXISTS mod_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(40) NOT NULL,
  target_type VARCHAR(20),
  target_id VARCHAR(255),
  target_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  reason TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS mod_audit_log_created_idx ON mod_audit_log (created_at DESC);
CREATE INDEX IF NOT EXISTS mod_audit_log_actor_idx ON mod_audit_log (actor_user_id);

CREATE TABLE IF NOT EXISTS user_reports (
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
);
CREATE INDEX IF NOT EXISTS user_reports_status_idx ON user_reports (status, created_at);
