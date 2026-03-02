"""
VK Widget API — отдаёт активные лоты аукциона в формате списка для виджета сообщества ВКонтакте.
GET  / — данные виджета (используется VK для отображения)
POST / — обновить виджет в сообществе (требует community_token и group_id)
"""
import os
import json
import urllib.request
import psycopg2


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def get_widget_data(schema):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()

    cur.execute(f"""
        SELECT
            l.id,
            l.title,
            l.current_price,
            l.status,
            l.ends_at,
            l.image,
            COUNT(b.id) AS bid_count
        FROM {schema}.lots l
        LEFT JOIN {schema}.bids b ON b.lot_id = l.id
        WHERE l.status IN ('active', 'upcoming')
        GROUP BY l.id
        ORDER BY l.status DESC, l.ends_at ASC
        LIMIT 6
    """)

    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def format_price(n):
    return f"{int(n):,}".replace(",", "\u00a0") + "\u00a0₽"


def time_left(ends_at_str):
    from datetime import datetime, timezone
    ends_at = ends_at_str
    if hasattr(ends_at, "tzinfo") and ends_at.tzinfo is None:
        ends_at = ends_at.replace(tzinfo=timezone.utc)
    now = datetime.now(timezone.utc)
    diff = ends_at - now
    total = int(diff.total_seconds())
    if total <= 0:
        return "Завершается"
    h = total // 3600
    m = (total % 3600) // 60
    if h > 0:
        return f"Осталось {h}ч {m}м"
    return f"Осталось {m}м"


def build_widget(rows, app_id):
    rows_out = []
    app_url = f"https://vk.com/app{app_id}" if app_id else "https://vk.com/app54464410"
    for row in rows:
        lot_id, title, current_price, status, ends_at, image, bid_count = row
        item = {
            "title": title,
            "title_url": app_url,
            "button": "Участвовать",
            "button_url": app_url,
            "text": f"{format_price(current_price)} · {bid_count} ставок · {time_left(ends_at)}",
        }
        rows_out.append(item)

    return {
        "type": "list",
        "title": "🔨 Аукционы сообщества",
        "title_url": app_url,
        "rows": rows_out,
    }


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    schema = os.environ.get("MAIN_DB_SCHEMA", "public")
    app_id = os.environ.get("VK_APP_ID", "")

    if event.get("httpMethod") == "GET":
        rows = get_widget_data(schema)
        widget = build_widget(rows, app_id)
        return {"statusCode": 200, "headers": CORS, "body": json.dumps(widget, ensure_ascii=False)}

    if event.get("httpMethod") == "POST":
        body = json.loads(event.get("body") or "{}")
        community_token = body.get("communityToken", "").strip()
        group_id = str(body.get("groupId", "")).strip()

        if not community_token or not group_id:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "communityToken and groupId required"})}

        rows = get_widget_data(schema)
        if not rows:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "Нет активных лотов для виджета. Создайте хотя бы один активный лот."})}
        widget = build_widget(rows, app_id)
        widget_code = json.dumps(widget, ensure_ascii=False)

        import urllib.parse
        params = urllib.parse.urlencode({
            "type": "list",
            "code": f"return {widget_code};",
            "group_id": group_id,
            "v": "5.131",
            "access_token": community_token,
        })
        url = f"https://api.vk.com/method/appWidgets.update?{params}"
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=10) as resp:
            vk_resp = json.loads(resp.read().decode())

        if vk_resp.get("error"):
            err = vk_resp["error"]
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": err.get("error_msg", "VK API error"), "code": err.get("error_code")})}

        return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}

    return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}