"""
Админ-операции: создание лота, обновление лота, изменение статуса оплаты.
POST / action=create  — создать лот (поддерживает startsAt для отложенного старта)
POST / action=update  — обновить лот (поля + payment_status + startsAt)
POST / action=stop    — остановить лот вручную
"""
import json
import os
import psycopg2
from datetime import datetime, timezone

SCHEMA = "t_p68201414_vk_auction_app_1"

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, X-User-Id, X-User-Name, X-User-Avatar",
}


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def err(msg: str, status: int = 400):
    print(f"[auction-admin] ERROR: {msg}")
    return {"statusCode": status, "headers": CORS, "body": json.dumps({"error": msg})}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    try:
        body = json.loads(event.get("body") or "{}")
    except Exception as e:
        return err(f"invalid JSON: {e}")

    action = body.get("action")
    print(f"[auction-admin] action={action} body_keys={list(body.keys())}")

    try:
        conn = get_conn()
    except Exception as e:
        return err(f"DB connect failed: {e}", 500)

    cur = conn.cursor()

    if action == "create":
        try:
            title = body.get("title", "").replace("'", "''")
            description = body.get("description", "").replace("'", "''")
            image = (body.get("image") or "").replace("'", "''")
            video = (body.get("video") or "").replace("'", "''")
            video_duration = body.get("videoDuration")
            start_price = int(body.get("startPrice", 1000))
            step = int(body.get("step", 100))
            ends_at = body.get("endsAt", "")
            starts_at = body.get("startsAt")
            anti_snipe = "true" if body.get("antiSnipe", True) else "false"
            anti_snipe_min = int(body.get("antiSnipeMinutes", 2))
            vd_sql = f", {int(video_duration)}" if video_duration else ", NULL"

            # Если задан starts_at и он в будущем — создаём как upcoming
            now = datetime.now(timezone.utc)
            if starts_at:
                try:
                    sa = datetime.fromisoformat(starts_at.replace("Z", "+00:00"))
                    initial_status = "upcoming" if sa > now else "active"
                except Exception:
                    initial_status = "active"
                    starts_at = None
            else:
                initial_status = "active"
                starts_at = None

            starts_at_sql = f"'{starts_at}'" if starts_at else "NULL"

            print(f"[auction-admin] create: title={title!r} ends_at={ends_at!r} starts_at={starts_at!r} status={initial_status}")

            cur.execute(f"""
                INSERT INTO {SCHEMA}.lots
                  (title, description, image, video, start_price, current_price, step,
                   starts_at, ends_at, status, anti_snipe, anti_snipe_minutes, video_duration)
                VALUES
                  ('{title}', '{description}', '{image}', '{video}', {start_price}, {start_price}, {step},
                   {starts_at_sql}, '{ends_at}', '{initial_status}', {anti_snipe}, {anti_snipe_min}{vd_sql})
                RETURNING id
            """)
            new_id = cur.fetchone()[0]
            conn.commit()
            conn.close()
            print(f"[auction-admin] created lot id={new_id} status={initial_status}")
            return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True, "id": new_id})}
        except Exception as e:
            conn.rollback()
            conn.close()
            return err(f"create failed: {e}", 500)

    elif action == "update":
        lot_id = int(body.get("lotId", 0))
        fields = []
        if "title" in body:
            v = body["title"].replace("'", "''")
            fields.append(f"title = '{v}'")
        if "description" in body:
            v = body["description"].replace("'", "''")
            fields.append(f"description = '{v}'")
        if "image" in body:
            v = body["image"].replace("'", "''")
            fields.append(f"image = '{v}'")
        if "video" in body:
            v = body["video"].replace("'", "''")
            fields.append(f"video = '{v}'")
        if "startPrice" in body:
            sp = int(body["startPrice"])
            fields.append(f"start_price = {sp}")
            fields.append(f"current_price = {sp}")
        if "step" in body:
            fields.append(f"step = {int(body['step'])}")
        if "startsAt" in body:
            sa = body["startsAt"]
            if sa:
                fields.append(f"starts_at = '{sa}'")
                # Обновляем статус: если starts_at в будущем — upcoming
                try:
                    sa_dt = datetime.fromisoformat(sa.replace("Z", "+00:00"))
                    now = datetime.now(timezone.utc)
                    if sa_dt > now:
                        fields.append("status = 'upcoming'")
                    else:
                        fields.append("status = 'active'")
                except Exception:
                    pass
            else:
                fields.append("starts_at = NULL")
                fields.append("status = 'active'")
        if "endsAt" in body:
            fields.append(f"ends_at = '{body['endsAt']}'")
        if "antiSnipe" in body:
            val = "true" if body["antiSnipe"] else "false"
            fields.append(f"anti_snipe = {val}")
        if "antiSnipeMinutes" in body:
            fields.append(f"anti_snipe_minutes = {int(body['antiSnipeMinutes'])}")
        if "videoDuration" in body:
            vd = body["videoDuration"]
            fields.append(f"video_duration = {int(vd)}" if vd else "video_duration = NULL")
        if "paymentStatus" in body:
            ps = body["paymentStatus"].replace("'", "''")
            fields.append(f"payment_status = '{ps}'")

        if fields:
            cur.execute(f"UPDATE {SCHEMA}.lots SET {', '.join(fields)} WHERE id = {lot_id}")
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    elif action == "stop":
        lot_id = int(body.get("lotId", 0))
        cur.execute(f"""
            UPDATE {SCHEMA}.lots
            SET status = 'cancelled'
            WHERE id = {lot_id} AND status IN ('active', 'upcoming')
        """)
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    elif action == "delete":
        lot_id = int(body.get("lotId", 0))
        cur.execute(f"DELETE FROM {SCHEMA}.auto_bids WHERE lot_id = {lot_id}")
        cur.execute(f"DELETE FROM {SCHEMA}.bids WHERE lot_id = {lot_id}")
        cur.execute(f"DELETE FROM {SCHEMA}.outbid_tracking WHERE lot_id = {lot_id}")
        cur.execute(f"DELETE FROM {SCHEMA}.lots WHERE id = {lot_id}")
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    # ── Получить настройки уведомлений ──────────────────────────────────────
    elif action == "get_notification_config":
        cur.execute(f"SELECT key, enabled FROM {SCHEMA}.notification_config ORDER BY key")
        rows = cur.fetchall()
        cur.execute(f"SELECT COUNT(*) FROM {SCHEMA}.notification_settings WHERE allowed = true")
        subscribers = cur.fetchone()[0]
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({
            "config": [{"key": r[0], "enabled": r[1]} for r in rows],
            "subscribers": subscribers,
        })}

    # ── Обновить настройку уведомлений ──────────────────────────────────────
    elif action == "set_notification_config":
        key = body.get("key", "").replace("'", "''")
        enabled = bool(body.get("enabled", True))
        enabled_sql = "true" if enabled else "false"
        cur.execute(f"""
            INSERT INTO {SCHEMA}.notification_config (key, enabled)
            VALUES ('{key}', {enabled_sql})
            ON CONFLICT (key) DO UPDATE SET enabled = {enabled_sql}, updated_at = NOW()
        """)
        conn.commit()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    conn.close()
    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Неизвестное действие"})}