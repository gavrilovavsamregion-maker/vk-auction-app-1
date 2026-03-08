"""
Логирование уникальных посещений VK-приложения.
POST / — записать визит пользователя (upsert по user_id + дата)
GET /  — получить статистику (только для админов)
"""
import json
import os
import psycopg2
from datetime import datetime, timezone, timedelta

MSK = timezone(timedelta(hours=3))

SCHEMA = "t_p68201414_vk_auction_app_1"
HARDCODED_ADMINS = {"32129039", "100411622", "dev"}

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    if event.get("httpMethod") == "POST":
        body = json.loads(event.get("body") or "{}")
        vk_user_id = str(body.get("vkUserId", "")).strip()
        user_name = str(body.get("userName", "")).strip()
        if not vk_user_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "vkUserId required"})}

        today_msk = datetime.now(MSK).date()
        cur.execute(
            f"""
            INSERT INTO {SCHEMA}.visits (vk_user_id, user_name, visit_date)
            VALUES (%s, %s, %s)
            ON CONFLICT (vk_user_id, visit_date) DO NOTHING
            """,
            (vk_user_id, user_name, today_msk),
        )
        conn.commit()
        cur.close()
        conn.close()
        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    if event.get("httpMethod") == "GET":
        params = event.get("queryStringParameters") or {}
        requester_id = str(params.get("requesterId", ""))
        if requester_id not in HARDCODED_ADMINS:
            return {"statusCode": 403, "headers": CORS, "body": json.dumps({"error": "forbidden"})}

        cur.execute(f"SELECT COUNT(DISTINCT vk_user_id) FROM {SCHEMA}.visits")
        total_unique = cur.fetchone()[0]

        today_msk = datetime.now(MSK).date()
        cur.execute(
            f"SELECT COUNT(DISTINCT vk_user_id) FROM {SCHEMA}.visits WHERE visit_date = %s",
            (today_msk,),
        )
        today_unique = cur.fetchone()[0]

        cur.execute(
            f"""
            SELECT DISTINCT ON (vk_user_id) vk_user_id, user_name, visited_at
            FROM {SCHEMA}.visits
            ORDER BY vk_user_id, visited_at DESC
            """
        )
        rows = cur.fetchall()
        rows.sort(key=lambda r: r[2], reverse=True)
        recent = [
            {"vkUserId": r[0], "userName": r[1], "visitedAt": r[2].isoformat()}
            for r in rows[:10]
        ]

        cur.close()
        conn.close()
        return {
            "statusCode": 200,
            "headers": CORS,
            "body": json.dumps({"totalUnique": total_unique, "todayUnique": today_unique, "recent": recent}),
        }

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}