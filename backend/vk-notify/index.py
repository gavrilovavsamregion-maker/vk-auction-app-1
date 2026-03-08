"""
Отправка системного уведомления победителю аукциона через VK API.
POST / — { userId, message } — отправить уведомление пользователю ВКонтакте.
"""
import os
import json
import urllib.request
import urllib.parse


CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    if event.get("httpMethod") != "POST":
        return {"statusCode": 405, "headers": CORS, "body": json.dumps({"error": "method not allowed"})}

    body = json.loads(event.get("body") or "{}")
    raw_id = str(body.get("userId", "")).strip()
    if raw_id.startswith("id") and raw_id[2:].isdigit():
        user_id = raw_id[2:]
    elif raw_id.isdigit():
        user_id = raw_id
    else:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": f"Cannot resolve numeric VK id from: {raw_id}"})}
    message = str(body.get("message", "")).strip()

    if not user_id or not message:
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "userId and message required"})}

    service_key = os.environ["VK_SERVICE_KEY"]

    params = urllib.parse.urlencode({
        "user_ids": user_id,
        "message": message,
        "access_token": service_key,
        "v": "5.131",
    })
    url = f"https://api.vk.com/method/notifications.sendMessage?{params}"
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req, timeout=10) as resp:
        vk_resp = json.loads(resp.read().decode())

    print("VK response:", json.dumps(vk_resp, ensure_ascii=False))

    if vk_resp.get("error"):
        err = vk_resp["error"]
        return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": err.get("error_msg", "VK API error"), "code": err.get("error_code")})}

    return {"statusCode": 200, "headers": CORS, "body": json.dumps({"ok": True})}