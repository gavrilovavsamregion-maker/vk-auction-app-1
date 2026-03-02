import { useState } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User, Screen } from "@/types/auction";
import { useTimer, useCountdown } from "@/components/auction/lotUtils";
import { useGroupMember } from "@/hooks/useGroupMember";
import { SubscribeModal } from "@/components/auction/SubscribeModal";
import { BidModal, AutoBidModal } from "@/components/auction/LotModals";
import { LotMedia, parseVKVideoEmbed } from "@/components/auction/LotMedia";
import { LotInfo } from "@/components/auction/LotInfo";

export { parseVKVideoEmbed } from "@/components/auction/LotMedia";
export { BidModal, AutoBidModal } from "@/components/auction/LotModals";

// ─── Screen: Lot ───────────────────────────────────────────────────────────────
export function LotScreen({ lot, user, onBack, onBid, onAutoBid, notificationsDeclined, onEnableNotifications }: {
  lot: Lot;
  user: User;
  onBack: () => void;
  onBid: (lotId: string, amount: number) => Promise<string>;
  onAutoBid: (lotId: string, maxAmount: number) => Promise<string>;
  notificationsDeclined?: boolean;
  onEnableNotifications?: () => void;
}) {
  const [showBidModal, setShowBidModal] = useState(false);
  const [showAutoBidModal, setShowAutoBidModal] = useState(false);
  const [showSubscribeModal, setShowSubscribeModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<"bid" | "autobid" | null>(null);
  const [checkingMember, setCheckingMember] = useState(false);
  const { check: checkMember, setIsMember } = useGroupMember(user.id);
  const ms = useTimer(lot.endsAt);
  const startsInMs = useCountdown(lot.startsAt);
  const isActive = lot.status === "active" && ms > 0;
  const isUpcoming = lot.status === "upcoming";

  async function requireMember(action: "bid" | "autobid") {
    if (checkingMember) return;
    if (user.isAdmin) {
      if (action === "bid") setShowBidModal(true);
      else setShowAutoBidModal(true);
      return;
    }
    setCheckingMember(true);
    try {
      const ok = await checkMember();
      if (ok) {
        if (action === "bid") setShowBidModal(true);
        else setShowAutoBidModal(true);
      } else {
        setPendingAction(action);
        setShowSubscribeModal(true);
      }
    } finally {
      setCheckingMember(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      <LotMedia lot={lot} isActive={isActive} isUpcoming={isUpcoming} onBack={onBack} />

      {notificationsDeclined && user.id !== "guest" && (
        <button
          onClick={onEnableNotifications}
          className="shrink-0 flex items-center gap-2 px-4 py-2 text-left w-full"
          style={{ background: "#FFF8E7", borderBottom: "1px solid #F0E4B8" }}
        >
          <Icon name="BellOff" size={14} className="text-[#B8922A] shrink-0" />
          <p className="text-[12px] text-[#B8922A] flex-1 leading-tight">
            Уведомления отключены — вы можете пропустить, когда вас перебьют.
          </p>
          <span className="text-[11px] font-semibold text-[#B8922A] shrink-0 underline decoration-dotted">Включить</span>
        </button>
      )}

      <div className="flex-1 overflow-y-auto">
        <LotInfo
          lot={lot}
          user={user}
          isActive={isActive}
          isUpcoming={isUpcoming}
          startsInMs={startsInMs}
          onOpenAutoBid={() => setShowAutoBidModal(true)}
        />
      </div>

      {isActive && (
        <div className="px-4 pb-6 pt-3 border-t border-[#E8E8E8] bg-white shrink-0">
          {user.id === "guest" ? (
            <div className="rounded-xl p-4 text-center bg-[#F5F0E8] space-y-2">
              <p className="text-sm text-[#B8A070]">Чтобы участвовать в аукционе, откройте приложение через ВКонтакте</p>
              <a
                href="https://vk.com/app54464410"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 bg-[#2787F5] text-white rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                <Icon name="ExternalLink" size={15} />
                Открыть в ВКонтакте
              </a>
            </div>
          ) : (() => {
            const leader = lot.bids[0];
            const isLeading = leader?.userId === user.id;
            return (
              <div className="flex gap-2">
                {isLeading ? (
                  <div
                    className="flex-1 rounded-xl py-3.5 font-bold text-[16px] flex items-center justify-center gap-2"
                    style={{ background: "linear-gradient(135deg, #2E7D32, #43A047)", color: "#fff", boxShadow: "0 4px 16px #2E7D3240" }}
                  >
                    <Icon name="Crown" size={18} />
                    Вы лидируете
                  </div>
                ) : (
                  <button
                    onClick={() => requireMember("bid")}
                    disabled={checkingMember}
                    className="flex-1 text-white rounded-xl py-3.5 font-bold text-[16px] active:opacity-80 transition-opacity disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)", boxShadow: "0 4px 16px #C9A84C40" }}
                  >
                    {checkingMember ? "…" : "Сделать ставку"}
                  </button>
                )}
                <button
                  onClick={() => requireMember("autobid")}
                  disabled={checkingMember}
                  title="Автоставка"
                  className={`w-14 rounded-xl flex items-center justify-center transition-colors active:opacity-80 disabled:opacity-60 ${lot.myAutoBid ? "bg-[#2787F5] text-white" : "bg-[#EEF5FF] text-[#2787F5]"}`}
                  style={{ border: lot.myAutoBid ? "none" : "1.5px solid #C5D9F5" }}
                >
                  <Icon name="Bot" size={20} />
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {showSubscribeModal && (
        <SubscribeModal
          onClose={() => setShowSubscribeModal(false)}
          onJoined={() => {
            setIsMember(true);
            setShowSubscribeModal(false);
            if (pendingAction === "bid") setShowBidModal(true);
            else if (pendingAction === "autobid") setShowAutoBidModal(true);
            setPendingAction(null);
          }}
        />
      )}
      {showBidModal && (
        <BidModal lot={lot} user={user} onClose={() => setShowBidModal(false)} onBid={(amount) => onBid(lot.id, amount)} />
      )}
      {showAutoBidModal && (
        <AutoBidModal
          lot={lot}
          user={user}
          onClose={() => setShowAutoBidModal(false)}
          onSave={(maxAmount) => onAutoBid(lot.id, maxAmount)}
        />
      )}
    </div>
  );
}

// ─── Bottom Nav ────────────────────────────────────────────────────────────────
export function BottomNav({ screen, onNav, isAdmin }: { screen: Screen; onNav: (s: Screen) => void; isAdmin: boolean }) {
  const items = [
    { id: "catalog" as Screen, icon: "LayoutGrid" as const, label: "Лоты" },
    { id: "bids" as Screen, icon: "Gavel" as const, label: "Ставки" },
    { id: "profile" as Screen, icon: "User" as const, label: "Профиль" },
    ...(isAdmin ? [{ id: "admin" as Screen, icon: "Settings" as const, label: "Админ" }] : []),
  ];

  if (screen === "lot" || screen === "admin-lot") return null;

  return (
    <nav className="bg-white border-t border-[#EDE8DF] flex shrink-0">
      {items.map((item) => {
        const active = screen === item.id;
        return (
          <button
            key={item.id}
            onClick={() => onNav(item.id)}
            className="flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-all"
            style={{ color: active ? "#B8922A" : "#B8A070" }}
          >
            <Icon name={item.icon} size={22} />
            <span className="text-[10px] font-medium">{item.label}</span>
            {active && (
              <span className="block w-4 h-0.5 rounded-full mt-0.5 bg-[#C9A84C]" />
            )}
          </button>
        );
      })}
    </nav>
  );
}