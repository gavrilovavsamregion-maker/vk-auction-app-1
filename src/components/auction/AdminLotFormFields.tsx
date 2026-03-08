import { useRef } from "react";
import { LotMediaFields } from "@/components/auction/LotMediaFields";
import { LotPriceFields } from "@/components/auction/LotPriceFields";
import { LotAntiSnipeField } from "@/components/auction/LotAntiSnipeField";

export type LotFormState = {
  title: string;
  description: string;
  image: string;
  video: string;
  startPrice: number;
  step: number;
  startsAt: string;
  endsAt: string;
  antiSnipe: boolean;
  antiSnipeMinutes: number;
};

export function AdminLotFormFields({ form, set, isNew, videoUploading, uploadProgress, videoName, setVideoUploading, setUploadProgress, setVideoName, videoUrlRef, imageUploading, setImageUploading, imageInputRef, fileInputRef }: {
  form: LotFormState;
  set: (key: string, val: unknown) => void;
  isNew: boolean;
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
  void isNew;

  return (
    <>
      {/* Название */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Название *</label>
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          placeholder="Например: Картина маслом 60×80"
          className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
        />
      </div>

      <LotMediaFields
        form={form}
        set={set}
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

      {/* Описание */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">Описание</label>
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={3}
          placeholder="Подробное описание лота..."
          className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] resize-none bg-white"
        />
      </div>

      <LotPriceFields form={form} set={set} />

      <LotAntiSnipeField form={form} set={set} />
    </>
  );
}
