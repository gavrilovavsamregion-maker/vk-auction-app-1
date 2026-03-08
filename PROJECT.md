# VK Auction App — Описание проекта

## Общее описание

**VK Auction App** — это аукционное приложение для платформы ВКонтакте (VK Mini App). Позволяет сообществам ВКонтакте проводить онлайн-аукционы: создавать лоты, принимать ставки от участников, выявлять победителей и уведомлять их через VK API.

Приложение называется **JOYLOTS** и разработано для группы `joywood_store`.

---

## Стек технологий

### Фронтенд
| Технология | Версия | Назначение |
|---|---|---|
| React | 18.3 | UI-фреймворк |
| TypeScript | 5.5 | Типизация |
| Vite (rolldown-vite) | 7.1 | Сборка |
| TailwindCSS | 3.4 | Стилизация |
| shadcn/ui + Radix UI | — | UI-компоненты |
| React Router DOM | 6.26 | Маршрутизация |
| TanStack React Query | 5.56 | Управление данными |
| @vkontakte/vk-bridge | 2.15 | Интеграция с VK |
| React Hook Form + Zod | — | Формы и валидация |
| lucide-react | 0.462 | Иконки |

### Бэкенд
| Технология | Назначение |
|---|---|
| Python 3 (serverless functions) | Бэкенд-функции на платформе poehali.dev |
| PostgreSQL + psycopg2 | Основная база данных |
| VK API (notifications.sendMessage) | Push-уведомления пользователям |
| boto3 + S3-совместимое хранилище | Загрузка и хранение видео/изображений |

---

## Архитектура

```
vk-auction-app-1/
├── src/                    # Фронтенд (React + TypeScript)
│   ├── api/                # HTTP-клиент для бэкенд-функций
│   ├── components/
│   │   ├── auction/        # Компоненты аукциона
│   │   └── ui/             # UI-компоненты (shadcn/ui)
│   ├── hooks/              # React-хуки
│   ├── pages/              # Страницы приложения
│   ├── types/              # TypeScript-типы
│   └── lib/                # Утилиты
├── backend/                # Серверные функции (Python)
│   ├── auction-lots/       # Получение лотов
│   ├── auction-bid/        # Ставки и автоставки
│   ├── auction-admin/      # Административные операции
│   ├── vk-notify/          # Уведомления через VK API
│   ├── track-visit/        # Аналитика посещений
│   ├── upload-video/       # Загрузка медиафайлов в S3
│   ├── vk-widget/          # Виджет сообщества VK
│   └── func2url.json       # Маппинг функций на URL
└── db_migrations/          # SQL-миграции базы данных (Flyway-style)
```

---

## База данных

Схема: `t_p68201414_vk_auction_app_1`

### Таблицы

#### `lots` — Лоты аукциона
| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | Идентификатор лота |
| `title` | TEXT | Название |
| `description` | TEXT | Описание |
| `image` | TEXT | URL изображения |
| `video` | TEXT | URL видео |
| `video_duration` | INTEGER | Длительность видео (сек.) |
| `start_price` | INTEGER | Начальная цена (₽) |
| `current_price` | INTEGER | Текущая цена (₽) |
| `step` | INTEGER | Шаг ставки (₽) |
| `starts_at` | TIMESTAMPTZ | Время начала (для отложенного старта) |
| `ends_at` | TIMESTAMPTZ | Время окончания |
| `status` | TEXT | `active` / `upcoming` / `finished` / `cancelled` |
| `winner_id` | TEXT | ID победителя |
| `winner_name` | TEXT | Имя победителя |
| `anti_snipe` | BOOLEAN | Защита от снайпинга |
| `anti_snipe_minutes` | INTEGER | Продление при снайпинге (мин.) |
| `payment_status` | TEXT | `pending` / `paid` / `issued` / `cancelled` |
| `notified_15min` | BOOLEAN | Флаг уведомления за 15 мин |

#### `bids` — Ставки
| Поле | Тип | Описание |
|---|---|---|
| `id` | SERIAL PK | Идентификатор |
| `lot_id` | INTEGER FK | Ссылка на лот |
| `user_id` | TEXT | VK ID пользователя |
| `user_name` | TEXT | Имя пользователя |
| `user_avatar` | TEXT | Инициалы/аватар |
| `amount` | INTEGER | Сумма ставки (₽) |
| `created_at` | TIMESTAMPTZ | Время ставки |

#### `auto_bids` — Автоставки
| Поле | Тип | Описание |
|---|---|---|
| `lot_id` | INTEGER | Лот |
| `user_id` | TEXT | Пользователь |
| `max_amount` | INTEGER | Максимальная сумма автоставки |
| `user_name`, `user_avatar` | TEXT | Данные пользователя |

#### `notification_settings` — Разрешения на уведомления
| Поле | Тип | Описание |
|---|---|---|
| `user_id` | TEXT PK | VK ID пользователя |
| `allowed` | BOOLEAN | Разрешил ли уведомления |

#### `notification_config` — Конфигурация уведомлений (глобально)
| Ключ | Описание |
|---|---|
| `outbid` | Уведомление при перебитой ставке |
| `ending_15min` | Уведомление за 15 минут до конца |
| `winner` | Уведомление победителю |

#### `outbid_tracking` — Трекинг уведомлений о перебитых ставках
#### `visits` — Статистика посещений

### Миграции
Применяются в порядке версий Flyway:
| Файл | Содержание |
|---|---|
| `V0001` | Создание таблиц `lots` и `bids` |
| `V0002` | Демо-данные |
| `V0003` | Добавление поля `video` |
| `V0004` | Добавление `video_duration` |
| `V0005` | Добавление `starts_at` и таблица `auto_bids` |
| `V0006` | Таблица `visits` |
| `V0007` | Исправление индекса visits |
| `V0008` | Поле даты по московскому времени |
| `V0009` | Система уведомлений |

---

## Бэкенд-функции

Все функции развёрнуты на платформе **poehali.dev** как serverless. Маппинг URL описан в `backend/func2url.json`.

### `auction-lots` — Получение лотов
**URL:** `https://functions.poehali.dev/a4ff5c7f-b025-48d2-bb94-cc014f6d2568`

- `GET /` — список всех лотов (активных, завершённых, предстоящих) с последними ставками
- `GET /?id=<ID>` — один лот с полной историей ставок
- `GET /?id=<ID>&userId=<VK_ID>` — лот + персональная автоставка пользователя

При каждом вызове автоматически:
- завершает просроченные активные лоты
- активирует лоты с отложенным стартом (`starts_at`)
- отправляет уведомления об окончании за 10–15 минут до конца

### `auction-bid` — Ставки
**URL:** `https://functions.poehali.dev/ba11208b-97ba-4756-b7b9-eba826787166`

- `POST /` `{lotId, amount, userId, userName, userAvatar}` — разместить ставку
- `POST /` `{action: "auto_bid", lotId, maxAmount, userId, ...}` — установить/обновить автоставку
- `POST /` `{action: "allow_notifications", userId}` — разрешить уведомления

**Логика ставок:**
1. Проверяет статус лота и минимальную сумму (`current_price + step`)
2. Защита от снайпинга: если до конца осталось меньше `anti_snipe_minutes` минут, время продлевается
3. После ставки запускает обработку автоставок других участников (цепочка до 20 раундов)
4. Отправляет уведомления участникам, чьи ставки были перебиты

### `auction-admin` — Администрирование
**URL:** `https://functions.poehali.dev/c80458b7-040f-4c1e-afc7-9418aa34e00f`

| Action | Описание |
|---|---|
| `create` | Создать лот (с поддержкой `startsAt` для отложенного старта) |
| `update` | Обновить поля лота / статус оплаты |
| `stop` | Отменить лот (`cancelled`) |
| `delete` | Удалить лот и все его ставки |
| `get_notification_config` | Получить глобальные настройки уведомлений |
| `set_notification_config` | Изменить настройку уведомлений |

### `vk-notify` — Уведомления
**URL:** `https://functions.poehali.dev/cb824367-14f6-4e88-9949-4b6d466a4fb3`

- `POST /` `{userId, message}` — отправить системное уведомление пользователю через `notifications.sendMessage` VK API
- Требует переменную окружения `VK_SERVICE_KEY`

### `track-visit` — Статистика посещений
**URL:** `https://functions.poehali.dev/e8bd7a1d-ec16-415b-ade0-2d0e35b9ba7e`

- `POST /` `{vkUserId, userName}` — записать посещение (upsert по user_id + дата по МСК)
- `GET /?requesterId=<ID>` — статистика (только для хардкод-администраторов)

### `upload-video` — Загрузка медиафайлов
**URL:** `https://functions.poehali.dev/c53d103f-d602-4252-9f2f-8368eccdee4e`

Поддерживает чанковую загрузку видео (5 МБ на чанк, base64 JSON) и прямую загрузку изображений:

| Action | Описание |
|---|---|
| `init` | Инициализировать загрузку → `{uploadId, key}` |
| `chunk` | Загрузить часть файла |
| `complete` | Собрать части, загрузить в S3, вернуть CDN-URL |
| `abort` | Отменить загрузку, удалить временные файлы |
| `upload_image` | Загрузить изображение напрямую |
| `proxy_video_chunk` | Проксировать первые 512 КБ видео для превью |

Хранилище: S3-совместимый сервис `bucket.poehali.dev`, CDN: `cdn.poehali.dev`

### `vk-widget` — Виджет сообщества
**URL:** `https://functions.poehali.dev/f4e406ad-f9d7-4701-a9bf-7f93b9c2c96f`

- `GET /` — данные виджета (список активных лотов в формате VK widget list)
- `POST /` `{communityToken, groupId}` — обновить виджет сообщества через `appWidgets.update`

---

## Фронтенд

### Страницы

| Файл | Описание |
|---|---|
| `src/pages/Index.tsx` | Точка входа. Автоматически определяет мобильный/десктоп режим |
| `src/pages/MobilePage.tsx` | Мобильная версия |
| `src/pages/DesktopPage.tsx` | Десктопная версия |
| `src/pages/VKDesktopPage.tsx` | VK Desktop-клиент |
| `src/pages/NotFound.tsx` | Страница 404 |

### Экраны (для мобильного режима)

Управляются через хук `useAuction` и тип `Screen`:

| Экран | Описание |
|---|---|
| `catalog` | Каталог всех лотов |
| `lot` | Детальная страница лота со ставками |
| `bids` | История ставок пользователя |
| `profile` | Профиль пользователя |
| `admin` | Административная панель |
| `admin-lot` | Форма создания/редактирования лота |

### Ключевые компоненты

| Компонент | Назначение |
|---|---|
| `LotScreens.tsx` | CatalogScreen, LotScreen, BidsScreen, ProfileScreen, BottomNav |
| `AdminScreens.tsx` | AdminScreen, AdminLotForm |
| `DesktopLayout.tsx` | Двухколоночный desktop-лейаут |
| `LotCard.tsx` | Карточка лота в каталоге (мобильная) |
| `DesktopLotCard.tsx` | Карточка лота (десктоп) |
| `LotDetail.tsx` | Детальная страница лота (мобильная) |
| `DesktopLotDetail.tsx` | Детальная страница лота (десктоп) |
| `LotMedia.tsx` | Отображение изображений и видео лота |
| `LotModals.tsx` | Модальные окна (ставка, автоставка) |
| `SubscribeModal.tsx` | Модальное окно подписки на уведомления |
| `AdminLotForm.tsx` | Полная форма создания/редактирования лота |

### Хуки

| Хук | Назначение |
|---|---|
| `useAuction.ts` | Главный хук: загрузка лотов, ставки, состояние экранов, автообновление |
| `useVKUser.ts` | Авторизация через VK Bridge, определение роли администратора |
| `useGroupMember.ts` | Проверка членства пользователя в группе |
| `useIsDesktop.ts` | Определение типа устройства (mobile/desktop) |
| `use-mobile.tsx` | Хук для медиазапросов |

### Автоматическое обновление данных

`useAuction` реализует адаптивный polling:
- Каталог: каждые **1 сек** (если до конца < 2 мин), **5 сек** (< 10 мин), **15 сек** (иначе)
- Страница лота: каждые **1 сек** (если активен и < 2 мин), **5 сек** (иначе)

---

## Типы данных

```typescript
interface Lot {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  videoDuration?: number;
  startPrice: number;
  currentPrice: number;
  step: number;
  startsAt?: Date;
  endsAt: Date;
  status: "active" | "finished" | "upcoming" | "cancelled";
  winnerId?: string;
  winnerName?: string;
  antiSnipe: boolean;
  antiSnipeMinutes: number;
  bids: Bid[];
  paymentStatus?: "pending" | "paid" | "issued" | "cancelled";
  leaderId?: string;
  leaderName?: string;
  leaderAvatar?: string;
  bidCount?: number;
  myAutoBid?: AutoBid;
}

interface Bid {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  createdAt: Date;
}

interface AutoBid {
  maxAmount: number;
  userId: string;
}

interface User {
  id: string;
  numericId?: string;
  name: string;
  avatar: string;
  photoUrl?: string;
  isAdmin: boolean;
}
```

---

## Ключевые функции приложения

### Для участников
- 🏷️ Просмотр каталога аукционных лотов (фото, видео, цена, время)
- 💰 Размещение ставок в реальном времени
- 🤖 **Автоставки** — система автоматически перебивает конкурентов до указанного максимума
- 🔔 VK-уведомления о перебитой ставке и окончании аукциона
- 🏆 Уведомление о победе через VK MessageBox
- 📋 История своих ставок

### Для администраторов
- ➕ Создание лотов с изображением, видео, описанием
- ⏰ Отложенный старт (`startsAt`) — лот автоматически активируется в нужное время
- 🛡️ Защита от снайпинга — автоматическое продление аукциона при ставке в последние N минут
- ✏️ Редактирование и удаление лотов
- 🛑 Ручная остановка аукциона
- 💳 Управление статусом оплаты победителей (`pending → paid → issued`)
- 🔔 Управление глобальными настройками уведомлений
- 📊 Статистика посещений приложения
- 📱 Обновление виджета сообщества VK

---

## Запуск и разработка

```bash
# Установка зависимостей
npm install

# Запуск dev-сервера
npm run dev

# Сборка продакшн
npm run build

# Линтинг
npm run lint
```

В режиме разработки (`DEV`) и без VK-параметров в URL приложение автоматически использует пользователя **Разработчик** с правами администратора.

---

## Переменные окружения (бэкенд)

| Переменная | Используется в | Описание |
|---|---|---|
| `DATABASE_URL` | все функции с БД | Строка подключения PostgreSQL |
| `VK_SERVICE_KEY` | `auction-bid`, `auction-lots`, `vk-notify` | Сервисный ключ VK API |
| `AWS_ACCESS_KEY_ID` | `upload-video` | Ключ S3 |
| `AWS_SECRET_ACCESS_KEY` | `upload-video` | Секрет S3 |
| `MAIN_DB_SCHEMA` | `vk-widget` | Схема БД (по умолчанию `public`) |
| `VK_APP_ID` | `vk-widget` | ID VK Mini App |
