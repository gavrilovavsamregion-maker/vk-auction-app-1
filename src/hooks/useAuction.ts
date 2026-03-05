import { useState, useEffect, useCallback, useRef } from "react";
import bridge from "@vkontakte/vk-bridge";
import { useVKUser } from "@/hooks/useVKUser";
import type { Lot, User, Screen } from "@/types/auction";
import { apiGetLots, apiGetLot, apiPlaceBid, apiSetAutoBid, apiAdmin, apiAllowNotifications, normalizeLot } from "@/api/auction";

export function useAuction() {
  const [screen, setScreen] = useState<Screen>("catalog");
  const [lots, setLots] = useState<Lot[]>([]);
  const [activeLot, setActiveLot] = useState<Lot | null>(null);
  const [editingLotId, setEditingLotId] = useState<string | null | "new">(null);
  const [loading, setLoading] = useState(true);
  const notifiedLots = useRef<Set<string>>(new Set());
  const notificationsRequested = useRef(false);
  const [notificationsDeclined, setNotificationsDeclined] = useState(false);
  const vkUser = useVKUser();
  const vkUserId = vkUser.id;

  const user: User = {
    id: vkUser.screenName,
    numericId: vkUser.id,
    name: vkUser.name,
    avatar: vkUser.avatar,
    photoUrl: vkUser.photoUrl,
    isAdmin: vkUser.isAdmin,
  };

  function isMe(id: string | undefined) {
    if (!id || vkUser.screenName === "guest") return false;
    return id === vkUser.screenName || id === vkUser.id || id === `id${vkUser.id}`;
  }

  function notifyWinner(lot: Lot) {
    if (notifiedLots.current.has(lot.id)) return;
    notifiedLots.current.add(lot.id);
    bridge.send("VKWebAppShowMessageBox", {
      title: "🏆 Вы победили!",
      message: `Поздравляем! Вы выиграли лот «${lot.title}» за ${lot.currentPrice.toLocaleString("ru-RU")} ₽. Свяжитесь с организатором для получения приза.`,
      button_text: "Отлично!",
    }).catch(() => null);
  }

  const loadLots = useCallback(async () => {
    try {
      const data = await apiGetLots();
      if (Array.isArray(data)) {
        const normalized = data.map(normalizeLot);
        setLots(normalized);
        normalized.forEach((lot) => {
          if (lot.status === "finished" && isMe(lot.winnerId)) {
            notifyWinner(lot);
          }
        });
      }
    } catch {
      // keep previous state on error
    } finally {
      setLoading(false);
    }
  }, [vkUserId]);

  useEffect(() => {
    loadLots();

    let catalogTimer: ReturnType<typeof setTimeout>;
    function getCatalogInterval() {
      const now = Date.now();
      const minLeft = lots
        .filter((l) => l.status === "active" && l.endsAt)
        .map((l) => l.endsAt!.getTime() - now)
        .reduce((min, ms) => Math.min(min, ms), Infinity);
      if (minLeft < 120_000) return 1000;
      if (minLeft < 600_000) return 5000;
      return 15000;
    }
    function scheduleCatalog() {
      catalogTimer = setTimeout(async () => {
        await loadLots();
        scheduleCatalog();
      }, getCatalogInterval());
    }
    scheduleCatalog();
    return () => clearTimeout(catalogTimer);
  }, [loadLots]);

  async function loadLot(id: string) {
    try {
      const data = await apiGetLot(Number(id), user.id !== "guest" ? user.id : undefined);
      if (!Array.isArray(data) && data && !data.error) {
        setActiveLot(normalizeLot(data as Record<string, unknown>));
      }
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if (screen !== "lot" || !activeLot) return;

    function getInterval() {
      if (!activeLot || activeLot.status !== "active" || !activeLot.endsAt) return 5000;
      const msLeft = activeLot.endsAt.getTime() - Date.now();
      return msLeft < 120_000 ? 1000 : 5000;
    }

    let timerId: ReturnType<typeof setTimeout>;
    function schedule() {
      timerId = setTimeout(async () => {
        await loadLot(activeLot!.id);
        schedule();
      }, getInterval());
    }
    schedule();
    return () => clearTimeout(timerId);
  }, [screen, activeLot?.id, activeLot?.status, activeLot?.endsAt?.getTime()]);

  async function requestNotificationPermission() {
    if (vkUser.screenName === "guest") return;
    if (notificationsRequested.current && !notificationsDeclined) return;
    notificationsRequested.current = true;
    setNotificationsDeclined(false);
    try {
      const res = await bridge.send("VKWebAppCallAPIMethod", {
        method: "groups.getById",
        params: { group_id: "joywood_store", v: "5.131" },
      }) as Record<string, unknown>;
      const groups = res.response as Array<Record<string, unknown>>;
      const groupId = Number(groups?.[0]?.id ?? 0);
      if (!groupId) return;
      await bridge.send("VKWebAppAllowMessagesFromGroup", { group_id: groupId });
      await apiAllowNotifications(vkUser.id);
      setNotificationsDeclined(false);
    } catch (e: unknown) {
      const err = e as { error_data?: { error_reason?: string }; error_type?: string };
      const reason = err?.error_data?.error_reason ?? err?.error_type ?? "";
      // Declined only when user explicitly rejected, not on technical errors (unsupported env etc)
      if (reason === "User denied" || reason === "user_denied") {
        setNotificationsDeclined(true);
      } else {
        notificationsRequested.current = false;
      }
    }
  }

  async function handleBid(lotId: string, amount: number): Promise<string> {
    requestNotificationPermission();
    try {
      const res = await apiPlaceBid(Number(lotId), amount, user) as Record<string, unknown>;
      if (res.error) return String(res.error);
      await Promise.all([loadLot(lotId), loadLots()]);
      return "ok";
    } catch {
      return "Ошибка сети. Попробуйте ещё раз.";
    }
  }

  async function handleSaveLot(data: Partial<Lot>, lotId?: string | null) {
    // lotId: "new" = создать, число/строка = обновить, undefined = брать из editingLotId
    const targetId = lotId !== undefined ? lotId : editingLotId;
    let res: Record<string, unknown>;
    const isNew = !data.id || data.id === "new" || targetId === "new";
    if (isNew) {
      res = await apiAdmin({
        action: "create",
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        startPrice: data.startPrice,
        step: data.step,
        startsAt: data.startsAt?.toISOString() ?? null,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      }) as Record<string, unknown>;
    } else {
      const id = data.id || targetId;
      res = await apiAdmin({
        action: "update",
        lotId: Number(id),
        title: data.title,
        description: data.description,
        image: data.image,
        video: data.video,
        videoDuration: data.videoDuration,
        startPrice: data.startPrice,
        step: data.step,
        startsAt: data.startsAt?.toISOString() ?? null,
        endsAt: data.endsAt?.toISOString(),
        antiSnipe: data.antiSnipe,
        antiSnipeMinutes: data.antiSnipeMinutes,
      }) as Record<string, unknown>;
    }
    if (res?.error) throw new Error(String(res.error));
    await loadLots();
  }

  async function handleAutoBid(lotId: string, maxAmount: number): Promise<string> {
    try {
      const res = await apiSetAutoBid(Number(lotId), maxAmount, user) as Record<string, unknown>;
      if (res.error) return String(res.error);
      await loadLot(lotId);
      return "ok";
    } catch {
      return "Ошибка сети. Попробуйте ещё раз.";
    }
  }

  async function handleUpdateStatus(id: string, status: Lot["paymentStatus"]) {
    await apiAdmin({ action: "update", lotId: Number(id), paymentStatus: status });
    setLots((p) => p.map((l) => l.id === id ? { ...l, paymentStatus: status } : l));
  }

  async function handleStopLot(id: string) {
    await apiAdmin({ action: "stop", lotId: Number(id) });
    await loadLots();
  }

  async function handleDeleteLot(id: string) {
    await apiAdmin({ action: "delete", lotId: Number(id) });
    await loadLots();
  }

  function goLot(id: string) {
    const found = lots.find((l) => l.id === id) || null;
    setActiveLot(found);
    loadLot(id);
    setScreen("lot");
  }

  const editingLot = editingLotId === "new" ? null : lots.find((l) => l.id === editingLotId) || null;

  return {
    screen, setScreen,
    lots,
    activeLot,
    editingLot,
    editingLotId, setEditingLotId,
    loading,
    user,
    vkUser,
    goLot,
    handleBid,
    handleAutoBid,
    handleSaveLot,
    handleUpdateStatus,
    handleStopLot,
    handleDeleteLot,
    loadLots,
    notificationsDeclined,
    requestNotificationPermission,
  };
}