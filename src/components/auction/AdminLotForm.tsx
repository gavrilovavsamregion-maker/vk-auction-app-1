import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { AdminLotFormFields, type LotFormState } from "@/components/auction/AdminLotFormFields";

export function AdminLotForm({ lot, onBack, onCancel, onSave }: {
  lot: Partial<Lot> | null;
  onBack?: () => void;
  onCancel?: () => void;
  onSave: (data: Partial<Lot>) => void | Promise<void>;
}) {
  const isNew = !lot?.id;
  function toLocalISO(d: Date) {
    const off = d.getTimezoneOffset();
    const local = new Date(d.getTime() - off * 60000);
    return local.toISOString().slice(0, 16);
  }
  const [form, setForm] = useState<LotFormState>({
    title: lot?.title || "",
    description: lot?.description || "",
    image: lot?.image || "",
    video: lot?.video || "",
    startPrice: lot?.startPrice || 1000,
    step: lot?.step || 100,
    startsAt: lot?.startsAt ? toLocalISO(new Date(lot.startsAt)) : "",
    endsAt: lot?.endsAt ? toLocalISO(new Date(lot.endsAt)) : "",
    antiSnipe: lot?.antiSnipe ?? true,
    antiSnipeMinutes: lot?.antiSnipeMinutes || 2,
  });
  const [videoUploading, setVideoUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUploading, setImageUploading] = useState(false);
  const isS3Video = lot?.video?.startsWith("https://cdn.poehali.dev");
  const [videoName, setVideoName] = useState(isS3Video ? "Видео загружено (CDN)" : lot?.video ? "ВК-видео" : "");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoUrlRef = useRef<string>(lot?.video || "");
  const [saving, setSaving] = useState(false);

  function set(key: string, val: unknown) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  async function handleSave() {
    if (!form.title.trim()) { alert("Введите название лота"); return; }
    if (!form.endsAt) { alert("Выберите дату и время окончания"); return; }
    if (new Date(form.endsAt) <= new Date()) { alert("Дата окончания должна быть в будущем"); return; }
    if (form.startsAt && new Date(form.startsAt) >= new Date(form.endsAt)) { alert("Дата начала должна быть раньше даты окончания"); return; }
    if (!form.startPrice || Number(form.startPrice) <= 0) { alert("Укажите стартовую цену больше 0"); return; }
    if (!form.step || Number(form.step) <= 0) { alert("Укажите шаг аукциона больше 0"); return; }
    setSaving(true);
    try {
      await onSave({
        ...form,
        id: lot?.id ?? "new",
        video: form.video || videoUrlRef.current || undefined,
        startPrice: Number(form.startPrice),
        step: Number(form.step),
        antiSnipeMinutes: Number(form.antiSnipeMinutes),
        startsAt: form.startsAt ? new Date(form.startsAt) : undefined,
        endsAt: new Date(form.endsAt),
      });
      (onBack ?? onCancel)?.();
    } catch (err) {
      alert("Ошибка сохранения: " + String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8] flex items-center gap-3">
        <button onClick={onBack ?? onCancel} className="w-9 h-9 border border-[#E0E0E0] rounded-full flex items-center justify-center shrink-0">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <h1 className="text-[20px] font-bold text-[#1C1C1E]">{isNew ? "Новый лот" : "Редактировать лот"}</h1>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-4 mt-3">
        <AdminLotFormFields
          form={form}
          set={set}
          isNew={isNew}
          videoUploading={videoUploading}
          uploadProgress={uploadProgress}
          videoName={videoName}
          setVideoUploading={setVideoUploading}
          setUploadProgress={setUploadProgress}
          setVideoName={setVideoName}
          videoUrlRef={videoUrlRef}
          imageUploading={imageUploading}
          setImageUploading={setImageUploading}
          imageInputRef={imageInputRef}
          fileInputRef={fileInputRef}
        />

        <button
          onClick={handleSave}
          disabled={saving || videoUploading}
          className="w-full bg-[#2787F5] text-white rounded-xl py-3.5 font-bold text-[16px] disabled:opacity-40 transition-opacity"
        >
          {saving ? "Сохраняем…" : isNew ? "Создать лот" : "Сохранить изменения"}
        </button>
      </div>
    </div>
  );
}