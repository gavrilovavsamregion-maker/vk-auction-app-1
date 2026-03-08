import { useState } from "react";
import bridge from "@vkontakte/vk-bridge";
import Icon from "@/components/ui/icon";

const GROUP_SCREEN_NAME = "joywood_store";
let cachedGroupId = 0;

async function joinGroup(): Promise<boolean> {
  try {
    if (!cachedGroupId) {
      const res = await bridge.send("VKWebAppCallAPIMethod", {
        method: "groups.getById",
        params: { group_id: GROUP_SCREEN_NAME, v: "5.131" },
      }) as Record<string, unknown>;
      const groups = res.response as Array<Record<string, unknown>>;
      cachedGroupId = Number(groups?.[0]?.id ?? 0);
    }
    if (cachedGroupId) {
      await bridge.send("VKWebAppJoinGroup", { group_id: cachedGroupId });
    }
    return true;
  } catch {
    return false;
  }
}

export function SubscribeModal({ onClose, onJoined }: { onClose: () => void; onJoined: () => void }) {
  const [joining, setJoining] = useState(false);
  const [joined, setJoined] = useState(false);

  async function handleJoin() {
    setJoining(true);
    await joinGroup();
    setJoined(true);
    setJoining(false);
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full max-w-[390px] bg-white rounded-t-2xl p-5 pb-10"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: "slideUp 0.25s ease-out" }}
      >
        <div className="w-10 h-1 bg-[#E0E0E0] rounded-full mx-auto mb-5" />

        {joined ? (
          <div className="text-center py-2">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}>
              <Icon name="CheckCircle" size={32} className="text-white" />
            </div>
            <p className="font-bold text-[18px] text-[#1C1C1E] mb-2">Вы подписаны!</p>
            <p className="text-sm text-[#767676] mb-5">Теперь вы можете участвовать в аукционах</p>
            <button
              onClick={onJoined}
              className="w-full text-white rounded-xl py-3.5 font-bold text-[16px]"
              style={{ background: "linear-gradient(135deg, #C9A84C, #E8C96B)" }}
            >
              Сделать ставку
            </button>
          </div>
        ) : (
          <>
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: "#EEF5FF" }}>
                <Icon name="Users" size={32} className="text-[#2787F5]" />
              </div>
              <p className="font-bold text-[20px] text-[#1C1C1E] mb-2" style={{ fontFamily: "'Cormorant Garamond', serif" }}>
                Только для подписчиков
              </p>
              <p className="text-[14px] text-[#767676] leading-relaxed">
                Ставки могут делать только подписчики сообщества{" "}
                <span className="font-semibold text-[#1C1C1E]">Joywood Store</span>.
                Это бесплатно и займёт секунду.
              </p>
            </div>

            <button
              onClick={handleJoin}
              disabled={joining}
              className="w-full text-white rounded-xl py-3.5 font-bold text-[16px] mb-3 flex items-center justify-center gap-2 active:opacity-80 transition-opacity disabled:opacity-60"
              style={{ background: "linear-gradient(135deg, #2787F5, #5BA4FF)" }}
            >
              {joining ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Подписываемся…
                </>
              ) : (
                <>
                  <Icon name="UserPlus" size={18} />
                  Подписаться на Joywood Store
                </>
              )}
            </button>
            <button onClick={onClose} className="w-full text-center text-sm text-[#B8A070] py-2">
              Не сейчас
            </button>
          </>
        )}
      </div>
    </div>
  );
}
