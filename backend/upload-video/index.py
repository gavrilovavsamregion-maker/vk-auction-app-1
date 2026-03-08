"""
Загрузка видео в S3 чанками (5МБ base64 JSON).
action=init     — начать { filename, contentType } → { uploadId, key }
action=chunk    — { uploadId, key, partNumber, data(base64) } → { ok }
action=complete — { uploadId, key, contentType } → { url }
action=abort    — { uploadId, key } → { ok }
"""
import json
import os
import uuid
import base64
import glob as _glob
import boto3

CORS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
}

BUCKET = "files"
TMP = "/tmp"


def get_s3():
    return boto3.client(
        "s3",
        endpoint_url="https://bucket.poehali.dev",
        aws_access_key_id=os.environ["AWS_ACCESS_KEY_ID"],
        aws_secret_access_key=os.environ["AWS_SECRET_ACCESS_KEY"],
    )


def ok(data: dict):
    return {"statusCode": 200, "headers": CORS, "body": json.dumps(data)}


def handler(event: dict, context) -> dict:
    if event.get("httpMethod") == "OPTIONS":
        return {"statusCode": 200, "headers": CORS, "body": ""}

    body = json.loads(event.get("body") or "{}")
    action = body.get("action")

    if action == "init":
        filename = body.get("filename", "video.mp4")
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "mp4"
        upload_id = str(uuid.uuid4())
        key = f"videos/{uuid.uuid4()}.{ext}"
        return ok({"uploadId": upload_id, "key": key})

    elif action == "chunk":
        upload_id = body["uploadId"]
        part_number = int(body["partNumber"])
        data = base64.b64decode(body["data"])
        chunk_path = f"{TMP}/{upload_id}_{part_number:04d}.part"
        with open(chunk_path, "wb") as f:
            f.write(data)
        return ok({"ok": True, "part": part_number})

    elif action == "complete":
        upload_id = body["uploadId"]
        key = body["key"]
        content_type = body.get("contentType", "video/mp4")
        total_parts = int(body.get("totalParts", 0))

        # Собираем чанки в правильном порядке
        parts = sorted(
            _glob.glob(f"{TMP}/{upload_id}_*.part"),
            key=lambda p: int(p.rsplit("_", 1)[-1].replace(".part", ""))
        )
        if not parts:
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "no parts found"})}

        # Конкатенируем в один файл
        merged_path = f"{TMP}/{upload_id}.bin"
        with open(merged_path, "wb") as out:
            for p in parts:
                with open(p, "rb") as f:
                    out.write(f.read())

        # Заливаем в S3
        s3 = get_s3()
        with open(merged_path, "rb") as f:
            s3.put_object(Bucket=BUCKET, Key=key, Body=f.read(), ContentType=content_type)

        # Чистим временные файлы
        for p in parts:
            os.remove(p)
        os.remove(merged_path)

        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return ok({"url": cdn_url})

    elif action == "upload_image":
        filename = body.get("filename", "photo.jpg")
        content_type = body.get("contentType", "image/jpeg")
        ext = filename.rsplit(".", 1)[-1] if "." in filename else "jpg"
        data = base64.b64decode(body["data"])
        key = f"images/{uuid.uuid4()}.{ext}"
        s3 = get_s3()
        s3.put_object(Bucket=BUCKET, Key=key, Body=data, ContentType=content_type)
        cdn_url = f"https://cdn.poehali.dev/projects/{os.environ['AWS_ACCESS_KEY_ID']}/bucket/{key}"
        return ok({"url": cdn_url})

    elif action == "abort":
        upload_id = body.get("uploadId", "")
        for p in _glob.glob(f"{TMP}/{upload_id}_*.part"):
            os.remove(p)
        return ok({"ok": True})

    elif action == "proxy_video_chunk":
        # Скачиваем первые 512KB видео и возвращаем base64 — достаточно для seeked-кадра
        import urllib.request
        video_url = body.get("url", "")
        if not video_url.startswith("https://cdn.poehali.dev"):
            return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "invalid url"})}
        req = urllib.request.Request(video_url, headers={"Range": "bytes=0-524288"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            chunk = resp.read()
        return ok({"data": base64.b64encode(chunk).decode(), "contentType": "video/mp4"})

    return {"statusCode": 400, "headers": CORS, "body": json.dumps({"error": "unknown action"})}