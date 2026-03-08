import { useState, useEffect } from "react";
import bridge from "@vkontakte/vk-bridge";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { AdminLotCard } from "@/components/auction/AdminLotCard";
export { AdminLotForm } from "@/components/auction/AdminLotForm";

const TRACK_URL = "https://functions.poehali.dev/e8bd7a1d-ec16-415b-ade0-2d0e35b9ba7e";
const WIDGET_URL = "https://functions.poehali.dev/f4e406ad-f9d7-4701-a9bf-7f93b9c2c96f";
const ADMIN_URL = "https://functions.poehali.dev/c80458b7-040f-4c1e-afc7-9418aa34e00f";

type NotifKey = "outbid" | "ending_15min" | "winner";
type NotifConfig = { key: NotifKey; enabled: boolean };

const NOTIF_LABELS: Record<NotifKey, { label: string; desc: string; icon: string }> = {
  outbid: { label: "Перебили ставку", desc: "Когда участника перебивают и он остаётся не лидером 5+ мин", icon: "TrendingUp" },
  ending_15min: { label: "Скоро конец аукциона", desc: "За ~15 минут до завершения всем участникам лота", icon: "Clock" },
  winner: { label: "Победитель", desc: "Уведомление победителю после завершения лота", icon: "Trophy" },
};

function NotificationsPanel({ adminId }: { adminId?: string }) {
  const [config, setConfig] = useState<NotifConfig[]>([]);
  const [subscribers, setSubscribers] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!adminId) return;
    fetch(ADMIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "get_notification_config" }),
    })
      .then((r) => r.json())
      .then((d) => {
        setConfig(d.config ?? []);
        setSubscribers(d.subscribers ?? 0);
      })
      .finally(() => setLoading(false));
  }, [adminId]);

  async function toggle(key: NotifKey, enabled: boolean) {
    setSaving(key);
    setConfig((prev) => prev.map((c) => c.key === key ? { ...c, enabled } : c));
    await fetch(ADMIN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "set_notification_config", key, enabled }),
    });
    setSaving(null);
  }

  if (!adminId) return null;

  return (
    <div className="border border-[#E0E0E0] bg-white rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#F0EDE8]">
        <div className="flex items-center gap-2">
          <Icon name="Bell" size={14} className="text-[#C9A84C]" />
          <span className="text-[13px] font-semibold text-[#1C1C1E]">Уведомления</span>
        </div>
        {subscribers !== null && (
          <span className="text-[11px] text-[#767676]">{subscribers} подписчиков</span>
        )}
      </div>
      {loading ? (
        <div className="px-3 py-4 text-[12px] text-[#767676] text-center">Загрузка…</div>
      ) : (
        <div className="divide-y divide-[#F5F5F5]">
          {config.map((c) => {
            const meta = NOTIF_LABELS[c.key] ?? { label: c.key, desc: "", icon: "Bell" };
            return (
              <div key={c.key} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.enabled ? "#FFF8E7" : "#F5F5F5" }}>
                  <Icon name={meta.icon} size={14} className={c.enabled ? "text-[#C9A84C]" : "text-[#AAAAAA]"} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[#1C1C1E]">{meta.label}</p>
                  <p className="text-[10px] text-[#767676] leading-tight">{meta.desc}</p>
                </div>
                <button
                  onClick={() => toggle(c.key, !c.enabled)}
                  disabled={saving === c.key}
                  className={`w-10 h-6 rounded-full transition-colors shrink-0 relative disabled:opacity-50 ${c.enabled ? "bg-[#C9A84C]" : "bg-[#D0D0D0]"}`}
                >
                  <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${c.enabled ? "left-4" : "left-0.5"}`} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

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

export function AdminScreen({ lots, onEditLot, onNewLot, onUpdateStatus, onStopLot, onDeleteLot, adminId, onResetNotifications }: {
  lots: Lot[];
  onEditLot: (id: string) => void;
  onNewLot: () => void;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => void;
  onStopLot: (id: string) => void;
  onDeleteLot: (id: string) => void;
  adminId?: string;
  onResetNotifications?: () => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [visitors, setVisitors] = useState<VisitorsData | null>(null);
  const [showVisitors, setShowVisitors] = useState(false);
  const [widgetStatus, setWidgetStatus] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [widgetError, setWidgetError] = useState("");
  const [resetDone, setResetDone] = useState(false);

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

        {/* Notifications */}
        <NotificationsPanel adminId={adminId} />

        {/* Dev: reset notifications state */}
        {onResetNotifications && (
          <button
            onClick={() => { onResetNotifications(); setResetDone(true); setTimeout(() => setResetDone(false), 2000); }}
            className="w-full flex items-center justify-center gap-2 border border-dashed rounded-xl py-2.5 text-[12px] font-medium transition-colors"
            style={resetDone
              ? { borderColor: "#4CAF50", background: "#F0FFF0", color: "#4CAF50" }
              : { borderColor: "#D0C0A0", background: "#FFFDF5", color: "#B8922A" }}
          >
            <Icon name={resetDone ? "Check" : "RotateCcw"} size={13} />
            {resetDone ? "Сброшено — теперь сделай ставку" : "Сбросить статус уведомлений (тест)"}
          </button>
        )}

        {/* Export */}
        <button
          onClick={downloadCSV}
          className="w-full flex items-center justify-center gap-2 border border-[#E0E0E0] bg-white rounded-xl py-2.5 text-sm font-medium text-[#1C1C1E]"
        >
          <Icon name="Download" size={15} />
          Экспорт результатов CSV
        </button>

        {/* Widget block */}
        <div className="border border-[#E0E0E0] bg-white rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#F0EDE8]">
            <div className="flex items-center gap-2">
              <Icon name="LayoutGrid" size={14} className="text-[#2787F5]" />
              <span className="text-[13px] font-semibold text-[#1C1C1E]">Виджет сообщества</span>
            </div>
            <button
              onClick={updateWidget}
              disabled={widgetStatus === "loading"}
              className="flex items-center gap-1 bg-[#2787F5] text-white rounded-lg px-2.5 py-1 text-[12px] font-medium disabled:opacity-50"
            >
              <Icon name={widgetStatus === "ok" ? "Check" : "RefreshCw"} size={11} />
              {widgetStatus === "loading" ? "Обновляем..." : widgetStatus === "ok" ? "Обновлено!" : "Обновить"}
            </button>
          </div>

          {/* VK widget preview */}
          <div className="px-3 py-2.5">
            <p className="text-[10px] text-[#B0A080] uppercase tracking-wide mb-2">Так выглядит в сообществе ВКонтакте</p>

            {/* VK-style widget mockup */}
            <div className="bg-[#F5F5F5] rounded-lg p-2.5 border border-[#E0E0E0]">
              {/* Widget title row */}
              <div className="flex items-center justify-between mb-2">
                <span className="text-[13px] font-semibold text-[#2C2D2E]">🔨 Аукционы сообщества</span>
                <span className="text-[11px] text-[#2787F5]">Все</span>
              </div>

              {/* Lot rows */}
              {lots.filter(l => l.status === "active" || l.status === "upcoming").slice(0, 6).length === 0 ? (
                <p className="text-[12px] text-[#767676] text-center py-3">Нет активных лотов</p>
              ) : (
                <div className="space-y-1.5">
                  {lots.filter(l => l.status === "active" || l.status === "upcoming").slice(0, 6).map(lot => {
                    const now = new Date();
                    const diff = Math.max(0, lot.endsAt.getTime() - now.getTime());
                    const h = Math.floor(diff / 3600000);
                    const m = Math.floor((diff % 3600000) / 60000);
                    const timeStr = diff === 0 ? "Завершается" : h > 0 ? `Осталось ${h}ч ${m}м` : `Осталось ${m}м`;
                    const bids = lot.bidCount ?? lot.bids.length;
                    return (
                      <div key={lot.id} className="flex items-center gap-2 bg-white rounded-md px-2 py-1.5">
                        {lot.image ? (
                          <img src={lot.image} alt="" className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-[#E8E8E8] shrink-0 flex items-center justify-center">
                            <Icon name="Package" size={14} className="text-[#AAAAAA]" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#2C2D2E] truncate">{lot.title}</p>
                          <p className="text-[10px] text-[#767676] truncate">
                            {lot.currentPrice.toLocaleString("ru-RU")} ₽ · {bids} ставок · {timeStr}
                          </p>
                        </div>
                        <span className="text-[11px] text-[#2787F5] font-medium shrink-0">Участвовать</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <p className="text-[10px] text-[#B0A080] mt-1.5 text-center">Нажмите «Обновить» чтобы применить изменения в ВКонтакте</p>
          </div>

          {widgetStatus === "error" && (
            <p className="text-xs text-red-500 text-center px-3 pb-2.5">{widgetError}</p>
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