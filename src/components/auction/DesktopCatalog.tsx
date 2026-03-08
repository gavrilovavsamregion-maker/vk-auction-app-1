import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User } from "@/types/auction";
import { DesktopLotCard } from "@/components/auction/DesktopLotCard";
import { DesktopLotDetail } from "@/components/auction/DesktopLotDetail";

export function DesktopCatalog({ lots, user, onBid, onAutoBid }: { lots: Lot[]; user: User; onBid: (lotId: string, amount: number) => Promise<string>; onAutoBid?: (lotId: string, maxAmount: number) => Promise<string> }) {
  const [tab, setTab] = useState<"active" | "finished">("active");
  const [selectedId, setSelectedId] = useState<string | null>(() => {
    const first = lots.find((l) => l.status === "active" || l.status === "upcoming");
    return first?.id ?? lots[0]?.id ?? null;
  });

  const filtered = lots
    .filter((l) => tab === "active" ? l.status === "active" || l.status === "upcoming" : l.status === "finished" || l.status === "cancelled")
    .sort((a, b) => {
      if (tab !== "active") return 0;
      const aActive = a.status === "active";
      const bActive = b.status === "active";
      if (aActive && !bActive) return -1;
      if (!aActive && bActive) return 1;
      if (!aActive && !bActive) {
        const aT = a.startsAt ? a.startsAt.getTime() : Infinity;
        const bT = b.startsAt ? b.startsAt.getTime() : Infinity;
        return aT - bT;
      }
      return 0;
    });
  const selectedLot = lots.find((l) => l.id === selectedId) ?? filtered[0] ?? null;

  return (
    <div className="flex h-full gap-0">
      {/* Left: list */}
      <div className="flex flex-col w-[480px] shrink-0 border-r border-[#EDE8DF] bg-[#F7F4EF]">
        {user.id === "guest" && (
          <div className="mx-4 mt-4 rounded-xl p-3.5 flex items-center gap-3 shrink-0" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
            <Icon name="LogIn" size={18} className="text-[#2787F5] shrink-0" />
            <p className="text-[13px] text-[#1C1A16] font-medium flex-1 leading-snug">Войдите через ВКонтакте, чтобы делать ставки</p>
            <a
              href="https://vk.com/app54464410"
              target="_blank"
              rel="noreferrer"
              className="shrink-0 bg-[#2787F5] text-white rounded-lg px-3 py-1.5 text-[12px] font-semibold whitespace-nowrap"
            >
              Войти
            </a>
          </div>
        )}
        <div className="px-5 pt-5 pb-3 bg-white border-b border-[#EDE8DF]">
          <h1 className="text-[22px] font-bold text-[#1C1A16] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
            Лоты
          </h1>
          <div className="flex bg-[#F5F0E8] rounded-xl p-0.5">
            {(["active", "finished"] as const).map((t) => (
              <button
                key={t}
                onClick={() => { setTab(t); setSelectedId(null); }}
                className="flex-1 py-1.5 text-sm font-medium rounded-[10px] transition-all"
                style={tab === t ? { background: "white", color: "#1C1A16", boxShadow: "0 1px 4px #C9A84C22" } : { color: "#B8A070" }}
              >
                {t === "active" ? "Активные" : "Завершённые"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[#C5B89A]">
              <Icon name="Inbox" size={36} className="mb-3 opacity-40" />
              <p className="text-sm">Лотов пока нет</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 mt-1">
              {filtered.map((l) => (
                <DesktopLotCard
                  key={l.id}
                  lot={l}
                  onClick={() => setSelectedId(l.id)}
                  isActive={l.id === (selectedId ?? selectedLot?.id)}
                  isAdmin={user.isAdmin}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right: detail */}
      <div className="flex-1 overflow-y-auto p-6 bg-[#F7F4EF]">
        {selectedLot ? (
          <DesktopLotDetail key={selectedLot.id} lot={selectedLot} user={user} onBid={onBid} onAutoBid={onAutoBid} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-[#C5B89A]">
            <Icon name="MousePointerClick" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Выберите лот из списка</p>
          </div>
        )}
      </div>
    </div>
  );
}