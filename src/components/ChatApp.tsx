import { useState } from "react";

type Msg = { id: string; role: "user" | "assistant"; content: string };

function msg(role: "user" | "assistant", content: string): Msg {
  return { id: crypto.randomUUID(), role, content };
}

export default function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [scriptReady, setScriptReady] = useState(false);

  async function send() {
    const t = input.trim();
    if (!t || loading) return;
    setInput("");
    setMessages((m) => [...m, msg("user", t)]);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: t }),
      });
      const j = (await r.json()) as {
        error?: string;
        sessionId?: string;
        message?: string;
        scriptReady?: boolean;
      };
      if (!r.ok) throw new Error(j.error || "Error");
      if (j.sessionId) setSessionId(j.sessionId);
      if (j.message) {
        setMessages((m) => [...m, msg("assistant", j.message)]);
        setScriptReady(!!j.scriptReady);
      }
    } catch {
      setMessages((m) => [
        ...m,
        msg(
          "assistant",
          "No se pudo obtener respuesta. Revisa la configuración del servidor.",
        ),
      ]);
    } finally {
      setLoading(false);
    }
  }

  async function playTTS() {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    if (!last) return;
    const text = last.content.split("---FIN_GUIÓN---")[0].trim();
    if (!text) return;
    setLoading(true);
    try {
      const r = await fetch("/api/meditation/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "TTS");
      }
      const blob = await r.blob();
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
    } catch {
      alert("No se pudo generar el audio.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-[70vh] flex-col rounded-3xl bg-surface-container-low/80 shadow-[0_10px_40px_rgba(27,28,30,0.06)]">
      <div className="flex-1 space-y-4 overflow-y-auto p-4 md:p-6">
        {messages.length === 0 && (
          <p className="font-headline text-on-surface-variant text-center text-sm md:text-base">
            ¿Cómo te sentís hoy? Contame en unas pocas palabras y te guío para armar tu
            meditación.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] rounded-2xl bg-primary-fixed px-4 py-3 text-on-surface shadow-sm"
                : "mr-auto max-w-[90%] rounded-2xl bg-surface-container-high px-4 py-3 text-on-surface shadow-sm"
            }
          >
            <p className="font-body whitespace-pre-wrap text-sm leading-relaxed md:text-base">
              {m.content}
            </p>
          </div>
        ))}
        {loading && (
          <p className="text-tertiary animate-pulse text-sm">…</p>
        )}
      </div>
      <div className="border-t border-outline-variant/10 p-4 md:p-6">
        {audioUrl && (
          <div className="glass-player mb-4 rounded-2xl p-4">
            <p className="font-headline text-on-surface mb-2 text-sm">Tu meditación</p>
            <audio className="w-full" controls src={audioUrl} />
          </div>
        )}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <textarea
            className="font-body focus:border-primary-fixed min-h-[3rem] flex-1 resize-none rounded-xl border-0 bg-surface-container-highest px-4 py-3 text-sm text-on-surface outline-none transition-colors focus:bg-primary-fixed md:min-h-[4rem]"
            placeholder="Escribí aquí…"
            rows={3}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <div className="flex shrink-0 flex-col gap-2 sm:w-44">
            <button
              type="button"
              className="font-body rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white transition-transform hover:scale-[0.98] disabled:opacity-50"
              disabled={loading || !input.trim()}
              onClick={() => void send()}
            >
              Enviar
            </button>
            <button
              type="button"
              className="font-body rounded-full border border-outline-variant bg-transparent px-4 py-3 text-sm font-medium text-on-surface transition-transform hover:scale-[0.98] disabled:opacity-50"
              disabled={loading || messages.length === 0}
              onClick={() => void playTTS()}
            >
              Generar audio
            </button>
          </div>
        </div>
        {scriptReady && (
          <p className="font-body mt-2 text-xs text-tertiary">
            Guion listo. Podés generar el audio cuando quieras.
          </p>
        )}
      </div>
    </div>
  );
}
