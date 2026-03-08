import { useState, useCallback } from "react";
import bridge from "@vkontakte/vk-bridge";

const GROUP_SCREEN_NAME = "joywood_store";
const LS_KEY = "jw_subscribed";

function isSubscribedLocally(userId: string): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as string[];
    return saved.includes(userId);
  } catch {
    return false;
  }
}

function markSubscribedLocally(userId: string) {
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as string[];
    if (!saved.includes(userId)) {
      saved.push(userId);
      localStorage.setItem(LS_KEY, JSON.stringify(saved));
    }
  } catch (e) { void e; }
}

let cachedGroupId: number | null = null;

async function getGroupId(): Promise<number> {
  if (cachedGroupId) return cachedGroupId;
  const res = await bridge.send("VKWebAppCallAPIMethod", {
    method: "groups.getById",
    params: { group_id: GROUP_SCREEN_NAME, v: "5.131" },
  }) as Record<string, unknown>;
  const groups = (res.response as Array<Record<string, unknown>>);
  cachedGroupId = Number(groups?.[0]?.id ?? groups?.[0]?.group_id ?? 0);
  return cachedGroupId;
}

export function useGroupMember(userId: string) {
  const [isMember, setIsMember] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (): Promise<boolean> => {
    if (userId === "guest" || userId === "dev") return true;
    if (isMember === true) return true;
    if (isSubscribedLocally(userId)) return true;
    setLoading(true);
    try {
      const res = await bridge.send("VKWebAppCallAPIMethod", {
        method: "groups.isMember",
        params: { group_id: GROUP_SCREEN_NAME, user_id: userId, v: "5.131" },
      }) as Record<string, unknown>;
      const member = Boolean(res.response);
      setIsMember(member);
      if (member) markSubscribedLocally(userId);
      return member;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  }, [userId, isMember]);

  const join = useCallback(async (): Promise<boolean> => {
    try {
      const groupId = await getGroupId();
      if (!groupId) return false;
      await bridge.send("VKWebAppJoinGroup", { group_id: groupId });
      markSubscribedLocally(userId);
      setIsMember(true);
      return true;
    } catch {
      return false;
    }
  }, [userId]);

  const markJoined = useCallback(() => {
    markSubscribedLocally(userId);
    setIsMember(true);
  }, [userId]);

  return { isMember, loading, check, join, setIsMember: markJoined };
}