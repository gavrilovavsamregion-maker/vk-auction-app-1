ALTER TABLE t_p68201414_vk_auction_app_1.visits ADD COLUMN visit_date DATE;

UPDATE t_p68201414_vk_auction_app_1.visits SET visit_date = CAST(visited_at AS DATE);

ALTER TABLE t_p68201414_vk_auction_app_1.visits ALTER COLUMN visit_date SET NOT NULL;

DROP INDEX IF EXISTS t_p68201414_vk_auction_app_1.visits_user_date_idx;

CREATE UNIQUE INDEX visits_user_date_idx ON t_p68201414_vk_auction_app_1.visits (vk_user_id, visit_date);
