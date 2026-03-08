import { useAuction } from "@/hooks/useAuction";
import { useIsDesktop } from "@/hooks/useIsDesktop";
import { CatalogScreen, LotScreen, BidsScreen, ProfileScreen, BottomNav } from "@/components/auction/LotScreens";
import { AdminScreen, AdminLotForm } from "@/components/auction/AdminScreens";
import { DesktopLayout } from "@/components/auction/DesktopLayout";

const LOGO = "https://cdn.poehali.dev/projects/0a068cc6-e718-493c-b038-60253ef8dd25/bucket/e8607ced-0dd6-499e-ad13-b8e50e125d2f.jpg";

export function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FAF8F4]">
      <div className="text-center flex flex-col items-center gap-5">
        <img src={LOGO} alt="Joylots" className="w-20 h-20 object-contain" />
        <div>
          <p className="font-bold text-2xl" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.18em" }}>JOYLOTS</p>
          <p className="text-xs mt-1 text-[#B8A070]">Аукцион</p>
        </div>
        <div className="w-7 h-7 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
      </div>
    </div>
  );
}

export function MobileShell() {
  const { screen, setScreen, lots, activeLot, editingLot, editingLotId, setEditingLotId, loading, user, vkUser, goLot, handleBid, handleAutoBid, handleSaveLot, handleUpdateStatus, handleStopLot, handleDeleteLot, loadLots, notificationsDeclined, requestNotificationPermission, resetNotificationsState } = useAuction();

  if (vkUser.isLoading) return <LoadingScreen />;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#EDE8DF]">
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>

      <div
        className="relative w-full bg-[#F7F4EF] flex flex-col overflow-hidden"
        style={{
          maxWidth: 390,
          height: "100svh",
          maxHeight: 844,
          borderRadius: 28,
          fontFamily: "'Golos Text', sans-serif",
          boxShadow: "0 20px 60px #00000030, 0 0 0 1px #D4BF8A44",
        }}
      >
        <div className="bg-white px-4 py-2.5 flex items-center justify-between shrink-0 border-b border-[#EDE8DF]">
          <div className="flex items-center gap-2.5">
            <img src={LOGO} alt="Joylots" className="w-7 h-7 object-contain" />
            <span className="font-bold text-[16px]" style={{ fontFamily: "'Cormorant Garamond', serif", color: "#B8922A", letterSpacing: "0.15em" }}>
              JOYLOTS
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-[#F7F4EF]">
          {loading && screen === "catalog" ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-[#B8A070]">
              <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin border-[#C9A84C]" />
              <p className="text-sm">Загружаем аукционы…</p>
            </div>
          ) : (
            <>
              {screen === "catalog" && <CatalogScreen lots={lots} onLot={goLot} isAdmin={user.isAdmin} isGuest={user.id === "guest"} />}
              {screen === "lot" && activeLot && (
                <LotScreen
                  key={activeLot.id}
                  lot={activeLot}
                  user={user}
                  onBack={() => { setScreen("catalog"); loadLots(); }}
                  onBid={handleBid}
                  onAutoBid={handleAutoBid}
                  notificationsDeclined={notificationsDeclined}
                  onEnableNotifications={requestNotificationPermission}
                />
              )}
              {screen === "lot" && !activeLot && (
                <div className="flex-1 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-[#2787F5] border-t-transparent rounded-full animate-spin" />
                </div>
              )}
              {screen === "bids" && <BidsScreen lots={lots} user={user} onLot={goLot} />}
              {screen === "profile" && <ProfileScreen user={user} lots={lots} />}
              {screen === "admin" && (
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
              )}
              {screen === "admin-lot" && (
                <AdminLotForm
                  lot={editingLot}
                  onBack={() => setScreen("admin")}
                  onSave={handleSaveLot}
                />
              )}
            </>
          )}
        </div>

        <BottomNav screen={screen} onNav={setScreen} isAdmin={user.isAdmin} />
      </div>
    </div>
  );
}

export function DesktopShell() {
  const { lots, loading, user, vkUser, handleBid, handleAutoBid, handleSaveLot, handleUpdateStatus, handleStopLot, handleDeleteLot, resetNotificationsState } = useAuction();

  if (vkUser.isLoading) return <LoadingScreen />;

  return (
    <DesktopLayout
      lots={lots}
      user={user}
      loading={loading}
      onBid={handleBid}
      onAutoBid={handleAutoBid}
      onSaveLot={handleSaveLot}
      onUpdateStatus={handleUpdateStatus}
      onStopLot={handleStopLot}
      onDeleteLot={handleDeleteLot}
      onResetNotifications={resetNotificationsState}
    />
  );
}

export default function Index() {
  const isDesktop = useIsDesktop();
  return isDesktop ? <DesktopShell /> : <MobileShell />;
}