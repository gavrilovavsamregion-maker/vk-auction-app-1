ALTER TABLE t_p68201414_vk_auction_app_1.lots
  ADD COLUMN IF NOT EXISTS starts_at TIMESTAMP WITH TIME ZONE NULL;

CREATE TABLE IF NOT EXISTS t_p68201414_vk_auction_app_1.auto_bids (
  id SERIAL PRIMARY KEY,
  lot_id INTEGER NOT NULL REFERENCES t_p68201414_vk_auction_app_1.lots(id),
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT NOT NULL DEFAULT '',
  max_amount INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(lot_id, user_id)
);
