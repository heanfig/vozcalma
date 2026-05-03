/**
 * Widget flotante de música de fondo — burbuja en la esquina inferior derecha.
 *
 * Features:
 * - Autoplay con volumen bajo (0.15) + fallback a user gesture
 * - Play/pause + volume slider + skip track
 * - Persiste volume en localStorage
 * - Loop infinito por tracks aleatorios
 * - Se pausa cuando hay otro audio principal reproduciéndose (meditación)
 */
import { useCallback, useEffect, useRef, useState } from "react";

interface Track {
  name: string;
  url: string;
}

const STORAGE_KEY_VOLUME = "vc-bg-volume";
const STORAGE_KEY_MUTED = "vc-bg-muted";
const DEFAULT_VOLUME = 0.15;

export default function BackgroundMusicWidget() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [trackIndex, setTrackIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(() => {
    if (typeof localStorage === "undefined") return DEFAULT_VOLUME;
    const saved = localStorage.getItem(STORAGE_KEY_VOLUME);
    return saved ? parseFloat(saved) : DEFAULT_VOLUME;
  });
  const [expanded, setExpanded] = useState(false);
  const [ready, setReady] = useState(false);

  // Fetch tracks on mount
  useEffect(() => {
    fetch("/api/bg-tracks/list")
      .then((r) => r.json())
      .then((data: { tracks: Track[] }) => {
        if (data.tracks && data.tracks.length > 0) {
          // Shuffle tracks
          const shuffled = [...data.tracks].sort(() => Math.random() - 0.5);
          setTracks(shuffled);
          setReady(true);
        }
      })
      .catch(() => {});
  }, []);

  // Sync volume to audio element + localStorage
  useEffect(() => {
    const el = audioRef.current;
    if (el) el.volume = volume;
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(STORAGE_KEY_VOLUME, String(volume));
    }
  }, [volume]);

  // Autoplay attempt cuando los tracks están listos
  useEffect(() => {
    if (!ready || tracks.length === 0) return;
    const el = audioRef.current;
    if (!el) return;

    el.src = tracks[0].url;
    el.volume = volume;

    // Intentar autoplay (puede ser bloqueado por browser)
    el.play()
      .then(() => setPlaying(true))
      .catch(() => {
        // Autoplay blocked — esperar interacción del usuario
        const tryPlay = () => {
          el.play()
            .then(() => setPlaying(true))
            .catch(() => {});
          document.removeEventListener("click", tryPlay);
        };
        document.addEventListener("click", tryPlay, { once: true });
      });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Audio event handlers
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onEnded = () => {
      // Avanzar al siguiente track
      setTrackIndex((prev) => {
        const next = (prev + 1) % tracks.length;
        if (el && tracks[next]) {
          el.src = tracks[next].url;
          el.play().catch(() => {});
        }
        return next;
      });
    };
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);
    el.addEventListener("ended", onEnded);
    return () => {
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.removeEventListener("ended", onEnded);
    };
  }, [tracks]);

  // Pausar cuando hay otro audio principal (meditación) reproduciéndose
  useEffect(() => {
    const checkOtherAudio = () => {
      const allAudios = document.querySelectorAll("audio");
      allAudios.forEach((audio) => {
        if (audio === audioRef.current) return;
        audio.addEventListener("play", () => {
          audioRef.current?.pause();
        });
      });
    };
    // Check after mount + on mutations
    checkOtherAudio();
    const observer = new MutationObserver(checkOtherAudio);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const toggle = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      if (el.src) el.play().catch(() => {});
    }
  }, [playing]);

  const nextTrack = useCallback(() => {
    const el = audioRef.current;
    if (!el || tracks.length === 0) return;
    const next = (trackIndex + 1) % tracks.length;
    setTrackIndex(next);
    el.src = tracks[next].url;
    if (playing) el.play().catch(() => {});
  }, [trackIndex, tracks, playing]);

  const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  }, []);

  if (!ready || tracks.length === 0) return null;

  return (
    <>
      <audio ref={audioRef} preload="none" />
      <div className="fixed bottom-4 right-4 z-40">
        {expanded ? (
          <div className="bg-surface/95 backdrop-blur-xl rounded-3xl shadow-xl border border-outline-variant/15 p-4 w-64 space-y-3 transition-all">
            {/* Header */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-label uppercase tracking-widest text-on-surface-variant/60">
                Música de fondo
              </span>
              <button
                onClick={() => setExpanded(false)}
                className="text-on-surface-variant/50 hover:text-on-surface transition-colors"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={toggle}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary hover:opacity-90 transition-all shadow-md shadow-primary/20 shrink-0"
              >
                <span className="material-symbols-outlined text-xl">
                  {playing ? "pause" : "play_arrow"}
                </span>
              </button>
              <button
                onClick={nextTrack}
                className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
              >
                <span className="material-symbols-outlined text-xl">skip_next</span>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="flex-1 h-1 accent-primary cursor-pointer"
                aria-label="Volumen"
              />
            </div>
          </div>
        ) : (
          <button
            onClick={() => setExpanded(true)}
            className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-105 ${
              playing
                ? "bg-primary text-on-primary shadow-primary/30"
                : "bg-surface-container-high text-on-surface-variant shadow-outline-variant/20"
            }`}
            aria-label="Música de fondo"
          >
            <span className="material-symbols-outlined text-xl">
              {playing ? "music_note" : "music_off"}
            </span>
          </button>
        )}
      </div>
    </>
  );
}
