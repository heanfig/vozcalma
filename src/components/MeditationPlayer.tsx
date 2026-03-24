import { useCallback, useEffect, useState, type RefObject } from "react";

type Props = {
  audioUrl: string | null;
  title: string;
  audioRef: RefObject<HTMLAudioElement | null>;
  isPlaying: boolean;
  onPlayingChange: (v: boolean) => void;
  minimized: boolean;
  onMinimize: () => void;
  onExpand: () => void;
};

function formatTime(s: number) {
  if (!Number.isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

export default function MeditationPlayer({
  audioUrl,
  title,
  audioRef,
  isPlaying,
  onPlayingChange,
  minimized,
  onMinimize,
  onExpand,
}: Props) {
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  const syncTime = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(a.currentTime);
    setDuration(Number.isFinite(a.duration) ? a.duration : 0);
  }, [audioRef]);

  useEffect(() => {
    syncTime();
  }, [audioUrl, syncTime]);

  const togglePlay = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) void a.play().catch(() => {});
    else a.pause();
  };

  if (!audioUrl) return null;

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  const shell = minimized ? (
    <div className="fixed bottom-6 right-4 z-[55] md:bottom-8 md:right-8">
      <button
        type="button"
        onClick={onExpand}
        className="glass-player flex items-center gap-3 rounded-full py-2 pl-2 pr-5 shadow-2xl transition-transform active:scale-95"
        aria-label="Abrir reproductor de meditación"
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-primary-container text-white shadow-md">
          <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>
            {isPlaying ? "pause" : "play_arrow"}
          </span>
        </span>
        <span className="max-w-[140px] truncate font-headline text-sm font-semibold text-on-surface md:max-w-[200px]">
          {title}
        </span>
      </button>
    </div>
  ) : (
    <div className="fixed bottom-6 left-4 right-4 z-[55] md:left-auto md:right-8 md:w-[min(100%,24rem)]">
      <div className="glass-player flex flex-col gap-3 rounded-3xl p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={togglePlay}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary-container text-white shadow-md transition-transform active:scale-95"
            aria-label={isPlaying ? "Pausar" : "Reproducir"}
          >
            <span className="material-symbols-outlined text-[26px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {isPlaying ? "pause" : "play_arrow"}
            </span>
          </button>
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[10px] font-bold uppercase tracking-widest text-primary">Tu meditación</p>
            <p className="truncate font-headline text-sm font-semibold text-on-surface">{title}</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 hover:bg-white/60"
            aria-label="Minimizar reproductor"
            onClick={onMinimize}
          >
            <span className="material-symbols-outlined text-[20px]">expand_more</span>
          </button>
        </div>

        <div>
          <div
            className="relative h-1.5 w-full cursor-pointer rounded-full bg-surface-container-highest"
            onClick={(e) => {
              const a = audioRef.current;
              if (!a || !duration) return;
              const r = e.currentTarget.getBoundingClientRect();
              const x = e.clientX - r.left;
              a.currentTime = (x / r.width) * duration;
              syncTime();
            }}
            role="slider"
            tabIndex={0}
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={Math.round(duration)}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <audio
        ref={audioRef}
        className="hidden"
        src={audioUrl}
        onPlay={() => onPlayingChange(true)}
        onPause={() => onPlayingChange(false)}
        onEnded={() => onPlayingChange(false)}
        onTimeUpdate={syncTime}
        onLoadedMetadata={syncTime}
      />
      {shell}
    </>
  );
}
