import Icon from "@/components/ui/icon";
import type { Bid, Lot, User } from "@/types/auction";
import { formatPrice, formatTime, formatTimer } from "@/components/auction/lotUtils";
import { firstName, vkProfileUrl } from "@/components/auction/lotUtils";

export function LotInfo({ lot, user, isActive, isUpcoming, startsInMs, onOpenAutoBid }: {
  lot: Lot;
  user: User;
  isActive: boolean;
  isUpcoming: boolean;
  startsInMs: number;
  onOpenAutoBid: () => void;
}) {
  const isAdmin = user.isAdmin;
  const leader = lot.bids[0];

  return (
    <div className="px-4 pt-4">
      <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-1">{lot.title}</h2>
      <p className="text-sm text-[#767676] leading-relaxed mb-4">{lot.description}</p>

      {/* Таймер до начала для upcoming */}
      {isUpcoming && lot.startsAt && startsInMs > 0 && (
        <div className="rounded-2xl p-4 mb-4 flex items-center gap-3" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "#2787F5" }}>
            <Icon name="Clock" size={18} className="text-white" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#2787F5]">Аукцион начнётся через</p>
            <p className="text-[22px] font-bold text-[#1C1C1E] leading-none">{formatTimer(startsInMs)}</p>
            <p className="text-[11px] text-[#767676] mt-0.5">
              {lot.startsAt.toLocaleString("ru-RU", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        </div>
      )}

      {/* Price Block */}
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
        {leader && !isUpcoming && (
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

      {/* Моя автоставка */}
      {isActive && user.id !== "guest" && lot.myAutoBid && (
        <div className="rounded-xl p-3 mb-4 flex items-center gap-2" style={{ background: "#EEF5FF", border: "1px solid #C5D9F5" }}>
          <Icon name="Bot" size={16} className="text-[#2787F5]" />
          <p className="text-sm text-[#2787F5] flex-1">Автоставка активна до <span className="font-semibold">{formatPrice(lot.myAutoBid.maxAmount)}</span></p>
          <button onClick={onOpenAutoBid} className="text-[11px] text-[#2787F5] underline">Изменить</button>
        </div>
      )}

      {/* Анти-снайпинг */}
      {lot.antiSnipe && isActive && (
        <div className="flex items-start gap-2 bg-[#FFF8E1] rounded-xl p-3 mb-4">
          <Icon name="Shield" size={14} className="text-[#F59E0B] mt-0.5 shrink-0" />
          <p className="text-xs text-[#92400E]">
            Защита от снайпинга: ставка в последние {lot.antiSnipeMinutes} мин. автоматически продлит аукцион
          </p>
        </div>
      )}

      {/* Победитель */}
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

      {/* Bid History */}
      <div className="mb-4">
        <p className="text-[12px] font-semibold text-[#767676] uppercase tracking-wide mb-2">История ставок</p>
        {lot.bids.length === 0 ? (
          <p className="text-sm text-[#767676] text-center py-4">Ставок ещё нет — будьте первым!</p>
        ) : (
          <div className="space-y-2">
            {lot.bids.slice(0, 3).map((bid: Bid, i: number) => (
              <div key={bid.id} className="flex items-center gap-3 p-3 rounded-xl" style={i === 0 ? { background: "#FDF9F0", border: "1px solid #EDE0C8" } : { background: "white", border: "1px solid #F0EBE0" }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={i === 0 ? { background: "linear-gradient(135deg, #C9A84C, #E8C96B)" } : { background: "#EDE0C8", color: "#B8A070" }}>
                  {bid.userAvatar}
                </div>
                <div className="flex-1 min-w-0">
                  {isAdmin ? (
                    <a href={vkProfileUrl(bid.userId)} target="_blank" rel="noreferrer" className="text-[13px] font-semibold truncate block underline decoration-dotted" style={{ color: "#2787F5" }}>{bid.userName}</a>
                  ) : (
                    <p className="text-[13px] font-semibold text-[#1C1A16] truncate">{bid.userId === user.id ? bid.userName : firstName(bid.userName)}</p>
                  )}
                  <p className="text-[11px] text-[#B8A070]">{formatTime(bid.createdAt)}</p>
                </div>
                <p className="text-[14px] font-bold shrink-0" style={{ color: i === 0 ? "#B8922A" : "#1C1A16" }}>
                  {formatPrice(bid.amount)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
