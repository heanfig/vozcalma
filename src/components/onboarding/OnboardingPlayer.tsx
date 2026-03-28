import { useRef, useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  audioUrl: string;
  userName: string;
  sessionTitle?: string;
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
}: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
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
  const title = sessionTitle || "Sesión personalizada";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 22 }}
      className="min-h-screen ethereal-bg text-on-surface flex flex-col items-center justify-between"
    >
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      <main className="max-w-screen-md mx-auto px-6 py-12 flex flex-col items-center justify-between min-h-screen w-full">
        {/* Header */}
        <header className="text-center mt-8 mb-12">
          <h1 className="font-headline text-[2.5rem] md:text-[3rem] leading-[1.1] text-on-surface mb-4">
            Tu santuario está listo
            {safeName ? (
              <>
                ,{" "}
                <span className="text-primary-container">{safeName}</span>
              </>
            ) : null}
          </h1>
          <p className="text-on-surface-variant font-body text-lg">
            {title}
          </p>
        </header>

        {/* Player area */}
        <section className="w-full flex flex-col items-center gap-12">
          {/* Orb visual */}
          <motion.div
            className="w-64 h-64 rounded-full overflow-hidden diffusion-shadow mb-4 bg-gradient-to-br from-primary-fixed via-surface to-tertiary-fixed flex items-center justify-center"
            animate={
              playing
                ? { scale: [1, 1.04, 1], opacity: [0.9, 1, 0.9] }
                : { scale: 1, opacity: 0.85 }
            }
            transition={
              playing
                ? { duration: 4, repeat: Infinity, ease: "easeInOut" }
                : { duration: 0.4 }
            }
          >
            <div className="w-24 h-24 rounded-full bg-white/60 backdrop-blur-sm" />
          </motion.div>

          {/* Controls */}
          <div className="glass-player diffusion-shadow rounded-[2rem] p-8 w-full max-w-lg border border-white/20">
            <div className="flex flex-col gap-8">
              {/* Progress */}
              <div className="w-full">
                <div
                  className="relative w-full h-1.5 bg-surface-container-highest rounded-full overflow-hidden cursor-pointer"
                  onClick={seek}
                >
                  <motion.div
                    className="absolute top-0 left-0 h-full bg-primary rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="flex justify-between mt-3 text-xs font-label text-on-surface-variant tracking-wider uppercase">
                  <span>{fmt(current)}</span>
                  <span>{fmt(duration)}</span>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-center gap-10">
                <button
                  onClick={() => skip(-10)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">
                    replay_10
                  </span>
                </button>
                <button
                  onClick={toggle}
                  className="w-20 h-20 bg-primary-container rounded-full flex items-center justify-center text-on-primary-container hover:scale-[0.98] transition-all diffusion-shadow"
                >
                  <span className="material-symbols-outlined text-5xl">
                    {playing ? "pause" : "play_arrow"}
                  </span>
                </button>
                <button
                  onClick={() => skip(30)}
                  className="text-on-surface-variant hover:text-primary transition-colors"
                >
                  <span className="material-symbols-outlined text-3xl">
                    forward_30
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Footer disclaimer */}
        <footer className="w-full text-center pb-8 opacity-60 mt-16">
          <p className="text-[0.65rem] font-body text-on-surface-variant max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
            Este contenido tiene fines informativos y no sustituye el consejo,
            diagnóstico o tratamiento médico profesional. VozCalma no es un
            servicio médico de emergencia.
          </p>
        </footer>
      </main>
    </motion.div>
  );
}
