DROP INDEX IF EXISTS t_p68201414_vk_auction_app_1.visits_user_date_idx;

ALTER TABLE t_p68201414_vk_auction_app_1.visits ALTER COLUMN visited_at TYPE TIMESTAMP;

CREATE UNIQUE INDEX visits_user_date_idx ON t_p68201414_vk_auction_app_1.visits (vk_user_id, CAST(visited_at AS DATE));
