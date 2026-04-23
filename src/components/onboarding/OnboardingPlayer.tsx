import { useRef, useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";

interface Props {
  audioUrl: string;
  userName: string;
  scriptText?: string;
  sessionTitle?: string;
  playUrl?: string;
}

function fmt(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export default function OnboardingPlayer({
  audioUrl,
  userName,
  sessionTitle,
  playUrl,
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(() => {
    if (!playUrl) return;
    navigator.clipboard.writeText(playUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [playUrl]);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play();
  }, [playing]);

  const seek = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = audioRef.current;
      if (!el || !duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      el.currentTime = pct * duration;
    },
    [duration],
  );

  const skip = useCallback(
    (delta: number) => {
      const el = audioRef.current;
      if (!el) return;
      el.currentTime = Math.max(0, Math.min(duration, el.currentTime + delta));
    },
    [duration],
  );

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTime = () => setCurrent(el.currentTime);
    const onMeta = () => setDuration(el.duration);
    const onEnd = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, []);

  const pct = duration > 0 ? (current / duration) * 100 : 0;
  const safeName = userName?.trim() || "";
  const title = sessionTitle || "Sesion personalizada";

  const waveBars = useMemo(
    () =>
      Array.from({ length: 28 }, (_, i) => ({
        idx: i,
        baseHeight: 22 + Math.sin(i * 0.9) * 12 + Math.random() * 18,
        delay: (i % 7) * 0.08,
      })),
    [],
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="min-h-screen ethereal-bg text-on-surface flex flex-col"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* ── Header ── */}
      <header className="text-center pt-12 pb-6 px-6">
        <motion.h1
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-headline text-3xl md:text-[2.75rem] leading-tight text-on-surface mb-2"
        >
          Tu sesion esta lista
          {safeName ? (
            <>, <span className="text-primary italic">{safeName}</span></>
          ) : null}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.7 }}
          transition={{ delay: 0.2 }}
          className="text-on-surface-variant font-body text-base"
        >
          {title}
        </motion.p>

        {playUrl && (
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            onClick={copyLink}
            className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-surface-container-low text-on-surface-variant text-sm font-label hover:bg-surface-container-high transition-colors"
          >
            <span className="material-symbols-outlined text-lg">
              {copied ? "check" : "link"}
            </span>
            <span>{copied ? "Enlace copiado" : "Copiar enlace para volver a escuchar"}</span>
          </motion.button>
        )}
      </header>

      {/* ── Visualizador de ondas ── */}
      <div className="flex-1 flex items-center justify-center px-6 pb-48">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="relative w-full max-w-lg"
        >
          {/* Halo de fondo */}
          <motion.div
            aria-hidden
            className="absolute inset-0 -z-10 rounded-full blur-3xl bg-gradient-to-br from-primary/20 via-tertiary-fixed/20 to-primary-fixed/20"
            animate={
              playing
                ? { scale: [1, 1.08, 1], opacity: [0.55, 0.85, 0.55] }
                : { scale: 1, opacity: 0.4 }
            }
            transition={
              playing
                ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.6 }
            }
          />

          <div className="relative bg-white/55 backdrop-blur-xl rounded-[2.5rem] px-8 py-12 border border-white/60 shadow-xl">
            <div className="flex items-center gap-2 justify-center mb-8 text-primary/50">
              <span className="material-symbols-outlined text-lg">graphic_eq</span>
              <span className="text-xs font-label uppercase tracking-[0.25em]">
                Tu meditacion
              </span>
            </div>

            <div
              role="presentation"
              aria-hidden
              className="flex items-center justify-center gap-[5px] h-40"
            >
              {waveBars.map(({ idx, baseHeight, delay }) => (
                <motion.span
                  key={idx}
                  className="inline-block w-[5px] rounded-full bg-gradient-to-b from-primary via-primary/80 to-tertiary-fixed"
                  style={{ height: baseHeight }}
                  animate={
                    playing
                      ? {
                          scaleY: [0.45, 1.35, 0.55, 1.15, 0.45],
                          opacity: [0.65, 1, 0.75, 0.95, 0.65],
                        }
                      : { scaleY: 0.35, opacity: 0.45 }
                  }
                  transition={
                    playing
                      ? {
                          duration: 1.4 + (idx % 5) * 0.18,
                          repeat: Infinity,
                          ease: "easeInOut",
                          delay,
                        }
                      : { duration: 0.45 }
                  }
                />
              ))}
            </div>

            <motion.p
              className="text-center mt-8 text-sm font-body text-on-surface-variant/70"
              animate={{ opacity: playing ? 0.85 : 0.5 }}
              transition={{ duration: 0.4 }}
            >
              {playing
                ? "Respira y dejate llevar..."
                : "Presiona play cuando estes listo"}
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* ── Sticky Player Bar ── */}
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.4, type: "spring", stiffness: 200, damping: 24 }}
        className="fixed bottom-0 left-0 right-0 z-50"
      >
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl p-5 md:p-6 shadow-xl border border-white/50">
            {/* Progress bar */}
            <div
              className="relative w-full h-1.5 bg-surface-container-highest/50 rounded-full overflow-hidden cursor-pointer mb-4"
              onClick={seek}
            >
              <motion.div
                className="absolute top-0 left-0 h-full bg-primary rounded-full"
                style={{ width: `${pct}%` }}
              />
            </div>

            <div className="flex items-center justify-between">
              {/* Time left */}
              <span className="text-xs font-label text-on-surface-variant tabular-nums w-14">
                {fmt(current)}
              </span>

              {/* Controls */}
              <div className="flex items-center gap-6">
                <button
                  onClick={() => skip(-10)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Retroceder 10 segundos"
                >
                  <span className="material-symbols-outlined text-2xl">replay_10</span>
                </button>
                <button
                  onClick={toggle}
                  className="w-14 h-14 bg-primary rounded-full flex items-center justify-center text-on-primary hover:scale-[0.97] active:scale-95 transition-all shadow-lg shadow-primary/20"
                  aria-label={playing ? "Pausar" : "Reproducir"}
                >
                  <span className="material-symbols-outlined text-3xl">
                    {playing ? "pause" : "play_arrow"}
                  </span>
                </button>
                <button
                  onClick={() => skip(30)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                  aria-label="Adelantar 30 segundos"
                >
                  <span className="material-symbols-outlined text-2xl">forward_30</span>
                </button>
              </div>

              {/* Time right */}
              <span className="text-xs font-label text-on-surface-variant tabular-nums w-14 text-right">
                {fmt(duration)}
              </span>
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="text-center pb-3 px-6">
          <p className="text-[0.6rem] font-body text-on-surface-variant/40 max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
            Contenido informativo. No sustituye consejo medico profesional.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
