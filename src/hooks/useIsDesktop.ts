import { useState, useEffect } from "react";

function hasVKParams() {
  const p = new URLSearchParams(window.location.search);
  return p.has("vk_user_id") || p.has("vk_app_id") || p.has("vk_group_id");
}

export function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth >= 1024 && !hasVKParams();
  });

  useEffect(() => {
    if (hasVKParams()) return;
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  return isDesktop;
}
