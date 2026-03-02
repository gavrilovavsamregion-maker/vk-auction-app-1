"""
Ставки и автоставки.
POST / {lotId, amount, userId, userName, userAvatar} — разместить ставку
POST / {action: "auto_bid", lotId, maxAmount, userId, userName, userAvatar} — установить/обновить автоставку
POST / {action: "allow_notifications", userId} — сохранить разрешение на уведомления
После каждой ставки проверяет автоставки других участников и перебивает при необходимости.
После ставки обновляет outbid_tracking и при необходимости отправляет уведомления.
"""
import json
import os
import urllib.request
import urllib.parse
import psycopg2
from datetime import datetime, timezone, timedelta

SCHEMA = "t_p68201414_vk_auction_app_1"
OUTBID_COOLDOWN_MINUTES = 5

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-User-Name, X-User-Avatar",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def is_notification_enabled(cur, key: str) -> bool:
    cur.execute(f"SELECT enabled FROM {SCHEMA}.notification_config WHERE key = '{key}'")
    row = cur.fetchone()
    return row[0] if row else False


def send_vk_notification(user_id: str, message: str):
    """Отправить уведомление через VK API."""
    raw = str(user_id).strip()
    if raw.startswith("id") and raw[2:].isdigit():
        numeric_id = raw[2:]
    elif raw.isdigit():
        numeric_id = raw
    else:
        print(f"[notify] cannot resolve numeric id from: {raw}")
        return

    service_key = os.environ.get("VK_SERVICE_KEY", "")
    if not service_key:
        return

    params = urllib.parse.urlencode({
        "user_ids": numeric_id,
        "message": message,
        "access_token": service_key,
        "v": "5.131",
    })
    url = f"https://api.vk.com/method/notifications.sendMessage?{params}"
    try:
        with urllib.request.urlopen(urllib.request.Request(url), timeout=5) as resp:
            result = json.loads(resp.read().decode())
            print(f"[notify] VK response for {numeric_id}: {result}")
    except Exception as e:
        print(f"[notify] VK send error: {e}")


def notify_outbid_users(conn, cur, lot_id: int, new_leader_id: str, lot_title: str, new_price: int):
    """
    Обновляет outbid_tracking для всех кого перебили.
    Отправляет уведомление тем, кто не лидер и чей таймер истёк (>= COOLDOWN).
    """
    if not is_notification_enabled(cur, "outbid"):
        return

    now = datetime.now(timezone.utc)
    uid = new_leader_id.replace("'", "''")

    # Все уникальные участники лота кроме нового лидера
    cur.execute(f"""
        SELECT DISTINCT user_id FROM {SCHEMA}.bids
        WHERE lot_id = {lot_id} AND user_id != '{uid}'
    """)
    participants = [row[0] for row in cur.fetchall()]

    for p_uid in participants:
        p_uid_safe = p_uid.replace("'", "''")

        # Обновляем/создаём запись в outbid_tracking
        cur.execute(f"""
            INSERT INTO {SCHEMA}.outbid_tracking (lot_id, user_id, last_outbid_at)
            VALUES ({lot_id}, '{p_uid_safe}', '{now.isoformat()}')
            ON CONFLICT (lot_id, user_id) DO UPDATE
              SET last_outbid_at = '{now.isoformat()}'
        """)

    conn.commit()

    # Проверяем кому нужно отправить уведомление
    cutoff = now - timedelta(minutes=OUTBID_COOLDOWN_MINUTES)
    cur.execute(f"""
        SELECT ot.user_id
        FROM {SCHEMA}.outbid_tracking ot
        JOIN {SCHEMA}.notification_settings ns ON ns.user_id = ot.user_id
        WHERE ot.lot_id = {lot_id}
          AND ot.user_id != '{uid}'
          AND ns.allowed = true
          AND ot.last_outbid_at >= '{cutoff.isoformat()}'
          AND (ot.last_notified_at IS NULL OR ot.last_notified_at < ot.last_outbid_at - INTERVAL '{OUTBID_COOLDOWN_MINUTES} minutes')
    """)
    to_notify = [row[0] for row in cur.fetchall()]

    for p_uid in to_notify:
        p_uid_safe = p_uid.replace("'", "''")
        message = f"Вашу ставку перебили в аукционе «{lot_title}»! Текущая цена: {new_price:,} ₽. Не упустите лот!".replace(",", " ")
        send_vk_notification(p_uid, message)
        cur.execute(f"""
            UPDATE {SCHEMA}.outbid_tracking
            SET last_notified_at = '{now.isoformat()}'
            WHERE lot_id = {lot_id} AND user_id = '{p_uid_safe}'
        """)

    if to_notify:
        conn.commit()


def place_bid_internal(cur, lot_id: int, amount: int, user_id: str, user_name: str, user_avatar: str, now: datetime):
    """Разместить ставку. Возвращает (bid_id, new_ends_at, extended, lot_title) или бросает исключение."""
    cur.execute(f"""
        SELECT id, current_price, step, ends_at, status, anti_snipe, anti_snipe_minutes, title
        FROM {SCHEMA}.lots WHERE id = {lot_id}
        FOR UPDATE
    """)
    row = cur.fetchone()
    if not row:
        raise ValueError("Лот не найден")

    lid, current_price, step, ends_at, status, anti_snipe, anti_snipe_min, title = row

    if status != 'active' or ends_at <= now:
        raise ValueError("Аукцион уже завершён")

    min_bid = current_price + step
    if int(amount) < min_bid:
        raise ValueError(f"Ставка слишком маленькая. Минимум: {min_bid} ₽")

    new_ends_at = ends_at
    extended = False
    if anti_snipe:
        ms_left = (ends_at - now).total_seconds()
        if 0 < ms_left < anti_snipe_min * 60:
            new_ends_at = ends_at + timedelta(minutes=anti_snipe_min)
            extended = True

    uid = user_id.replace("'", "''")
    uname = user_name.replace("'", "''")
    uavatar = user_avatar.replace("'", "''")

    cur.execute(f"""
        INSERT INTO {SCHEMA}.bids (lot_id, user_id, user_name, user_avatar, amount)
        VALUES ({lot_id}, '{uid}', '{uname}', '{uavatar}', {int(amount)})
        RETURNING id
    """)
    bid_id = cur.fetchone()[0]

    cur.execute(f"""
        UPDATE {SCHEMA}.lots
        SET current_price = {int(amount)}, ends_at = '{new_ends_at.isoformat()}'
        WHERE id = {lot_id}
    """)

    return bid_id, new_ends_at, extended, title


def process_auto_bids(conn, cur, lot_id: int, current_price: int, current_leader_id: str):
    """После ставки проверяем автоставки в цикле, пока есть кому перебивать."""
    leader_id = current_leader_id
    MAX_ROUNDS = 20

    for _ in range(MAX_ROUNDS):
        now = datetime.now(timezone.utc)

        cur.execute(f"""
            SELECT id, current_price, step, ends_at, status, title
            FROM {SCHEMA}.lots WHERE id = {lot_id} FOR UPDATE
        """)
        row = cur.fetchone()
        if not row:
            return
        _, cp, step, ends_at, status, lot_title = row
        if status != 'active' or ends_at <= now:
            return

        next_bid = cp + step
        cur.execute(f"""
            SELECT user_id, user_name, user_avatar, max_amount
            FROM {SCHEMA}.auto_bids
            WHERE lot_id = {lot_id}
              AND user_id != '{leader_id.replace("'", "''")}'
              AND max_amount >= {next_bid}
            ORDER BY max_amount DESC, created_at ASC
            LIMIT 1
        """)
        auto = cur.fetchone()
        if not auto:
            return

        auto_uid, auto_uname, auto_uavatar, auto_max = auto

        try:
            cur.execute("BEGIN")
            place_bid_internal(cur, lot_id, next_bid, auto_uid, auto_uname, auto_uavatar, now)
            cur.execute(f"""
                DELETE FROM {SCHEMA}.auto_bids
                WHERE lot_id = {lot_id} AND max_amount < {next_bid}
            """)
            conn.commit()
            print(f"[auto-bid] auto bid placed: lot={lot_id} user={auto_uid} amount={next_bid}")
            notify_outbid_users(conn, cur, lot_id, auto_uid, lot_title, next_bid)
            leader_id = auto_uid
        except Exception as e:
            print(f"[auto-bid] skip: {e}")
            try:
                conn.rollback()
            except Exception:
                pass
            return


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action", "place_bid")
    lot_id = body.get("lotId")
    user_id = body.get("userId", "guest")
    user_name = body.get("userName", "Участник")
    user_avatar = body.get("userAvatar", "??")

    if not lot_id and action not in ("allow_notifications",):
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан лот"})}

    if not user_id or user_id in ("guest", "dev"):
        return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "Необходимо войти через ВКонтакте"})}

    # ── Сохранить разрешение на уведомления ─────────────────────────────────
    if action == "allow_notifications":
        conn = get_conn()
        cur = conn.cursor()
        uid = user_id.replace("'", "''")
        cur.execute(f"""
            INSERT INTO {SCHEMA}.notification_settings (user_id, allowed)
            VALUES ('{uid}', true)
            ON CONFLICT (user_id) DO UPDATE SET allowed = true, updated_at = NOW()
        """)
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── Установить/обновить автоставку ───────────────────────────────────────
    if action == "auto_bid":
        max_amount = body.get("maxAmount")
        if not max_amount:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указан максимум"})}

        conn = get_conn()
        cur = conn.cursor()

        uid = user_id.replace("'", "''")
        uname = user_name.replace("'", "''")
        uavatar = user_avatar.replace("'", "''")

        cur.execute(f"SELECT status FROM {SCHEMA}.lots WHERE id = {int(lot_id)}")
        row = cur.fetchone()
        if not row or row[0] != 'active':
            conn.close()
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Аукцион не активен"})}

        cur.execute(f"""
            INSERT INTO {SCHEMA}.auto_bids (lot_id, user_id, user_name, user_avatar, max_amount)
            VALUES ({int(lot_id)}, '{uid}', '{uname}', '{uavatar}', {int(max_amount)})
            ON CONFLICT (lot_id, user_id) DO UPDATE
              SET max_amount = EXCLUDED.max_amount,
                  user_name = EXCLUDED.user_name,
                  user_avatar = EXCLUDED.user_avatar
        """)
        conn.commit()

        cur.execute(f"""
            SELECT current_price, step, title
            FROM {SCHEMA}.lots WHERE id = {int(lot_id)} FOR UPDATE
        """)
        lot_row = cur.fetchone()
        if lot_row:
            cp, step, lot_title = lot_row
            cur.execute(f"""
                SELECT user_id FROM {SCHEMA}.bids
                WHERE lot_id = {int(lot_id)}
                ORDER BY amount DESC, created_at ASC
                LIMIT 1
            """)
            leader_row = cur.fetchone()
            current_leader_id = leader_row[0] if leader_row else None
            if current_leader_id != user_id and int(max_amount) >= cp + step:
                try:
                    cur.execute("BEGIN")
                    place_bid_internal(cur, int(lot_id), cp + step, user_id, user_name, user_avatar, datetime.now(timezone.utc))
                    conn.commit()
                    notify_outbid_users(conn, cur, int(lot_id), user_id, lot_title, cp + step)
                    print(f"[auto-bid] immediate auto bid: lot={lot_id} user={user_id} amount={cp + step}")
                except Exception as e:
                    print(f"[auto-bid] immediate skip: {e}")
                    try:
                        conn.rollback()
                    except Exception:
                        pass

        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── Разместить обычную ставку ─────────────────────────────────────────────
    amount = body.get("amount")
    if not amount:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Не указана сумма"})}

    conn = get_conn()
    cur = conn.cursor()
    now = datetime.now(timezone.utc)

    try:
        bid_id, new_ends_at, extended, lot_title = place_bid_internal(
            cur, int(lot_id), int(amount), user_id, user_name, user_avatar, now
        )
        conn.commit()
    except ValueError as e:
        conn.rollback()
        conn.close()
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": str(e)})}

    result = {
        "ok": True,
        "bidId": bid_id,
        "newPrice": int(amount),
        "extended": extended,
        "newEndsAt": new_ends_at.isoformat(),
    }

    try:
        process_auto_bids(conn, cur, int(lot_id), int(amount), user_id)
    except Exception as e:
        print(f"[auto-bid] error: {e}")

    try:
        notify_outbid_users(conn, cur, int(lot_id), user_id, lot_title, int(amount))
    except Exception as e:
        print(f"[notify] outbid error: {e}")

    conn.close()
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(result)}
