import Icon from "@/components/ui/icon";
import type { LotFormState } from "@/components/auction/AdminLotFormFields";

export function LotAntiSnipeField({ form, set }: {
  form: LotFormState;
  set: (key: string, val: unknown) => void;
}) {
  return (
    <div className="bg-[#F0F2F5] rounded-2xl p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon name="Shield" size={16} className="text-[#2787F5]" />
          <span className="font-semibold text-[14px] text-[#1C1C1E]">Анти-снайпинг</span>
        </div>
        <button
          onClick={() => set("antiSnipe", !form.antiSnipe)}
          className={`w-11 h-6 rounded-full transition-colors relative ${form.antiSnipe ? "bg-[#2787F5]" : "bg-[#C7C7CC]"}`}
        >
          <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${form.antiSnipe ? "left-5" : "left-0.5"}`} />
        </button>
      </div>
      <p className="text-xs text-[#767676] mb-2">Если ставка сделана в последние минуты, аукцион продлится автоматически</p>
      {form.antiSnipe && (
        <div className="flex items-center gap-3 bg-white rounded-xl p-2.5">
          <p className="text-sm text-[#1C1C1E] flex-1">Продлить на</p>
          <input
            type="number"
            value={form.antiSnipeMinutes}
            onChange={(e) => set("antiSnipeMinutes", e.target.value)}
            min={1}
            max={30}
            className="w-14 border border-[#E0E0E0] rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-[#2787F5]"
          />
          <p className="text-sm text-[#767676]">минут</p>
        </div>
      )}
    </div>
  );
}
