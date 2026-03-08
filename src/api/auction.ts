import type { Bid, Lot, User } from "@/types/auction";

const API = {
  lots: "https://functions.poehali.dev/a4ff5c7f-b025-48d2-bb94-cc014f6d2568",
  bid: "https://functions.poehali.dev/ba11208b-97ba-4756-b7b9-eba826787166",
  admin: "https://functions.poehali.dev/c80458b7-040f-4c1e-afc7-9418aa34e00f",
};

type ApiResponse = Record<string, unknown>;

async function apiFetch(url: string, opts?: RequestInit): Promise<ApiResponse | ApiResponse[]> {
  try {
    const r = await fetch(url, { headers: { "Content-Type": "application/json" }, ...opts });
    if (!r.ok) {
      const text = await r.text();
      console.error(`[api] HTTP ${r.status} for ${url}:`, text);
      try { return JSON.parse(text) as ApiResponse; } catch { return { error: `HTTP ${r.status}: ${text}` }; }
    }
    return r.json() as Promise<ApiResponse | ApiResponse[]>;
  } catch (e) {
    console.error(`Fetch error: ${e} for ${url}`);
    throw e;
  }
}

export function apiGetLots(): Promise<ApiResponse | ApiResponse[]> {
  return apiFetch(API.lots);
}

export function apiGetLot(id: number, userId?: string): Promise<ApiResponse | ApiResponse[]> {
  const qs = userId ? `?id=${id}&userId=${encodeURIComponent(userId)}` : `?id=${id}`;
  return apiFetch(`${API.lots}${qs}`);
}

export function apiPlaceBid(lotId: number, amount: number, user: User): Promise<ApiResponse | ApiResponse[]> {
  return apiFetch(API.bid, {
    method: "POST",
    body: JSON.stringify({ lotId, amount, userId: user.id, userName: user.name, userAvatar: user.avatar }),
  });
}

export function apiAdmin(body: object): Promise<ApiResponse | ApiResponse[]> {
  return apiFetch(API.admin, { method: "POST", body: JSON.stringify(body) });
}

export function apiSetAutoBid(lotId: number, maxAmount: number, user: User): Promise<ApiResponse | ApiResponse[]> {
  return apiFetch(API.bid, {
    method: "POST",
    body: JSON.stringify({ action: "auto_bid", lotId, maxAmount, userId: user.id, userName: user.name, userAvatar: user.avatar }),
  });
}

export function apiAllowNotifications(userId: string): Promise<ApiResponse | ApiResponse[]> {
  return apiFetch(API.bid, {
    method: "POST",
    body: JSON.stringify({ action: "allow_notifications", userId }),
  });
}

function normalizeBid(b: ApiResponse): Bid {
  return {
    id: String(b.id),
    userId: String(b.userId ?? b.user_id ?? ""),
    userName: String(b.userName ?? b.user_name ?? ""),
    userAvatar: String(b.userAvatar ?? b.user_avatar ?? "??"),
    amount: Number(b.amount),
    createdAt: new Date(String(b.createdAt ?? b.created_at ?? "")),
  };
}

const VALID_STATUSES = new Set(["active", "finished", "upcoming", "cancelled"]);

function safeDate(val: unknown, fallback: Date = new Date(0)): Date {
  if (!val) return fallback;
  const d = new Date(String(val));
  return isNaN(d.getTime()) ? fallback : d;
}

export function normalizeLot(r: ApiResponse): Lot {
  const bidsRaw = r.bids as ApiResponse[] | undefined;
  const startsAtRaw = r.startsAt ?? r.starts_at;
  const myAutoBidRaw = r.myAutoBid as ApiResponse | undefined;
  const videoDurationRaw = r.videoDuration ?? r.video_duration;
  const rawStatus = String(r.status ?? "");
  return {
    id: String(r.id),
    title: String(r.title ?? ""),
    description: String(r.description ?? ""),
    image: String(r.image ?? ""),
    video: r.video ? String(r.video) : "",
    videoDuration: videoDurationRaw != null ? Number(videoDurationRaw) : undefined,
    startPrice: Number(r.startPrice ?? r.start_price ?? 0),
    currentPrice: Number(r.currentPrice ?? r.current_price ?? 0),
    step: Number(r.step ?? 100),
    startsAt: startsAtRaw ? safeDate(startsAtRaw) : undefined,
    endsAt: safeDate(r.endsAt ?? r.ends_at, new Date(0)),
    status: (VALID_STATUSES.has(rawStatus) ? rawStatus : "active") as Lot["status"],
    winnerId: (r.winnerId ?? r.winner_id) as string | undefined,
    winnerName: (r.winnerName ?? r.winner_name) as string | undefined,
    antiSnipe: Boolean(r.antiSnipe ?? r.anti_snipe ?? false),
    antiSnipeMinutes: Number(r.antiSnipeMinutes ?? r.anti_snipe_minutes ?? 2),
    paymentStatus: (r.paymentStatus ?? r.payment_status) as Lot["paymentStatus"],
    leaderId: r.leaderId as string | undefined,
    leaderName: r.leaderName as string | undefined,
    leaderAvatar: r.leaderAvatar as string | undefined,
    bidCount: Number(r.bidCount ?? 0),
    bids: bidsRaw ? bidsRaw.map(normalizeBid) : [],
    myAutoBid: myAutoBidRaw ? { maxAmount: Number(myAutoBidRaw.maxAmount ?? myAutoBidRaw.max_amount), userId: String(myAutoBidRaw.userId ?? myAutoBidRaw.user_id ?? "") } : undefined,
  };
}