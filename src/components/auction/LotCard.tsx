import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatTimer, formatPrice, getStatusLabel, useTimer, useCountdown, firstName, vkProfileUrl, deduplicateBids } from "@/components/auction/lotUtils";

export function TimerBadge({ endsAt }: { endsAt: Date }) {
  const ms = useTimer(endsAt);
  const isUrgent = ms > 0 && ms < 5 * 60 * 1000;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full transition-colors ${isUrgent ? "bg-red-600 text-white animate-pulse" : "bg-black/25 text-white"}`}>
      <Icon name="Clock" size={10} />
      {formatTimer(ms)}
    </span>
  );
}

function StartsInBadge({ startsAt }: { startsAt: Date }) {
  const ms = useCountdown(startsAt);
  if (ms <= 0) return null;
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-[#2787F5]/15 text-[#2787F5]">
      <Icon name="Clock" size={10} />
      Старт через {formatTimer(ms)}
    </span>
  );
}

export function LotCard({ lot, onClick, isAdmin = false }: { lot: Lot; onClick: () => void; isAdmin?: boolean }) {
  const status = getStatusLabel(lot);
  const leaderName = lot.leaderName ?? lot.bids[0]?.userName;
  const leaderAvatar = lot.leaderAvatar ?? lot.bids[0]?.userAvatar;
  const isUpcoming = lot.status === "upcoming";

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden cursor-pointer active:opacity-80 transition-opacity"
      style={{ boxShadow: "0 1px 8px #C9A84C18, 0 0 0 1px #EDE0C8" }}
    >
      <div className="relative overflow-hidden">
        {!isUpcoming && lot.video?.startsWith("https://cdn.poehali.dev") ? (
          <video
            src={lot.video + "#t=0.5"}
            className="w-full h-44 object-cover"
            preload="metadata"
            muted
            playsInline
            style={{ animation: lot.status === "active" ? "kenBurns 8s ease-in-out infinite alternate" : "none" }}
          />
        ) : (
          <img
            src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"}
            alt={lot.title}
            className="w-full h-44 object-cover"
            style={{
              animation: lot.status === "active" ? "kenBurns 8s ease-in-out infinite alternate" : "none",
              filter: isUpcoming && lot.video ? "blur(8px) brightness(0.6)" : "none",
              transform: isUpcoming && lot.video ? "scale(1.08)" : "none",
            }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        {!isUpcoming && lot.video && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative flex items-center justify-center">
              <span className="absolute w-14 h-14 rounded-full animate-ping" style={{ background: "#C9A84C", opacity: 0.25 }} />
              <span className="absolute w-10 h-10 rounded-full animate-ping" style={{ background: "#C9A84C", opacity: 0.15, animationDelay: "0.5s" }} />
              <div className="relative w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "rgba(201,168,76,0.82)", backdropFilter: "blur(4px)" }}>
                <svg width="18" height="20" viewBox="0 0 18 20" fill="white"><path d="M2 1.5L16 10L2 18.5V1.5Z" /></svg>
              </div>
            </div>
          </div>
        )}
        {isUpcoming && lot.video && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 rounded-full flex items-center justify-center bg-black/50 backdrop-blur-sm">
                <Icon name="Lock" size={18} className="text-white" />
              </div>
              <span className="text-white text-[11px] font-medium bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-full">Видео откроется при старте</span>
            </div>
          </div>
        )}
        <span className={`absolute top-2 left-2 text-xs font-semibold px-2 py-0.5 rounded-full ${status.color}`}>
          {status.label}
        </span>
        <div className="absolute top-2 right-2">
          {lot.status === "active" && <TimerBadge endsAt={lot.endsAt} />}
          {lot.status === "upcoming" && lot.startsAt && <StartsInBadge startsAt={lot.startsAt} />}
        </div>
      </div>
      <div className="p-3">
        <p className="font-semibold text-[15px] text-[#1C1A16] leading-snug mb-2 line-clamp-1">{lot.title}</p>
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-[11px] text-[#B8A070] mb-0.5">Текущая ставка</p>
            <p className="text-[18px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
          </div>
          {leaderName && (
            <div className="flex items-center gap-1.5 text-xs text-[#B8A070]">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white" style={{ background: "#C9A84C" }}>
                {leaderAvatar ?? "?"}
              </div>
              <span className="max-w-[80px] truncate">{isAdmin ? (lot.leaderId ?? "") : firstName(leaderName ?? "")}</span>
            </div>
          )}
        </div>
        {lot.bids && lot.bids.length > 0 && (
          <div className="space-y-1 pt-2" style={{ borderTop: "1px solid #EDE8DF" }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#B8A070] uppercase tracking-wide">Последние ставки</span>
              {lot.bidCount != null && <span className="text-[10px] text-[#B8A070]">{lot.bidCount} {lot.bidCount === 1 ? "ставка" : lot.bidCount < 5 ? "ставки" : "ставок"}</span>}
            </div>
            {deduplicateBids(lot.bids, 3).map((b, i) => (
              <div key={b.id} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0" style={{ background: i === 0 ? "#C9A84C" : "#D5CABC" }}>
                  {b.userAvatar}
                </div>
                {isAdmin ? (
                  <a href={vkProfileUrl(b.userId)} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="text-[12px] flex-1 truncate underline decoration-dotted" style={{ color: "#2787F5" }}>{b.userName}</a>
                ) : (
                  <span className="text-[12px] text-[#767676] flex-1 truncate">{firstName(b.userName)}</span>
                )}
                <span className="text-[12px] font-semibold shrink-0" style={{ color: i === 0 ? "#B8922A" : "#9A8E7A" }}>{formatPrice(b.amount)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function CatalogScreen({ lots, onLot, isAdmin = false, isGuest = false }: { lots: Lot[]; onLot: (id: string) => void; isAdmin?: boolean; isGuest?: boolean }) {
  const [tab, setTab] = useState<"active" | "finished">("active");
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

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#EDE8DF]">
        <h1 className="text-[22px] font-bold text-[#1C1A16] mb-3" style={{ fontFamily: "'Cormorant Garamond', serif", letterSpacing: "0.02em" }}>
          Лоты
        </h1>
        <div className="flex bg-[#F5F0E8] rounded-xl p-0.5">
          {(["active", "finished"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-1.5 text-sm font-medium rounded-[10px] transition-all"
              style={tab === t ? { background: "white", color: "#1C1A16", boxShadow: "0 1px 4px #C9A84C22" } : { color: "#B8A070" }}
            >
              {t === "active" ? "Активные" : "Завершённые"}
            </button>
          ))}
        </div>
      </div>
      {isGuest && (
        <div className="mx-4 mt-3 rounded-xl p-3.5 flex items-center gap-3" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
          <Icon name="LogIn" size={20} className="text-[#2787F5] shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[13px] text-[#1C1A16] font-medium leading-snug">Войдите через ВКонтакте, чтобы делать ставки</p>
          </div>
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
      <div className="flex-1 overflow-y-auto px-4 pb-4 bg-[#F7F4EF]">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-[#C5B89A]">
            <Icon name="Inbox" size={40} className="mb-3 opacity-40" />
            <p className="text-sm">Лотов пока нет</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 mt-3">
            {filtered.map((l) => (
              <LotCard key={l.id} lot={l} onClick={() => onLot(l.id)} isAdmin={isAdmin} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}