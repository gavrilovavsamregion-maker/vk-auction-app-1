import { useState, useEffect } from "react";
import bridge from "@vkontakte/vk-bridge";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { AdminLotCard } from "@/components/auction/AdminLotCard";
export { AdminLotForm } from "@/components/auction/AdminLotForm";

const TRACK_URL = "https://functions.poehali.dev/e8bd7a1d-ec16-415b-ade0-2d0e35b9ba7e";
const WIDGET_URL = "https://functions.poehali.dev/f4e406ad-f9d7-4701-a9bf-7f93b9c2c96f";

type VisitorEntry = { vkUserId: string; userName: string; visitedAt: string };
type VisitorsData = { totalUnique: number; todayUnique: number; recent: VisitorEntry[] };

function VisitorsModal({ data, onClose }: { data: VisitorsData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-sm mx-4 overflow-hidden shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#E8E8E8]">
          <p className="font-semibold text-[15px] text-[#1C1C1E]">Последние посетители</p>
          <button onClick={onClose} className="text-[#767676]"><Icon name="X" size={18} /></button>
        </div>
        <div className="divide-y divide-[#F0EDE8]">
          {(data.recent ?? []).length === 0 && (
            <p className="text-center text-sm text-[#767676] py-6">Нет данных</p>
          )}
          {(data.recent ?? []).map((v, i) => {
            const initials = v.userName.split(" ").map((w) => w[0]).filter(Boolean).slice(0, 2).join("");
            const date = new Date(v.visitedAt);
            const dateStr = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
            const timeStr = date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
            return (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ background: "#C9A84C" }}>
                  {initials || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://vk.com/id${v.vkUserId}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[13px] font-medium text-[#2787F5] underline decoration-dotted truncate block"
                  >
                    {v.userName || `id${v.vkUserId}`}
                  </a>
                </div>
                <span className="text-[11px] text-[#B8A070] shrink-0">{dateStr}, {timeStr}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function AdminScreen({ lots, onEditLot, onNewLot, onUpdateStatus, onStopLot, onDeleteLot, adminId }: {
  lots: Lot[];
  onEditLot: (id: string) => void;
  onNewLot: () => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
  onStopLot: (id: string) => void;
  onDeleteLot: (id: string) => void;
  adminId?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<VisitorsData | null>(null);
  const [showVisitors, setShowVisitors] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [widgetError, setWidgetError] = useState("");

  useEffect(() => {
    if (!adminId) return;
    fetch(`${TRACK_URL}?requesterId=${adminId}`)
      .then((r) => r.json())
      .then((d) => {
        const parsed = typeof d === "string" ? JSON.parse(d) : d;
        setVisitors(parsed);
      })
      .catch(() => {});
  }, [adminId]);

  async function updateWidget() {
    setWidgetStatus("loading");
    setWidgetError("");
    try {
      const params = new URLSearchParams(window.location.search);
      const groupId = params.get("vk_group_id");
      if (!groupId) {
        setWidgetError("Откройте приложение через сообщество ВКонтакте");
        setWidgetStatus("error");
        return;
      }
      const tokenRes = await bridge.send("VKWebAppGetCommunityAuthToken", {
        app_id: 54464410,
        group_id: Number(groupId),
        scope: "app_widget",
      });
      const token = tokenRes.access_token;
      const res = await fetch(WIDGET_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ communityToken: token, groupId }),
      });
      const data = await res.json();
      const parsed = typeof data === "string" ? JSON.parse(data) : data;
      if (parsed.ok) {
        setWidgetStatus("ok");
        setTimeout(() => setWidgetStatus("idle"), 3000);
      } else {
        setWidgetError(parsed.error || "Ошибка VK API");
        setWidgetStatus("error");
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setWidgetError(msg.includes("User denied") ? "Вы отклонили запрос токена" : msg);
      setWidgetStatus("error");
    }
  }

  function downloadCSV() {
    const rows = [["Лот", "Победитель", "Цена", "Статус оплаты"]];
    lots.filter((l) => l.status === "finished").forEach((l) => {
      rows.push([l.title, l.winnerName || "—", String(l.currentPrice), l.paymentStatus || "pending"]);
    });
    const csv = rows.map((r) => r.join(";")).join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "auction_results.csv"; a.click();
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 pt-4 pb-3 bg-white border-b border-[#E8E8E8] flex items-center justify-between">
        <div>
          <h1 className="text-[22px] font-bold text-[#1C1C1E]">Панель админа</h1>
          <p className="text-xs text-[#767676]">{lots.length} лотов всего</p>
        </div>
        <button onClick={onNewLot} className="flex items-center gap-1.5 bg-[#2787F5] text-white rounded-xl px-3 py-2 text-sm font-semibold">
          <Icon name="Plus" size={16} />
          Новый лот
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-3">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Активных", val: lots.filter((l) => l.status === "active").length, color: "text-[#4CAF50]" },
            { label: "Завершённых", val: lots.filter((l) => l.status === "finished").length, color: "text-[#767676]" },
            { label: "Всего ставок", val: lots.reduce((s, l) => s + (l.bidCount ?? l.bids.length), 0), color: "text-[#2787F5]" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
              <p className={`text-[20px] font-bold ${s.color}`}>{s.val}</p>
              <p className="text-[10px] text-[#767676] leading-tight mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Visitors */}
        {visitors && (
          <button
            className="w-full grid grid-cols-2 gap-2"
            onClick={() => setShowVisitors(true)}
          >
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
              <p className="text-[20px] font-bold text-[#C9A84C]">{visitors.totalUnique}</p>
              <p className="text-[10px] text-[#767676] leading-tight mt-0.5">Уникальных за всё время</p>
            </div>
            <div className="bg-white border border-[#E8E8E8] rounded-xl p-3 text-center">
              <p className="text-[20px] font-bold text-[#C9A84C]">{visitors.todayUnique}</p>
              <p className="text-[10px] text-[#767676] leading-tight mt-0.5">За последние 24 часа</p>
            </div>
          </button>
        )}
        {showVisitors && visitors && (
          <VisitorsModal data={visitors} onClose={() => setShowVisitors(false)} />
        )}

        {/* Export */}
        <button
          onClick={downloadCSV}
          className="w-full flex items-center justify-center gap-2 border border-[#E0E0E0] bg-white rounded-xl py-2.5 text-sm font-medium text-[#1C1C1E]"
        >
          <Icon name="Download" size={15} />
          Экспорт результатов CSV
        </button>

        {/* Widget update */}
        <div className="flex flex-col gap-1">
          <button
            onClick={updateWidget}
            disabled={widgetStatus === "loading"}
            className="w-full flex items-center justify-center gap-2 border border-[#2787F5] bg-white rounded-xl py-2.5 text-sm font-medium text-[#2787F5] disabled:opacity-50"
          >
            <Icon name={widgetStatus === "ok" ? "Check" : "LayoutGrid"} size={15} />
            {widgetStatus === "loading" ? "Обновляем виджет..." : widgetStatus === "ok" ? "Виджет обновлён!" : "Обновить виджет сообщества"}
          </button>
          {widgetStatus === "error" && (
            <p className="text-xs text-red-500 text-center">{widgetError}</p>
          )}
        </div>

        {/* Lot list */}
        {lots.map((lot) => (
          <AdminLotCard
            key={lot.id}
            lot={lot}
            expanded={expandedId === lot.id}
            onToggle={() => setExpandedId(expandedId === lot.id ? null : lot.id)}
            onEditLot={onEditLot}
            onUpdateStatus={onUpdateStatus}
            onStopLot={onStopLot}
            onDeleteLot={onDeleteLot}
          />
        ))}
      </div>
    </div>
  );
}