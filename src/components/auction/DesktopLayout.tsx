import { useState, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Lot, User } from "@/types/auction";
import { BidsScreen, ProfileScreen } from "@/components/auction/UserScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";
import { DesktopCatalog } from "@/components/auction/DesktopCatalog";

export type DesktopScreen = "catalog" | "bids" | "profile" | "admin" | "admin-lot";

export function DesktopLayout({
  lots,
  user,
  loading,
  onBid,
  onAutoBid,
  onSaveLot,
  onUpdateStatus,
  onStopLot,
  onDeleteLot,
  onResetNotifications,
  onRequestNotifications,
}: {
  lots: Lot[];
  user: User;
  loading: boolean;
  onBid: (lotId: string, amount: number) => Promise<string>;
  onAutoBid?: (lotId: string, maxAmount: number) => Promise<string>;
  onSaveLot: (data: Partial<Lot>, lotId?: string | null) => Promise<void>;
  onUpdateStatus: (id: string, status: Lot["paymentStatus"]) => Promise<void>;
  onStopLot: (id: string) => Promise<void>;
  onDeleteLot: (id: string) => Promise<void>;
  onResetNotifications?: () => void;
}) {
  const [screen, setScreen] = useState<DesktopScreen>("catalog");
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const editingLotIdRef = useRef<string | null | "new">(null);

  const navItems = [
    { id: "catalog", icon: "Gavel", label: "Аукцион" },
    { id: "bids", icon: "List", label: "Мои ставки" },
    { id: "profile", icon: "User", label: "Профиль" },
    ...(user.isAdmin ? [{ id: "admin", icon: "Settings", label: "Управление" }] : []),
  ] as const;

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  return (
    <div className="flex h-screen bg-[#EDE8DF]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Sidebar — широкий на больших экранах, иконочный на узких */}
      <aside className="shrink-0 flex flex-col bg-white border-r border-[#EDE8DF] w-14 lg:w-52" style={{ boxShadow: "1px 0 0 #EDE0C8" }}>
        {/* Logo */}
        <div className="px-2 lg:px-5 py-4 border-b border-[#EDE8DF] flex items-center justify-center lg:justify-start lg:gap-2.5">
          <img
            src="https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg"
            alt="Joylots"
            className="w-7 h-7 object-contain shrink-0"
          />
          <div className="hidden lg:block">
            <span className="font-bold text-[16px]" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.15em" }}>
              JOYLOTS
            </span>
            <p className="text-xs text-[#B8A070]">Аукцион</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-1">
          {navItems.map((item) => {
            const isActive = screen === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setScreen(item.id as DesktopScreen)}
                className="w-full flex items-center justify-center lg:justify-start lg:gap-3 lg:px-3 py-2.5 rounded-xl text-left transition-all"
                style={
                  isActive
                    ? { background: "#FAF3E0", color: "#B8922A", fontWeight: 600 }
                    : { color: "#767676" }
                }
                title={item.label}
              >
                <Icon name={item.icon as string} size={18} />
                <span className="hidden lg:inline text-[14px]">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-2 lg:px-4 py-3 border-t border-[#EDE8DF] flex items-center justify-center lg:justify-start lg:gap-2.5">
          <div className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold shrink-0" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
            {user.avatar ?? user.name[0]}
          </div>
          <div className="hidden lg:block min-w-0">
            <p className="text-[13px] font-semibold text-[#1C1A16] truncate">{user.name}</p>
            {user.isAdmin && <p className="text-[11px] text-[#B8A070]">Администратор</p>}
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0 overflow-hidden">
        {loading && screen === "catalog" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#B8A070]">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
            <p className="text-sm">Загружаем аукционы…</p>
          </div>
        ) : (
          <>
            {screen === "catalog" && (
              <DesktopCatalog lots={lots} user={user} onBid={onBid} onAutoBid={onAutoBid} />
            )}
            {screen === "bids" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <BidsScreen lots={lots} user={user} onLot={() => { setScreen("catalog"); }} />
              </div>
            )}
            {screen === "profile" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <ProfileScreen user={user} lots={lots} />
              </div>
            )}
            {screen === "admin" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <AdminScreen
                  lots={lots}
                  onEditLot={(id) => { editingLotIdRef.current = id; setEditingLotId(id); setScreen("admin-lot"); }}
                  onNewLot={() => { editingLotIdRef.current = "new"; setEditingLotId("new"); setScreen("admin-lot"); }}
                  onUpdateStatus={onUpdateStatus}
                  onStopLot={onStopLot}
                  onDeleteLot={onDeleteLot}
                  adminId={user.numericId}
                  onResetNotifications={onResetNotifications}
                />
              </div>
            )}
            {screen === "admin-lot" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <AdminLotForm
                  lot={editingLot}
                  onSave={async (data) => { await onSaveLot(data, editingLotIdRef.current); setScreen("admin"); }}
                  onCancel={() => setScreen("admin")}
                />
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}