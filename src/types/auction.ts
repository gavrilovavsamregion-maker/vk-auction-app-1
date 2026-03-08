export type Screen = "catalog" | "lot" | "bids" | "profile" | "admin" | "admin-lot";

export interface Bid {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  amount: number;
  createdAt: Date;
}

export interface AutoBid {
  maxAmount: number;
  userId: string;
}

export interface Lot {
  id: string;
  title: string;
  description: string;
  image: string;
  video?: string;
  videoDuration?: number;
  startPrice: number;
  currentPrice: number;
  step: number;
  startsAt?: Date;
  endsAt: Date;
  status: "active" | "finished" | "upcoming" | "cancelled";
  winnerId?: string;
  winnerName?: string;
  antiSnipe: boolean;
  antiSnipeMinutes: number;
  bids: Bid[];
  paymentStatus?: "pending" | "paid" | "issued" | "cancelled";
  leaderId?: string;
  leaderName?: string;
  leaderAvatar?: string;
  bidCount?: number;
  myAutoBid?: AutoBid;
}

export interface User {
  id: string;
  numericId?: string;
  name: string;
  avatar: string;
  photoUrl?: string;
  isAdmin: boolean;
}