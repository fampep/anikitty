ALTER TABLE users ADD COLUMN IF NOT EXISTS kittycoin_balance INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_frame VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_sticker VARCHAR(64);
ALTER TABLE users ADD COLUMN IF NOT EXISTS equipped_icon VARCHAR(64);

CREATE TABLE IF NOT EXISTS user_shop_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_slug VARCHAR(64) NOT NULL,
  purchased_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT user_shop_items_user_slug UNIQUE (user_id, item_slug)
);
CREATE INDEX IF NOT EXISTS user_shop_items_user_id_idx ON user_shop_items (user_id);

CREATE TABLE IF NOT EXISTS kittycoin_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason VARCHAR(64) NOT NULL,
  reference_id VARCHAR(128),
  created_at TIMESTAMP DEFAULT NOW(),
  CONSTRAINT kittycoin_ledger_user_reason_ref UNIQUE (user_id, reason, reference_id)
);
CREATE INDEX IF NOT EXISTS kittycoin_ledger_user_id_idx ON kittycoin_ledger (user_id);
