import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { LotFormState } from "@/components/auction/AdminLotFormFields";

const UPLOAD_URL = "https://functions.poehali.dev/c53d103f-d602-4252-9f2f-8368eccdee4e";

const toBase64 = (blob: Blob): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(blob);
  });

export function LotMediaFields({ form, set, videoUploading, uploadProgress, videoName, setVideoUploading, setUploadProgress, setVideoName, videoUrlRef, imageUploading, setImageUploading, imageInputRef, fileInputRef }: {
  form: LotFormState;
  set: (key: string, val: unknown) => void;
  videoUploading: boolean;
  uploadProgress: number;
  videoName: string;
  setVideoUploading: (v: boolean) => void;
  setUploadProgress: (v: number) => void;
  setVideoName: (v: string) => void;
  videoUrlRef: React.MutableRefObject<string>;
  imageUploading: boolean;
  setImageUploading: (v: boolean) => void;
  imageInputRef: React.RefObject<HTMLInputElement>;
  fileInputRef: React.RefObject<HTMLInputElement>;
}) {
  const [thumbLoading, setThumbLoading] = useState(false);

  async function handleExtractThumb() {
    const videoUrl = form.video || videoUrlRef.current;
    if (!videoUrl?.startsWith("https://cdn.poehali.dev")) return;
    setThumbLoading(true);
    try {
      const proxyResp = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "proxy_video_chunk", url: videoUrl }),
      });
      const { data: b64, contentType } = await proxyResp.json();
      const byteArr = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const videoBlob = new Blob([byteArr], { type: contentType || "video/mp4" });
      const blobUrl = URL.createObjectURL(videoBlob);
      await new Promise<void>((resolve, reject) => {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.muted = true;
        video.playsInline = true;
        video.src = blobUrl;
        video.currentTime = 0.1;
        video.addEventListener("seeked", async () => {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 360;
          const ctx = canvas.getContext("2d");
          if (!ctx) { URL.revokeObjectURL(blobUrl); reject(new Error("no ctx")); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          URL.revokeObjectURL(blobUrl);
          canvas.toBlob(async (blob) => {
            if (!blob) { reject(new Error("no blob")); return; }
            const data = await toBase64(blob);
            const thumbName = videoUrl.split("/").pop()?.replace(/\.[^.]+$/, "") + "_thumb.jpg";
            const resp = await fetch(UPLOAD_URL, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ action: "upload_image", filename: thumbName, contentType: "image/jpeg", data }),
            });
            const { url: thumbUrl } = await resp.json();
            if (thumbUrl) set("image", thumbUrl);
            resolve();
          }, "image/jpeg", 0.85);
        }, { once: true });
        video.addEventListener("error", () => { URL.revokeObjectURL(blobUrl); reject(new Error("video load error")); }, { once: true });
      });
    } catch (e) {
      alert("Не удалось извлечь кадр: " + String(e));
    }
    setThumbLoading(false);
  }

  async function handleImageFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true);
    try {
      const data = await toBase64(file);
      const resp = await fetch(UPLOAD_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "upload_image", filename: file.name, contentType: file.type, data }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const { url } = await resp.json();
      if (url) { set("image", url); } else { alert("Ошибка загрузки фото"); }
    } catch (err) {
      alert("Ошибка загрузки фото: " + String(err));
    }
    setImageUploading(false);
    if (imageInputRef.current) imageInputRef.current.value = "";
  }

  function extractVideoThumbnail(file: File, videoUrl: string, setField: (k: string, v: unknown) => void) {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(file);
    video.src = objectUrl;
    video.currentTime = 1;
    video.addEventListener("seeked", () => {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 360;
      const ctx = canvas.getContext("2d");
      if (!ctx) { URL.revokeObjectURL(objectUrl); return; }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(async (blob) => {
        URL.revokeObjectURL(objectUrl);
        if (!blob) return;
        try {
          const data = await toBase64(blob);
          const thumbName = videoUrl.split("/").pop()?.replace(/\.[^.]+$/, "") + "_thumb.jpg";
          const resp = await fetch(UPLOAD_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "upload_image", filename: thumbName, contentType: "image/jpeg", data }),
          });
          if (!resp.ok) return;
          const { url: thumbUrl } = await resp.json();
          if (thumbUrl) setField("image", thumbUrl);
        } catch (e) { void e; }
      }, "image/jpeg", 0.85);
    }, { once: true });
    video.addEventListener("error", () => URL.revokeObjectURL(objectUrl), { once: true });
  }

  async function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoUploading(true);
    setUploadProgress(0);
    setVideoName(file.name);
    const CHUNK_SIZE = 256 * 1024;
    const api = async (body: object, retries = 3): Promise<Record<string, unknown>> => {
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const r = await fetch(UPLOAD_URL, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          if (!r.ok) throw new Error(`HTTP ${r.status}`);
          return r.json();
        } catch (e) {
          if (attempt === retries) throw e;
          await new Promise(r => setTimeout(r, 1000 * attempt));
        }
      }
      throw new Error("max retries");
    };
    try {
      const { uploadId, key } = await api({ action: "init", filename: file.name, contentType: file.type });
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      for (let i = 0; i < totalChunks; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const data = await toBase64(chunk);
        await api({ action: "chunk", key, uploadId, partNumber: i + 1, data });
        setUploadProgress(Math.round(((i + 1) / totalChunks) * 95));
      }
      const { url } = await api({ action: "complete", key, uploadId, totalParts: totalChunks, contentType: file.type });
      if (url) {
        videoUrlRef.current = url as string;
        set("video", url);
        setUploadProgress(100);
        extractVideoThumbnail(file, url as string, set);
      } else {
        await api({ action: "abort", key, uploadId });
        alert("Ошибка завершения загрузки");
      }
    } catch (err) {
      alert("Ошибка загрузки: " + String(err));
    }
    setVideoUploading(false);
  }

  return (
    <>
      {/* Фото */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Фото</label>
        <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageFile} />
        <div className="flex gap-2">
          <input
            value={form.image}
            onChange={(e) => set("image", e.target.value)}
            placeholder="https://example.com/photo.jpg"
            className="flex-1 border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white min-w-0"
          />
          {(form.video || videoUrlRef.current)?.startsWith("https://cdn.poehali.dev") && (
            <button
              onClick={handleExtractThumb}
              disabled={thumbLoading}
              title="Взять кадр из видео"
              className="shrink-0 w-11 h-11 rounded-xl border border-[#E0E0E0] bg-white flex items-center justify-center text-[#C9A84C] active:opacity-70 disabled:opacity-40"
            >
              <Icon name={thumbLoading ? "Loader" : "Clapperboard"} size={18} className={thumbLoading ? "animate-spin" : ""} />
            </button>
          )}
          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={imageUploading}
            title="Загрузить фото с устройства"
            className="shrink-0 w-11 h-11 rounded-xl border border-[#E0E0E0] bg-white flex items-center justify-center text-[#2787F5] active:opacity-70 disabled:opacity-40"
          >
            <Icon name={imageUploading ? "Loader" : "ImagePlus"} size={18} className={imageUploading ? "animate-spin" : ""} />
          </button>
        </div>
        {form.image && form.image.startsWith("http") && (
          <img src={form.image} alt="preview" className="mt-2 w-full h-32 object-cover rounded-xl border border-[#E0E0E0]" />
        )}
      </div>

      {/* Видео */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Видео</label>
        <input ref={fileInputRef} type="file" accept="video/*" className="hidden" onChange={handleVideoFile} />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={videoUploading}
          className="w-full rounded-xl py-3 text-[14px] font-medium flex items-center justify-center gap-2 transition-opacity active:opacity-70 disabled:opacity-50"
          style={{ border: "1.5px dashed #C9A84C", background: "#FDF9F0", color: "#B8922A" }}
        >
          <Icon name={videoUploading ? "Loader" : "Upload"} size={16} className={videoUploading ? "animate-spin" : ""} />
          {videoUploading ? "Загружаем видео…" : videoName ? "Заменить видео" : "Загрузить видео с телефона"}
        </button>
        {videoUploading && (
          <div className="mt-2">
            <div className="flex justify-between text-[11px] text-[#B8A070] mb-1">
              <span>{videoName}</span>
              <span>{uploadProgress}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-[#EDE0C8] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%`, background: "linear-gradient(90deg, #C9A84C, #E8C96B)" }}
              />
            </div>
            <p className="text-[11px] text-[#B8A070] mt-1">
              {uploadProgress < 40 ? "Подготовка файла…" : uploadProgress < 95 ? "Загрузка на сервер…" : "Завершаем…"}
            </p>
          </div>
        )}
        {videoName && !videoUploading && (
          <p className="text-[11px] text-[#B8A070] mt-1.5 flex items-center gap-1">
            <Icon name="CheckCircle" size={11} className="text-green-500" />
            {videoName}
          </p>
        )}
        {form.video && !videoUploading && (
          <button onClick={() => { set("video", ""); setVideoName(""); }} className="text-[11px] text-red-400 mt-1">
            Удалить видео
          </button>
        )}
      </div>
    </>
  );
}