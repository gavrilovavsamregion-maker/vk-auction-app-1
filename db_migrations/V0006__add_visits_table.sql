CREATE TABLE t_p68201414_vk_auction_app_1.visits (
  id SERIAL PRIMARY KEY,
  vk_user_id TEXT NOT NULL,
  user_name TEXT NOT NULL DEFAULT '',
  visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX visits_user_date_idx ON t_p68201414_vk_auction_app_1.visits (vk_user_id, DATE(visited_at AT TIME ZONE 'Europe/Moscow'));
