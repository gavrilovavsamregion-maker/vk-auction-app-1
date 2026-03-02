import { useState } from "react";
import bridge from "@vkontakte/vk-bridge";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { formatPrice } from "@/components/auction/LotScreens";

const OUR_COMMUNITY = "joywood_store";
const OUR_PHONE = "+79277760036";

function ContactWinnerModal({ lot, onClose }: { lot: Lot; onClose: () => void }) {
  const [notifStatus, setNotifStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");

  async function sendVKNotification() {
    setNotifStatus("loading");
    try {
      const params = new URLSearchParams(window.location.search);
      const groupId = params.get("vk_group_id");
      if (!groupId || !lot.winnerId) { setNotifStatus("error"); return; }
      const tokenRes = await bridge.send("VKWebAppGetCommunityAuthToken", {
        app_id: 54464410,
        group_id: Number(groupId),
        scope: "notifications",
      });
      await bridge.send("VKWebAppCallAPIMethod", {
        method: "notifications.sendMessage",
        params: {
          user_ids: lot.winnerId,
          message: `🏆 Поздравляем! Вы выиграли лот «${lot.title}» за ${formatPrice(lot.currentPrice)}. Для получения заказа свяжитесь с нами: напишите в сообщество vk.com/${OUR_COMMUNITY} или позвоните ${OUR_PHONE}`,
          fragment: "auction",
          group_id: groupId,
          v: "5.131",
          access_token: tokenRes.access_token,
        },
      });
      setNotifStatus("ok");
    } catch {
      setNotifStatus("error");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-t-2xl w-full max-w-md overflow-hidden shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8]">
          <p className="font-semibold text-[15px] text-[#1C1C1E]">Связаться с победителем</p>
          <button onClick={onClose} className="text-[#767676]"><Icon name="X" size={18} /></button>
        </div>

        <div className="px-4 pt-3 pb-5 space-y-2.5">
          <div className="flex items-center gap-2 bg-[#E8F5E9] rounded-xl px-3 py-2">
            <Icon name="Trophy" size={14} className="text-[#4CAF50] shrink-0" />
            <span className="text-[13px] text-[#2E7D32]"><strong>{lot.winnerName}</strong> — {formatPrice(lot.currentPrice)}</span>
          </div>

          {/* Открыть профиль победителя */}
          <a
            href={`https://vk.com/id${lot.winnerId}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 bg-[#2787F5] text-white rounded-xl px-4 py-3 w-full"
          >
            <Icon name="User" size={20} />
            <div className="text-left">
              <p className="text-[14px] font-semibold">Открыть профиль ВКонтакте</p>
              <p className="text-[11px] opacity-80">Попробовать написать напрямую</p>
            </div>
          </a>

          {/* Уведомление победителю */}
          <button
            onClick={sendVKNotification}
            disabled={notifStatus === "loading" || notifStatus === "ok"}
            className="flex items-center gap-3 bg-[#F5F5F5] text-[#1C1C1E] rounded-xl px-4 py-3 w-full disabled:opacity-50"
          >
            <Icon name={notifStatus === "ok" ? "CheckCircle" : "Bell"} size={20} className={notifStatus === "ok" ? "text-[#4CAF50]" : "text-[#767676]"} />
            <div className="text-left">
              <p className="text-[14px] font-semibold">
                {notifStatus === "loading" ? "Отправляем..." : notifStatus === "ok" ? "Уведомление отправлено!" : "Уведомить через ВКонтакте"}
              </p>
              <p className="text-[11px] text-[#767676]">
                {notifStatus === "error" ? "Ошибка — попробуйте снова" : `Победитель получит: наш телефон и ссылку на сообщество`}
              </p>
            </div>
          </button>

          <p className="text-[11px] text-[#B0A0A0] text-center pt-1">
            В уведомлении будут указаны {OUR_PHONE} и vk.com/{OUR_COMMUNITY}
          </p>
        </div>
      </div>
    </div>
  );
}

const paymentLabels: Record<string, string> = {
  pending: "Ожидает", paid: "Оплачен", issued: "Выдан", cancelled: "Отменён",
};
const paymentColors: Record<string, string> = {
  pending: "bg-[#FFF8E1] text-[#92400E] border-[#F59E0B]",
  paid: "bg-[#E8F5E9] text-[#2E7D32] border-[#4CAF50]",
  issued: "bg-[#E3F2FD] text-[#1565C0] border-[#2787F5]",
  cancelled: "bg-[#FFEBEE] text-[#C62828] border-[#EF5350]",
};

export function AdminLotCard({ lot, expanded, onToggle, onEditLot, onUpdateStatus, onStopLot, onDeleteLot }: {
  lot: Lot;
  expanded: boolean;
  onToggle: () => void;
  onEditLot: (id: string) => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
  onStopLot: (id: string) => void;
  onDeleteLot: (id: string) => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showContact, setShowContact] = useState(false);
  return (
    <>
    {showContact && <ContactWinnerModal lot={lot} onClose={() => setShowContact(false)} />}
    <div className="bg-white border border-[#E8E8E8] rounded-2xl overflow-hidden">
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggle}>
        <img
          src={lot.image || "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"}
          alt={lot.title}
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-[14px] text-[#1C1C1E] truncate">{lot.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
              lot.status === "active" ? "bg-[#E8F5E9] text-[#2E7D32]" :
              lot.status === "finished" ? "bg-[#E8E8E8] text-[#767676]" :
              lot.status === "upcoming" ? "bg-[#EEF5FF] text-[#2787F5]" :
              "bg-[#FFEBEE] text-[#C62828]"
            }`}>
              {lot.status === "active" ? "Активен" :
               lot.status === "finished" ? "Завершён" :
               lot.status === "upcoming" ? "Скоро" : "Отменён"}
            </span>
            <span className="text-[11px] text-[#767676]">{formatPrice(lot.currentPrice)}</span>
            <span className="text-[11px] text-[#767676]">· {lot.bidCount ?? lot.bids.length} ставок</span>
          </div>
        </div>
        <Icon
          name={expanded ? "ChevronUp" : "ChevronDown"}
          size={18}
          className="text-[#767676] self-center shrink-0"
        />
      </div>

      {expanded && (
        <div className="border-t border-[#F0F2F5] p-3 space-y-3">
          {lot.status === "finished" && lot.winnerName && (
            <button
              onClick={() => setShowContact(true)}
              className="w-full bg-[#E8F5E9] rounded-xl p-2.5 flex items-center gap-2 text-sm"
            >
              <Icon name="Trophy" size={14} className="text-[#4CAF50] shrink-0" />
              <span className="text-[#2E7D32] flex-1 text-left">Победитель: <strong>{lot.winnerName}</strong> — {formatPrice(lot.currentPrice)}</span>
              <Icon name="Phone" size={14} className="text-[#4CAF50] shrink-0" />
            </button>
          )}

          {lot.status === "finished" && (
            <div>
              <p className="text-[11px] text-[#767676] mb-2 font-medium uppercase tracking-wide">Статус оплаты</p>
              <div className="flex flex-wrap gap-1.5">
                {(["pending", "paid", "issued", "cancelled"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => onUpdateStatus(lot.id, s)}
                    className={`text-xs font-medium px-2.5 py-1 rounded-full border transition-all ${lot.paymentStatus === s ? paymentColors[s] : "border-[#E0E0E0] text-[#767676] bg-white"}`}
                  >
                    {paymentLabels[s]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={() => onEditLot(lot.id)}
              className="flex-1 flex items-center justify-center gap-1.5 border border-[#E0E0E0] rounded-xl py-2 text-sm text-[#1C1C1E] font-medium"
            >
              <Icon name="Pencil" size={14} />
              Редактировать
            </button>
            {lot.status === "active" && (
              <button
                onClick={() => onStopLot(lot.id)}
                className="flex items-center justify-center gap-1.5 bg-[#FFEBEE] rounded-xl py-2 px-3 text-sm text-[#C62828] font-medium"
              >
                <Icon name="Square" size={14} />
                Стоп
              </button>
            )}
            {confirmDelete ? (
              <div className="flex gap-1">
                <button
                  onClick={() => onDeleteLot(lot.id)}
                  className="flex items-center justify-center gap-1 bg-red-600 rounded-xl py-2 px-3 text-sm text-white font-semibold"
                >
                  <Icon name="Trash2" size={14} />
                  Да
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center justify-center rounded-xl py-2 px-3 text-sm text-[#767676] border border-[#E0E0E0] font-medium"
                >
                  Нет
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex items-center justify-center rounded-xl py-2 px-3 border border-[#E0E0E0] text-[#767676]"
                title="Удалить лот"
              >
                <Icon name="Trash2" size={14} />
              </button>
            )}
          </div>

          {lot.bids.length > 0 && (
            <div>
              <p className="text-[11px] text-[#767676] font-medium mb-1.5 uppercase tracking-wide">Последние ставки</p>
              <div className="space-y-1.5">
                {lot.bids.slice(0, 5).map((b, i) => (
                  <div key={b.id} className="flex items-center gap-2 text-[12px]">
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0 ${i === 0 ? "bg-[#2787F5] text-white" : "bg-[#E0E0E0] text-[#767676]"}`}>
                      {b.userAvatar}
                    </div>
                    <span className="flex-1 text-[#1C1C1E] truncate">{b.userName}</span>
                    <span className="font-semibold text-[#1C1C1E]">{formatPrice(b.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
    </>
  );
}