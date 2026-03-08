
-- Таблица настроек уведомлений (разрешения пользователей)
CREATE TABLE t_p68201414_vk_auction_app_1.notification_settings (
    user_id TEXT PRIMARY KEY,
    allowed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Настройки типов уведомлений (глобальные, для админа)
CREATE TABLE t_p68201414_vk_auction_app_1.notification_config (
    key TEXT PRIMARY KEY,
    enabled BOOLEAN NOT NULL DEFAULT true,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO t_p68201414_vk_auction_app_1.notification_config (key, enabled) VALUES
    ('outbid', true),
    ('ending_15min', true),
    ('winner', true);

-- Трекинг outbid-уведомлений (когда последний раз перебили и уведомили)
CREATE TABLE t_p68201414_vk_auction_app_1.outbid_tracking (
    lot_id INTEGER NOT NULL,
    user_id TEXT NOT NULL,
    last_outbid_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_notified_at TIMESTAMPTZ,
    PRIMARY KEY (lot_id, user_id)
);

-- Флаг уведомления за 15 минут для лота
ALTER TABLE t_p68201414_vk_auction_app_1.lots
    ADD COLUMN IF NOT EXISTS notified_15min BOOLEAN NOT NULL DEFAULT false;
