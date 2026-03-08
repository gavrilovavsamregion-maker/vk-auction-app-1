CREATE TABLE IF NOT EXISTS t_p68201414_vk_auction_app_1.lots (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  image TEXT DEFAULT '',
  start_price INTEGER NOT NULL DEFAULT 1000,
  current_price INTEGER NOT NULL DEFAULT 1000,
  step INTEGER NOT NULL DEFAULT 100,
  ends_at TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  winner_id TEXT,
  winner_name TEXT,
  anti_snipe BOOLEAN NOT NULL DEFAULT true,
  anti_snipe_minutes INTEGER NOT NULL DEFAULT 2,
  payment_status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS t_p68201414_vk_auction_app_1.bids (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER NOT NULL REFERENCES t_p68201414_vk_auction_app_1.lots(id),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL DEFAULT '',
  amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON t_p68201414_vk_auction_app_1.bids(lot_id);
CREATE INDEX IF NOT EXISTS idx_bids_lot_created ON t_p68201414_vk_auction_app_1.bids(lot_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lots_status ON t_p68201414_vk_auction_app_1.lots(status);
