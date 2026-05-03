import { useEffect, useRef, useState } from "react";

interface SampleOption {
  slug: string;
  label: string;
  icon: string;
}

const DEFAULT_SAMPLES: SampleOption[] = [
  { slug: "calmar-la-mente", label: "Calmar la mente", icon: "psychology" },
  { slug: "sueno-y-descanso", label: "Sueño y descanso", icon: "bedtime" },
];

function fmtTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function track(event: string, props?: Record<string, unknown>) {
  const ph = (window as unknown as { posthog?: { capture: (e: string, p?: unknown) => void } })
    .posthog;
  if (ph && typeof ph.capture === "function") ph.capture(event, props);
}

export default function SamplePlayer() {
  const [activeSlug, setActiveSlug] = useState<string>(DEFAULT_SAMPLES[0].slug);
  const [playing, setPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const activeSample = DEFAULT_SAMPLES.find((s) => s.slug === activeSlug) ?? DEFAULT_SAMPLES[0];
  const src = `/api/meditations/sample/${activeSample.slug}`;

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    const onTime = () => setProgress(a.currentTime);
    const onLoaded = () => setDuration(a.duration || 0);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
      track("sample_completed", { slug: activeSample.slug });
    };
    const onErr = () => {
      setError("Aún no disponible. Vuelve pronto.");
      setPlaying(false);
    };
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnd);
    a.addEventListener("error", onErr);
    return () => {
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnd);
      a.removeEventListener("error", onErr);
    };
  }, [activeSample.slug]);

  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    setError(null);
    if (playing) {
      a.pause();
      setPlaying(false);
      track("sample_paused", { slug: activeSample.slug });
      return;
    }
    try {
      await a.play();
      setPlaying(true);
      track("sample_played", { slug: activeSample.slug });
    } catch {
      setError("No pudimos reproducir el audio. Revisa tu conexión.");
      setPlaying(false);
    }
  };

  const switchSample = (slug: string) => {
    if (slug === activeSlug) return;
    const a = audioRef.current;
    if (a) {
      a.pause();
      a.currentTime = 0;
    }
    setActiveSlug(slug);
    setPlaying(false);
    setProgress(0);
    setDuration(0);
    setError(null);
    track("sample_switched", { slug });
  };

  const pct = duration > 0 ? Math.min(100, (progress / duration) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto rounded-[2rem] bg-surface-container-low/80 backdrop-blur p-6 md:p-10 shadow-xl shadow-primary/5 border border-outline-variant/20">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-start gap-5">
        <button
          type="button"
          onClick={togglePlay}
          aria-label={playing ? "Pausar muestra" : "Reproducir muestra"}
          className="flex-shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-on-primary flex items-center justify-center shadow-lg shadow-primary/30 hover:opacity-90 active:scale-95 transition"
        >
          <span className="material-symbols-outlined text-3xl md:text-4xl">
            {playing ? "pause" : "play_arrow"}
          </span>
        </button>

        <div className="flex-1 min-w-0">
          <p className="font-label text-[11px] uppercase tracking-[0.25em] text-tertiary/80 mb-1">
            Muestra real · sin pagar
          </p>
          <h3 className="font-headline text-xl md:text-2xl text-on-surface italic leading-tight truncate">
            {activeSample.label}
          </h3>

          <div className="mt-3 h-1.5 w-full rounded-full bg-surface-container-highest overflow-hidden">
            <div
              className="h-full bg-primary transition-[width] duration-200"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px] font-label text-on-surface-variant/70 tabular-nums">
            <span>{fmtTime(progress)}</span>
            <span>{fmtTime(duration)}</span>
          </div>
        </div>
      </div>

      {error && (
        <p className="mt-4 text-sm text-on-surface-variant/80 font-body italic">
          {error}
        </p>
      )}

      <div className="mt-6 flex flex-wrap gap-2">
        {DEFAULT_SAMPLES.map((s) => {
          const active = s.slug === activeSlug;
          return (
            <button
              key={s.slug}
              type="button"
              onClick={() => switchSample(s.slug)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs md:text-sm font-label transition border ${
                active
                  ? "bg-primary text-on-primary border-primary shadow-sm"
                  : "bg-surface-container-lowest text-on-surface-variant border-outline-variant/40 hover:border-primary/40 hover:text-primary"
              }`}
            >
              <span className="material-symbols-outlined text-base">{s.icon}</span>
              {s.label}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-xs font-body text-on-surface-variant/60 italic leading-relaxed">
        Estas son dos muestras reales para que escuches el formato. Tu sesión
        personalizada incluirá tu nombre y será creada según tu situación específica.
      </p>
    </div>
  );
}
