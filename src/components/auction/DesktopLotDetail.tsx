import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User } from "@/types/auction";
import { formatPrice, formatTime, formatTimer, getStatusLabel, useTimer, useCountdown, firstName, vkProfileUrl } from "@/components/auction/lotUtils";
import { parseVKVideoEmbed, AutoBidModal } from "@/components/auction/LotDetail";
import { DesktopTimerBadge } from "@/components/auction/DesktopLotCard";
import { useGroupMember } from "@/hooks/useGroupMember";
import { SubscribeModal } from "@/components/auction/SubscribeModal";

export function DesktopLotDetail({
  lot,
  user,
  onBid,
  onAutoBid,
}: {
  lot: Lot;
  user: User;
  onBid: (lotId: string, amount: number) => Promise<string>;
  onAutoBid?: (lotId: string, maxAmount: number) => Promise<string>;
}) {
  const [customAmount, setCustomAmount] = useState("");
  const [bidResult, setBidResult] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [bidLoading, setBidLoading] = useState(false);
  const [showAutoBidModal, setShowAutoBidModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const { check: checkMember, setIsMember } = useGroupMember(user.id);
  const ms = useTimer(lot.endsAt);
  const startsInMs = useCountdown(lot.startsAt);
  const isActive = lot.status === "active" && ms > 0;
  const isUpcoming = lot.status === "upcoming";
  const minBid = lot.currentPrice + lot.step;
  const status = getStatusLabel(lot);
  const leader = lot.bids[0];
  const isAdmin = user.isAdmin;
  const vkEmbedUrl = lot.video ? parseVKVideoEmbed(lot.video) : null;
  const isS3Video = Boolean(lot.video?.startsWith("https://cdn.poehali.dev"));
  const hasVideo = !isUpcoming && Boolean(lot.video && (vkEmbedUrl || isS3Video));

  async function handleBid(amount: number) {
    if (bidLoading) return;
    setBidLoading(true);
    setBidResult(null);
    try {
      if (!user.isAdmin) {
        const ok = await checkMember();
        if (!ok) { setShowSubscribeModal(true); return; }
      }
      const res = await onBid(lot.id, amount);
      if (res === "ok") {
        setBidResult({ type: "success", text: `Ставка ${formatPrice(amount)} принята!` });
        setCustomAmount("");
      } else {
        setBidResult({ type: "error", text: res });
      }
    } finally {
      setBidLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto">
      {/* Таймер до начала (upcoming) */}
      {isUpcoming && lot.startsAt && startsInMs > 0 && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#2787F5" }}>
            <Icon name="Clock" size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#2787F5]">Аукцион начнётся через</p>
            <p className="text-[22px] font-bold text-[#1C1C1E] leading-none">{formatTimer(startsInMs)}</p>
            <p className="text-[11px] text-[#767676] mt-0.5">{lot.startsAt.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</p>
          </div>
        </div>
      )}

      {/* Media */}
      <div className="shrink-0 relative rounded-2xl overflow-hidden mb-4" style={{ aspectRatio: "16/9", background: "#000" }}>
        {hasVideo ? (
          isS3Video ? (
            <video className="w-full h-full object-cover" controls={!isUpcoming} playsInline preload="metadata" style={{ filter: isUpcoming ? "blur(12px) brightness(0.5)" : "none", transform: isUpcoming ? "scale(1.08)" : "none" }}>
              <source src={lot.video!} type="video/mp4" />
            </video>
          ) : (
            <iframe
              src={vkEmbedUrl!}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              style={{ filter: isUpcoming ? "blur(12px) brightness(0.5)" : "none" }}
            />
          )
        ) : (
          <img src={lot.image} alt={lot.title} className="w-full h-full object-cover" style={{ filter: isUpcoming ? "blur(12px) brightness(0.5)" : "none", transform: isUpcoming ? "scale(1.08)" : "none" }} />
        )}
        {isUpcoming && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 z-10">
            <Icon name="Lock" size={32} className="text-white opacity-80" />
            <p className="text-white text-sm font-semibold opacity-80">Скоро</p>
          </div>
        )}
        <div className="absolute top-3 right-3 flex gap-1.5 z-10">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
          {isActive && <DesktopTimerBadge endsAt={lot.endsAt} />}
        </div>
      </div>

      {/* Title + desc */}
      <h2 className="text-[22px] font-bold text-[#1C1A16] mb-1" style={{ fontFamily: "'Cormorant Garamond', serif" }}>{lot.title}</h2>
      <p className="text-sm text-[#B8A070] leading-relaxed mb-5">{lot.description}</p>

      {/* Price block */}
      <div className="rounded-2xl p-4 mb-4" style={{ background: "#FAF7F0", border: "1px solid #EDE0C8" }}>
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-xs text-[#B8A070] mb-0.5">{isUpcoming ? "Стартовая цена" : "Текущая ставка"}</p>
            <p className="text-[28px] font-bold leading-none" style={{ color: "#B8922A" }}>{formatPrice(lot.currentPrice)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-[#B8A070] mb-0.5">Шаг</p>
            <p className="text-[15px] font-semibold text-[#1C1A16]">+{formatPrice(lot.step)}</p>
          </div>
        </div>
        {leader && (
          <div className="flex items-center gap-2 pt-3" style={{ borderTop: "1px solid #EDE0C8" }}>
            <div className="w-8 h-8 rounded-full text-white flex items-center justify-center text-xs font-bold" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
              {leader.userAvatar}
            </div>
            <div>
              <p className="text-[11px] text-[#B8A070]">Лидирует</p>
              {isAdmin ? (
                <a href={vkProfileUrl(leader.userId)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold underline decoration-dotted" style={{ color: "#2787F5" }}>{leader.userName}</a>
              ) : (
                <p className="text-[13px] font-semibold text-[#1C1A16]">{leader.userId === user.id ? leader.userName : firstName(leader.userName)}</p>
              )}
            </div>
            {leader.userId === user.id && (
              <span className="ml-auto text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: "#C9A84C22", color: "#B8922A" }}>Это вы!</span>
            )}
          </div>
        )}
      </div>

      {lot.antiSnipe && isActive && (
        <div className="flex items-start gap-2 bg-[#FFF8E1] rounded-xl p-3 mb-4">
          <Icon name="Shield" size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
          <p className="text-xs text-[#92400E]">
            Защита от снайпинга: ставка в последние {lot.antiSnipeMinutes} мин. продлит аукцион
          </p>
        </div>
      )}

      {lot.status === "finished" && lot.winnerName && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#FDF9F0", border: "1px solid #EDE0C8" }}>
          <div className="w-10 h-10 rounded-full text-white flex items-center justify-center" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
            <Icon name="Trophy" size={18} />
          </div>
          <div>
            <p className="text-xs font-medium" style={{ color: "#B8922A" }}>Победитель</p>
            <p className="font-bold text-[#1C1A16]">{lot.winnerName}</p>
            <p className="text-sm text-[#B8A070]">{formatPrice(lot.currentPrice)}</p>
          </div>
        </div>
      )}

      {/* Bid area */}
      {isActive && user.id === "guest" && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
          <Icon name="LogIn" size={20} className="text-[#2787F5] shrink-0" />
          <p className="text-[13px] text-[#1C1A16] font-medium flex-1 leading-snug">Войдите через ВКонтакте, чтобы делать ставки</p>
          <a
            href="https://vk.com/app54464410"
            target="_blank"
            rel="noreferrer"
            className="shrink-0 bg-[#2787F5] text-white rounded-lg px-3 py-2 text-[13px] font-semibold whitespace-nowrap"
          >
            Войти
          </a>
        </div>
      )}
      {isActive && user.id !== "guest" && (
        <div className="rounded-2xl p-4 mb-4" style={{ border: leader?.userId === user.id ? "1px solid #A5D6A7" : "1px solid #EDE0C8", background: "#fff" }}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-[#1C1A16]">{leader?.userId === user.id ? "Ваша ставка" : "Сделать ставку"}</p>
            {onAutoBid && user.id !== "guest" && (
              <button
                onClick={() => setShowAutoBidModal(true)}
                className={`flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-xl transition-colors ${lot.myAutoBid ? "bg-[#2787F5] text-white" : "bg-[#EEF5FF] text-[#2787F5]"}`}
              >
                <Icon name="Bot" size={13} />
                {lot.myAutoBid ? `Авто до ${formatPrice(lot.myAutoBid.maxAmount)}` : "Автоставка"}
              </button>
            )}
          </div>
          {leader?.userId === user.id ? (
            <div
              className="w-full rounded-xl py-3 font-bold text-[15px] flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "#fff", boxShadow: "0 4px 16px #2E7D3240" }}
            >
              <Icon name="Crown" size={18} />
              Вы лидируете
            </div>
          ) : bidResult ? (
            <div className={`rounded-xl p-4 text-center ${bidResult.type === "success" ? "bg-[#E8F5E9] text-[#2E7D32]" : "bg-[#FFEBEE] text-[#C62828]"}`}>
              <Icon name={bidResult.type === "success" ? "CheckCircle" : "XCircle"} size={24} className="mx-auto mb-2" />
              <p className="font-semibold text-sm">{bidResult.text}</p>
              <button onClick={() => setBidResult(null)} className="mt-2 text-xs underline opacity-70">Сделать ещё ставку</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => handleBid(minBid)}
                disabled={bidLoading}
                className="w-full text-white rounded-xl py-3 font-semibold text-[15px] mb-3 disabled:opacity-60 transition-opacity"
                style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}
              >
                {bidLoading ? "Отправляем…" : `+${formatPrice(lot.step)} (до ${formatPrice(minBid)})`}
              </button>
              <div className="flex gap-2">
                <input
                  type="number"
                  placeholder={`Своя сумма (от ${minBid})`}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  className="flex-1 rounded-xl px-3 py-2.5 text-[14px] outline-none"
                  style={{ border: "1px solid #EDE0C8", background: "#FAF8F4" }}
                  onFocus={(e) => (e.target.style.borderColor = "#C9A84C")}
                  onBlur={(e) => (e.target.style.borderColor = "#EDE0C8")}
                />
                <button
                  onClick={() => handleBid(Number(customAmount))}
                  disabled={!customAmount || Number(customAmount) < minBid || bidLoading}
                  className="rounded-xl px-4 font-semibold disabled:opacity-40 transition-opacity"
                  style={{ background: "#F5F0E8", color: "#B8922A" }}
                >
                  Ставить
                </button>
              </div>
              <p className="text-[11px] text-[#B8A070] text-center mt-3">
                Вы: <span className="font-medium text-[#1C1A16]">{user.name}</span>
              </p>
            </>
          )}
        </div>
      )}
      {showAutoBidModal && onAutoBid && (
        <AutoBidModal
          lot={lot}
          user={user}
          onClose={() => setShowAutoBidModal(false)}
          onSave={(maxAmount) => onAutoBid(lot.id, maxAmount)}
        />
      )}

      {showSubscribeModal && (
        <SubscribeModal
          onClose={() => setShowSubscribeModal(false)}
          onJoined={() => { setIsMember(true); setShowSubscribeModal(false); }}
        />
      )}

      {/* Bid history */}
      {lot.bids.length > 0 && (
        <div>
          <p className="text-[13px] font-semibold text-[#1C1A16] mb-2">История ставок</p>
          <div className="space-y-2">
            {lot.bids.slice(0, 10).map((b, i) => (
              <div key={b.id} className="flex items-center gap-2 py-1.5" style={{ borderBottom: i < lot.bids.slice(0, 10).length - 1 ? "1px solid #EDE8DF" : "none" }}>
                <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold shrink-0" style={{ background: i === 0 ? "#C9A84C" : "#D5CABC" }}>
                  {b.userAvatar}
                </div>
                {isAdmin ? (
                  <a href={vkProfileUrl(b.userId)} target="_blank" rel="noreferrer" className="text-[13px] flex-1 truncate underline decoration-dotted" style={{ color: "#2787F5" }}>{b.userName}</a>
                ) : (
                  <span className="text-[13px] text-[#1C1A16] flex-1 truncate">{b.userId === user.id ? b.userName : firstName(b.userName)}</span>
                )}
                <span className="text-[13px] font-semibold" style={{ color: i === 0 ? "#B8922A" : "#767676" }}>{formatPrice(b.amount)}</span>
                <span className="text-[11px] text-[#B8A070] w-16 text-right shrink-0">{formatTime(b.createdAt)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}