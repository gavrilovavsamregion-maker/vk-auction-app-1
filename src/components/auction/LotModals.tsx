import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User } from "@/types/auction";
import { formatPrice } from "@/components/auction/lotUtils";

// ─── AutoBid Modal ─────────────────────────────────────────────────────────────
export function AutoBidModal({ lot, user: _user, onClose, onSave }: {
  lot: Lot;
  user: User;
  onClose: () => void;
  onSave: (maxAmount: number) => Promise<string>;
}) {
  const [maxAmount, setMaxAmount] = useState(lot.myAutoBid ? String(lot.myAutoBid.maxAmount) : "");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const minRequired = lot.currentPrice + lot.step;

  async function handleSave() {
    const val = Number(maxAmount);
    if (!val || val < minRequired) {
      setResult({ type: "error", text: `Минимум ${formatPrice(minRequired)}` });
      return;
    }
    setLoading(true);
    try {
      const msg = await onSave(val);
      if (msg === "ok") {
        setResult({ type: "success", text: `Автоставка до ${formatPrice(val)} активна!` });
      } else {
        setResult({ type: "error", text: msg });
      }
    } catch {
      setResult({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-[390px] bg-white rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4" />
        <h3 className="font-semibold text-[17px] text-[#1C1A16] mb-1">Автоставка</h3>
        <p className="text-sm text-[#B8A070] mb-4">
          Система автоматически перебьёт ставку на шаг аукциона (<span className="font-semibold text-[#1C1A16]">{formatPrice(lot.step)}</span>), пока не достигнет вашего максимума
        </p>

        {result ? (
          <div className={`rounded-xl p-4 text-center ${result.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
            <Icon name={result.type === "success" ? "CheckCircle" : "XCircle"} size={28} className="mx-auto mb-2" />
            <p className="font-semibold">{result.text}</p>
            <button onClick={onClose} className="mt-3 text-sm underline opacity-70">Закрыть</button>
          </div>
        ) : (
          <>
            {lot.myAutoBid && (
              <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: "#FDF9F0", border: "1px solid #EDE0C8" }}>
                <Icon name="Bot" size={16} className="text-[#B8922A]" />
                <p className="text-sm text-[#B8922A]">Активна до <span className="font-semibold">{formatPrice(lot.myAutoBid.maxAmount)}</span></p>
              </div>
            )}
            <div className="flex gap-2 mb-4">
              <input
                type="number"
                placeholder={`Максимум (от ${minRequired})`}
                value={maxAmount}
                onChange={(e) => setMaxAmount(e.target.value)}
                className="flex-1 rounded-xl px-3 py-3 text-[15px] outline-none"
                style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                onFocus={(e) => (e.target.style.borderColor = "#2787F5")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
              />
              <button
                onClick={handleSave}
                disabled={!maxAmount || loading}
                className="rounded-xl px-4 font-semibold text-white disabled:opacity-40 transition-opacity"
                style={{ background: "#2787F5" }}
              >
                {loading ? "…" : "Сохранить"}
              </button>
            </div>
            <p className="text-[11px] text-[#B8A070] text-center">
              Текущая ставка: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.currentPrice)}</span> · Шаг: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.step)}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Bid Modal ─────────────────────────────────────────────────────────────────
export function BidModal({ lot, user, onClose, onBid }: {
  lot: Lot;
  user: User;
  onClose: () => void;
  onBid: (amount: number) => Promise<string>;
}) {
  const [customAmount, setCustomAmount] = useState("");
  const [result, setResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const minBid = lot.currentPrice + lot.step;

  async function handleBid(amount: number) {
    setLoading(true);
    try {
      const msg = await onBid(amount);
      if (msg === "ok") {
        setResult({ type: "success", text: `Ставка ${formatPrice(amount)} принята!` });
      } else {
        setResult({ type: "error", text: msg });
      }
    } catch {
      setResult({ type: "error", text: "Ошибка сети. Попробуйте ещё раз." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/30" />
      <div
        className="relative w-full max-w-[390px] bg-white rounded-t-2xl p-5 pb-8"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-4" />
        <h3 className="font-semibold text-[17px] text-[#1C1A16] mb-1">{lot.title}</h3>
        <p className="text-sm text-[#B8A070] mb-4">
          Минимальная ставка: <span className="font-semibold" style={{ color: "#B8922A" }}>{formatPrice(minBid)}</span>
        </p>

        {result ? (
          <div className={`rounded-xl p-4 text-center ${result.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
            <Icon name={result.type === "success" ? "CheckCircle" : "XCircle"} size={28} className="mx-auto mb-2" />
            <p className="font-semibold">{result.text}</p>
            <button onClick={onClose} className="mt-3 text-sm underline opacity-70">Закрыть</button>
          </div>
        ) : (
          <>
            <button
              onClick={() => handleBid(minBid)}
              disabled={loading}
              className="w-full text-white rounded-xl py-3.5 font-semibold text-[15px] mb-3 active:opacity-80 transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}
            >
              {loading ? "Отправляем…" : `+${formatPrice(lot.step)} (до ${formatPrice(minBid)})`}
            </button>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={`Своя сумма (от ${minBid})`}
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="flex-1 rounded-xl px-3 py-3 text-[15px] outline-none"
                style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
              />
              <button
                onClick={() => handleBid(Number(customAmount))}
                disabled={!customAmount || Number(customAmount) < minBid || loading}
                className="rounded-xl px-4 font-semibold disabled:opacity-40 transition-opacity"
                style={{ background: "#F5F0E8", color: "#B8922A" }}
              >
                Ставить
              </button>
            </div>
            <p className="text-[11px] text-[#B8A070] text-center mt-3">
              Шаг аукциона: <span className="font-medium text-[#1C1A16]">{formatPrice(lot.step)}</span> · Вы: <span className="font-medium text-[#1C1A16]">{user.name}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
