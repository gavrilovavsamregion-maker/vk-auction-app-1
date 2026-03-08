import { useState, useEffect, useRef } from "react";
import Icon from "@/components/ui/icon";
import type { Lot } from "@/types/auction";
import { getStatusLabel } from "@/components/auction/lotUtils";
import { TimerBadge } from "@/components/auction/LotCard";

function VideoPlayer({ src, poster, onEnded }: { src: string; poster?: string; onEnded?: () => void }) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black">
        <img src={poster} alt="" className="absolute inset-0 w-full h-full object-cover opacity-40" />
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="relative z-10 flex items-center gap-2 bg-white/90 rounded-xl px-4 py-3 font-semibold text-[14px] text-[#1C1A16]"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3"/></svg>
          Смотреть видео
        </a>
      </div>
    );
  }

  return (
    <video
      className="absolute inset-0 w-full h-full bg-black"
      controls
      autoPlay
      playsInline
      preload="metadata"
      poster={poster}
      onEnded={onEnded}
      onError={() => setError(true)}
    >
      <source src={src} type="video/mp4" />
    </video>
  );
}

export function parseVKVideoEmbed(url: string): string | null {
  if (!url) return null;
  const iframeSrc = url.match(/src=["']([^"']+)["']/);
  if (iframeSrc) return iframeSrc[1];
  if (url.includes("video_ext.php") || url.includes("vkvideo.ru")) return url;
  const matchDirect = url.match(/vk\.com\/video(-?\d+_\d+)/);
  if (matchDirect) {
    return `https://vk.com/video_ext.php?oid=${matchDirect[1].split("_")[0]}&id=${matchDirect[1].split("_")[1]}&hd=2`;
  }
  const matchZ = url.match(/video(-?\d+_\d+)/);
  if (matchZ) {
    return `https://vk.com/video_ext.php?oid=${matchZ[1].split("_")[0]}&id=${matchZ[1].split("_")[1]}&hd=2`;
  }
  return null;
}

export function LotMedia({ lot, isActive, isUpcoming, onBack }: {
  lot: Lot;
  isActive: boolean;
  isUpcoming: boolean;
  onBack: () => void;
}) {
  const [videoKey, setVideoKey] = useState(0);
  const [videoPlaying, setVideoPlaying] = useState(false);
  const restartTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const status = getStatusLabel(lot);
  const vkEmbedUrl = lot.video ? parseVKVideoEmbed(lot.video) : null;
  const isS3Video = Boolean(lot.video && lot.video.startsWith("https://cdn.poehali.dev"));
  const hasVideo = !isUpcoming && Boolean(lot.video && (vkEmbedUrl || isS3Video));

  function handlePlay() { setVideoPlaying(true); }

  function startRestartTimer() {
    if (!lot.videoDuration || lot.videoDuration <= 0) return;
    if (restartTimerRef.current) clearTimeout(restartTimerRef.current);
    const restartAt = (lot.videoDuration - 3) * 1000;
    if (restartAt <= 0) return;
    restartTimerRef.current = setTimeout(() => {
      setVideoKey((k) => k + 1);
      setVideoPlaying(false);
    }, restartAt);
  }

  useEffect(() => {
    return () => { if (restartTimerRef.current) clearTimeout(restartTimerRef.current); };
  }, []);

  if (hasVideo) {
    return (
      <div className="relative shrink-0 bg-black">
        <button onClick={onBack} className="absolute top-3 left-3 z-10 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
          <Icon name="ChevronLeft" size={20} />
        </button>
        <div className="absolute top-3 right-3 z-10 flex gap-1.5">
          <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
          {isActive && <TimerBadge endsAt={lot.endsAt} />}
        </div>
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          {isS3Video ? (
            <VideoPlayer key={videoKey} src={lot.video!} poster={lot.image} onEnded={() => setVideoKey((k) => k + 1)} />

          ) : !videoPlaying ? (
            <div
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              style={{ background: "#000" }}
              onClick={handlePlay}
            >
              <img src={lot.image} alt={lot.title} className="absolute inset-0 w-full h-full object-cover opacity-60" />
              <div className="relative flex items-center justify-center">
                <span className="absolute w-16 h-16 rounded-full animate-ping opacity-20" style={{ background: "#C9A84C" }} />
                <div className="relative w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(201,168,76,0.9)", backdropFilter: "blur(4px)" }}>
                  <svg width="20" height="24" viewBox="0 0 20 24" fill="white"><path d="M2 1.5L18 12L2 22.5V1.5Z" /></svg>
                </div>
              </div>
            </div>
          ) : (
            <iframe
              key={videoKey}
              src={vkEmbedUrl! + "&autoplay=1"}
              className="absolute inset-0 w-full h-full"
              allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
              allowFullScreen
              frameBorder="0"
              onLoad={startRestartTimer}
            />
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="relative shrink-0">
      <img src={lot.image} alt={lot.title} className="w-full h-64 object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      <button onClick={onBack} className="absolute top-3 left-3 w-9 h-9 bg-white/90 backdrop-blur rounded-full flex items-center justify-center shadow-sm">
        <Icon name="ChevronLeft" size={20} />
      </button>
      <div className="absolute top-3 right-3 flex gap-1.5">
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${status.color}`}>{status.label}</span>
        {isActive && <TimerBadge endsAt={lot.endsAt} />}
      </div>
      {isUpcoming && lot.video && (
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 bg-black/50 backdrop-blur-sm rounded-lg px-2.5 py-1.5">
          <Icon name="Lock" size={12} className="text-white" />
          <span className="text-white text-[11px] font-medium">Видео откроется при старте</span>
        </div>
      )}
    </div>
  );
}