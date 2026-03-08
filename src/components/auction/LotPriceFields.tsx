import Icon from "@/components/ui/icon";
import type { LotFormState } from "@/components/auction/AdminLotFormFields";

function toLocalISO(d: Date) {
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60000);
  return local.toISOString().slice(0, 16);
}

function applyDuration(startsAt: string, hours: number, set: (k: string, v: unknown) => void) {
  const base = startsAt ? new Date(startsAt) : new Date();
  const end = new Date(base.getTime() + hours * 3600000);
  set("endsAt", toLocalISO(end));
}

export function LotPriceFields({ form, set }: {
  form: LotFormState;
  set: (key: string, val: unknown) => void;
}) {
  const hasDelayedStart = Boolean(form.startsAt);

  return (
    <>
      {/* Цена и шаг */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "Стартовая цена, ₽", key: "startPrice" },
          { label: "Минимальный шаг, ₽", key: "step" },
        ].map((f) => (
          <div key={f.key}>
            <label className="text-[12px] font-semibold text-[#767676] mb-1.5 block uppercase tracking-wide">{f.label}</label>
            <input
              type="number"
              value={(form as Record<string, unknown>)[f.key] as number}
              onChange={(e) => set(f.key, e.target.value)}
              className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
            />
          </div>
        ))}
      </div>

      {/* Отложенный старт */}
      <div className="bg-[#F0F2F5] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <Icon name="CalendarClock" size={16} className="text-[#2787F5]" />
            <span className="font-semibold text-[14px] text-[#1C1C1E]">Отложенный старт</span>
          </div>
          <button
            onClick={() => {
              if (hasDelayedStart) {
                set("startsAt", "");
              } else {
                const now = new Date();
                now.setMinutes(now.getMinutes() + 30);
                set("startsAt", toLocalISO(now));
              }
            }}
            className={`w-11 h-6 rounded-full transition-colors relative ${hasDelayedStart ? "bg-[#2787F5]" : "bg-[#C7C7CC]"}`}
          >
            <div className={`w-5 h-5 bg-white rounded-full shadow absolute top-0.5 transition-all ${hasDelayedStart ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        <p className="text-xs text-[#767676] mb-3">Аукцион будет виден заранее, но ставки откроются позже</p>
        {hasDelayedStart && (
          <div className="bg-white rounded-xl p-3 space-y-2">
            <label className="text-[11px] font-semibold text-[#767676] uppercase tracking-wide">Дата и время начала</label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="date"
                value={form.startsAt ? form.startsAt.slice(0, 10) : ""}
                onChange={(e) => {
                  const timePart = form.startsAt ? form.startsAt.slice(11, 16) : "12:00";
                  set("startsAt", e.target.value ? `${e.target.value}T${timePart}` : "");
                }}
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#2787F5] bg-white"
              />
              <input
                type="time"
                value={form.startsAt ? form.startsAt.slice(11, 16) : ""}
                onChange={(e) => {
                  const datePart = form.startsAt ? form.startsAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
                  set("startsAt", e.target.value ? `${datePart}T${e.target.value}` : "");
                }}
                className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2 text-[13px] outline-none focus:border-[#2787F5] bg-white"
              />
            </div>
          </div>
        )}
      </div>

      {/* Дата и время окончания */}
      <div>
        <label className="text-[12px] font-semibold text-[#767676] mb-2 block uppercase tracking-wide">Длительность аукциона *</label>
        <div className="flex gap-2 mb-3 flex-wrap">
          {[
            { label: "6 ч", hours: 6 },
            { label: "12 ч", hours: 12 },
            { label: "24 ч", hours: 24 },
            { label: "2 дня", hours: 48 },
            { label: "3 дня", hours: 72 },
            { label: "7 дней", hours: 168 },
          ].map(({ label, hours }) => {
            const base = form.startsAt ? new Date(form.startsAt) : new Date();
            const expected = toLocalISO(new Date(base.getTime() + hours * 3600000));
            const isActive = form.endsAt === expected;
            return (
              <button
                key={hours}
                type="button"
                onClick={() => applyDuration(form.startsAt, hours, set)}
                className={`px-3 py-1.5 rounded-xl text-[13px] font-semibold border transition-all ${
                  isActive ? "bg-[#2787F5] border-[#2787F5] text-white" : "bg-white border-[#E0E0E0] text-[#1C1C1E]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="date"
            value={form.endsAt ? form.endsAt.slice(0, 10) : ""}
            onChange={(e) => {
              const timePart = form.endsAt ? form.endsAt.slice(11, 16) : "12:00";
              set("endsAt", e.target.value ? `${e.target.value}T${timePart || "12:00"}` : "");
            }}
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
          />
          <input
            type="time"
            value={form.endsAt ? form.endsAt.slice(11, 16) : ""}
            onChange={(e) => {
              const datePart = form.endsAt ? form.endsAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
              set("endsAt", e.target.value ? `${datePart}T${e.target.value}` : "");
            }}
            className="w-full border border-[#E0E0E0] rounded-xl px-3 py-2.5 text-[14px] outline-none focus:border-[#2787F5] bg-white"
          />
        </div>
        {form.endsAt && (
          <p className="text-[11px] text-[#767676] mt-1.5 flex items-center gap-1">
            <Icon name="Clock" size={11} />
            Завершится: {new Date(form.endsAt).toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </>
  );
}
