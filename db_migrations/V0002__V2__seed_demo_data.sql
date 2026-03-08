INSERT INTO t_p68201414_vk_auction_app_1.lots (title, description, image, start_price, current_price, step, ends_at, status, anti_snipe, anti_snipe_minutes)
VALUES
(
  'Картина «Вечер в Питере»',
  'Оригинальная картина маслом на холсте, 60×80 см. Автор — Анна Кузнецова. Работа написана в 2023 году, подпись автора на обороте.',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=600&q=80',
  5000, 8500, 500,
  NOW() + INTERVAL '2 hours 14 minutes',
  'active', true, 2
),
(
  'Handmade украшение «Рассвет»',
  'Браслет ручной работы из натуральных камней: горный хрусталь, розовый кварц. Длина 18 см, застёжка серебро 925.',
  'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=600&q=80',
  1200, 2100, 100,
  NOW() + INTERVAL '25 minutes',
  'active', true, 2
),
(
  'Коллекционная монета СССР 1961',
  'Монета 10 копеек 1961 года, состояние UNC. Оригинал, сертификат подлинности прилагается.',
  'https://images.unsplash.com/photo-1561414927-6d86591d0c4f?w=600&q=80',
  3000, 12500, 500,
  NOW() - INTERVAL '2 hours',
  'finished', false, 2
);

INSERT INTO t_p68201414_vk_auction_app_1.bids (lot_id, user_id, user_name, user_avatar, amount, created_at) VALUES
(1, 'u2', 'Мария П.', 'МП', 8500, NOW() - INTERVAL '5 minutes'),
(1, 'u3', 'Дмитрий К.', 'ДК', 7500, NOW() - INTERVAL '20 minutes'),
(1, 'u1', 'Алексей С.', 'АС', 6500, NOW() - INTERVAL '45 minutes'),
(2, 'u1', 'Алексей С.', 'АС', 2100, NOW() - INTERVAL '2 minutes'),
(2, 'u2', 'Мария П.', 'МП', 1800, NOW() - INTERVAL '10 minutes'),
(3, 'u3', 'Дмитрий К.', 'ДК', 12500, NOW() - INTERVAL '3 hours'),
(3, 'u1', 'Алексей С.', 'АС', 11000, NOW() - INTERVAL '210 minutes');

UPDATE t_p68201414_vk_auction_app_1.lots SET winner_id = 'u3', winner_name = 'Дмитрий К.', payment_status = 'paid' WHERE id = 3;
