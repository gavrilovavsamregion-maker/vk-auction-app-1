import { useState } from "react";
import Icon from "@/components/ui/icon";
import { useAuction } from "@/hooks/useAuction";
import { LoadingScreen } from "@/pages/Index";
import { DesktopCatalog } from "@/components/auction/DesktopCatalog";
import { BidsScreen, ProfileScreen } from "@/components/auction/UserScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";
import type { Lot } from "@/types/auction";

type VKScreen = "catalog" | "bids" | "profile" | "admin" | "admin-lot";

export default function VKDesktopPage() {
  const {
    lots, loading, user, vkUser,
    handleBid, handleSaveLot, handleUpdateStatus, handleStopLot, handleDeleteLot, handleAutoBid,
    resetNotificationsState,
  } = useAuction();

  const [screen, setScreen] = useState<VKScreen>("catalog");
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);

  if (vkUser.isLoading) return <LoadingScreen />;

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  const navItems = [
    { id: "catalog", icon: "Gavel", label: "Аукцион" },
    { id: "bids", icon: "List", label: "Мои ставки" },
    { id: "profile", icon: "User", label: "Профиль" },
    ...(user.isAdmin ? [{ id: "admin", icon: "Settings", label: "Управление" }] : []),
  ] as const;

  return (
    <div className="flex flex-col h-screen bg-[#EDE8DF]" style={{ fontFamily: "'Golos Text', sans-serif" }}>
      {/* Top nav bar */}
      <header className="shrink-0 flex items-center gap-1 px-3 py-2 bg-white border-b border-[#EDE8DF]" style={{ boxShadow: "0 1px 0 #EDE0C8" }}>
        <div className="flex items-center gap-2 mr-4">
          <img
            src="https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg"
            alt="Joylots"
            className="w-6 h-6 object-contain"
          />
          <span className="font-bold text-[15px]" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.12em" }}>
            JOYLOTS
          </span>
        </div>

        {navItems.map((item) => {
          const isActive = screen === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setScreen(item.id as VKScreen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all"
              style={isActive ? { background: "#FAF3E0", color: "#B8922A" } : { color: "#767676" }}
            >
              <Icon name={item.icon as string} size={15} />
              {item.label}
            </button>
          );
        })}

        {/* User badge */}
        <div className="ml-auto flex items-center gap-2">
          <div className="w-6 h-6 rounded-full text-white flex items-center justify-center text-[10px] font-bold" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
            {user.avatar ?? user.name[0]}
          </div>
          <span className="text-[13px] text-[#1C1A16] font-medium hidden sm:inline">{user.name}</span>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 min-h-0 overflow-hidden">
        {loading && screen === "catalog" ? (
          <div className="flex flex-col items-center justify-center h-full gap-3 text-[#B8A070]">
            <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
            <p className="text-sm">Загружаем аукционы…</p>
          </div>
        ) : (
          <>
            {screen === "catalog" && (
              <DesktopCatalog lots={lots} user={user} onBid={handleBid} />
            )}
            {screen === "bids" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <BidsScreen lots={lots} user={user} onLot={() => setScreen("catalog")} />
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
                  onEditLot={(id) => { setEditingLotId(id); setScreen("admin-lot"); }}
                  onNewLot={() => { setEditingLotId("new"); setScreen("admin-lot"); }}
                  onUpdateStatus={handleUpdateStatus}
                  onStopLot={handleStopLot}
                  onDeleteLot={handleDeleteLot}
                  adminId={user.numericId}
                  onResetNotifications={resetNotificationsState}
                />
              </div>
            )}
            {screen === "admin-lot" && (
              <div className="h-full overflow-y-auto bg-[#F7F4EF]">
                <AdminLotForm
                  lot={editingLot}
                  onSave={async (data: Partial<Lot>) => { await handleSaveLot(data); setScreen("admin"); }}
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