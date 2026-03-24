import { useEffect, useRef, useState } from "react";
import ChatSidebar from "./ChatSidebar";
import MeditationPlayer from "./MeditationPlayer";

type Msg = { id: string; role: "user" | "assistant"; content: string };
type Session = { id: string; title: string | null; created_at: string };
type LibraryItem = { sessionId: string; title: string; createdAt: string; preview: string };
type UiStep = "emotion" | "context" | "bodySignals" | "desiredState" | "completed";

function msg(role: "user" | "assistant", content: string): Msg {
  return { id: crypto.randomUUID(), role, content };
}

function clerkFirstName(): string {
  const user = (window as { Clerk?: { user?: { firstName?: string; fullName?: string } } })
    .Clerk?.user;
  const reject = (s: string) => /^usuario$/i.test(s.trim());
  if (user?.firstName?.trim()) {
    const n = user.firstName.trim();
    if (!reject(n)) return n;
  }
  const full = user?.fullName?.trim();
  if (full) {
    const first = full.split(/\s+/)[0] || "";
    if (first && !reject(first)) return first;
  }
  return "";
}

export default function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [activeTab, setActiveTab] = useState<"session" | "library">("session");
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [nowPlayingTitle, setNowPlayingTitle] = useState("Tu meditación");
  const [scriptReady, setScriptReady] = useState(false);
  const [uiStep, setUiStep] = useState<UiStep>("emotion");
  const [quickOptions, setQuickOptions] = useState<string[]>([]);
  const [audioStatus, setAudioStatus] = useState<"idle" | "generating" | "ready" | "error">(
    "idle",
  );
  const [profileImageUrl, setProfileImageUrl] = useState<string>("");
  const [displayName, setDisplayName] = useState<string>("");
  const [renameDialog, setRenameDialog] = useState<{
    open: boolean;
    sessionId: string | null;
    value: string;
  }>({ open: false, sessionId: null, value: "" });
  const [welcome, setWelcome] = useState("");
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [stickyPlayerDismissed, setStickyPlayerDismissed] = useState(false);
  const listEndRef = useRef<HTMLDivElement | null>(null);
  const chatAudioRef = useRef<HTMLAudioElement | null>(null);
  const generatedAudioForSession = useRef<Set<string>>(new Set());
  const audioGenerationToken = useRef(0);

  const hasMessages = messages.length > 0;
  const canSend = !!input.trim() && !loading;
  const greetingBase = displayName
    ? `Hola ${displayName}, estoy aquí contigo con mucho cariño. Vamos a crear juntos una meditación amorosa y profundamente personalizada para acompañarte hoy.`
    : `Hola, estoy aquí contigo con mucho cariño. Vamos a crear juntos una meditación amorosa y profundamente personalizada para acompañarte hoy.`;

  useEffect(() => {
    void loadSessions();
    void loadLibrary();
    const tick = () => {
      const user = (window as { Clerk?: { user?: { imageUrl?: string } } }).Clerk?.user;
      const img = user?.imageUrl || "";
      if (img) setProfileImageUrl(img);
      setDisplayName(clerkFirstName());
    };
    tick();
    const timer = window.setInterval(tick, 300);
    const stop = window.setTimeout(() => window.clearInterval(timer), 5000);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(stop);
    };
  }, []);

  useEffect(() => {
    if (hasMessages) return;
    setWelcome("");
    let idx = 0;
    const timer = setInterval(() => {
      idx += 2;
      setWelcome(greetingBase.slice(0, idx));
      if (idx >= greetingBase.length) clearInterval(timer);
    }, 12);
    return () => clearInterval(timer);
  }, [hasMessages, greetingBase]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, loading, audioStatus, activeTab]);

  useEffect(() => {
    if (!sessionId || !scriptReady || generatedAudioForSession.current.has(sessionId)) return;
    generatedAudioForSession.current.add(sessionId);
    void generateAudio(sessionId);
  }, [sessionId, scriptReady]);

  async function loadSessions() {
    const r = await fetch("/api/sessions");
    if (!r.ok) return;
    const j = (await r.json()) as { sessions?: Session[] };
    const nextSessions = j.sessions || [];
    setSessions(nextSessions);
    if (!sessionId && nextSessions.length > 0) await loadSession(nextSessions[0].id);
  }

  async function loadLibrary() {
    const r = await fetch("/api/library");
    if (!r.ok) return;
    const j = (await r.json()) as { items?: LibraryItem[] };
    setLibrary(j.items || []);
  }

  async function loadSession(targetSessionId: string) {
    audioGenerationToken.current += 1;
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAudioStatus("idle");
    setAudioPlaying(false);
    setLoading(true);
    try {
      const r = await fetch(`/api/sessions/${targetSessionId}`);
      const j = (await r.json()) as {
        error?: string;
        sessionId?: string;
        messages?: Array<{ id: string; role: "user" | "assistant"; content: string }>;
        scriptReady?: boolean;
        uiStep?: UiStep;
        quickOptions?: string[];
      };
      if (!r.ok) throw new Error(j.error || "Error");
      const sid = j.sessionId || targetSessionId;
      if (j.scriptReady) {
        generatedAudioForSession.current.add(sid);
      }
      setSessionId(sid);
      setMessages((j.messages || []).map((m) => ({ id: m.id, role: m.role, content: m.content })));
      setScriptReady(!!j.scriptReady);
      setUiStep(j.uiStep || "emotion");
      setQuickOptions(j.quickOptions || []);
      setAudioStatus("idle");
      setActiveTab("session");
    } catch {
      setMessages([msg("assistant", "No se pudo cargar la sesión.")]);
    } finally {
      setLoading(false);
    }
  }

  async function renameSession(id: string) {
    const current = sessions.find((s) => s.id === id)?.title || "Meditación personalizada";
    setRenameDialog({ open: true, sessionId: id, value: current });
  }

  async function submitRenameDialog() {
    const id = renameDialog.sessionId;
    const next = renameDialog.value.trim();
    if (!id || !next) {
      setRenameDialog({ open: false, sessionId: null, value: "" });
      return;
    }
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: next }),
    });
    setRenameDialog({ open: false, sessionId: null, value: "" });
    await loadSessions();
    await loadLibrary();
  }

  async function deleteSession(id: string) {
    const ok = window.confirm("¿Eliminar esta sesión?");
    if (!ok) return;
    await fetch(`/api/sessions/${id}`, { method: "DELETE" });
    if (sessionId === id) {
      audioGenerationToken.current += 1;
      setSessionId(null);
      setMessages([]);
      setScriptReady(false);
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    }
    await loadSessions();
    await loadLibrary();
  }

  function startNewSession() {
    audioGenerationToken.current += 1;
    setAudioUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSessionId(null);
    setMessages([]);
    setInput("");
    setScriptReady(false);
    setUiStep("emotion");
    setQuickOptions([]);
    setAudioStatus("idle");
    setStickyPlayerDismissed(false);
    setActiveTab("session");
  }

  async function send(explicitText?: string) {
    const t = (explicitText ?? input).trim();
    if (!t || loading || activeTab !== "session") return;
    const nameForApi = displayName || clerkFirstName();
    setInput("");
    setMessages((m) => [...m, msg("user", t)]);
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: t, displayName: nameForApi }),
      });
      const j = (await r.json()) as {
        error?: string;
        sessionId?: string;
        message?: string;
        scriptReady?: boolean;
        scriptText?: string;
        uiStep?: UiStep;
        quickOptions?: string[];
      };
      if (!r.ok) throw new Error(j.error || "Error");
      if (j.sessionId) {
        setSessionId(j.sessionId);
        setSessions((prev) => {
          const existing = prev.find((s) => s.id === j.sessionId);
          if (existing) return prev;
          return [
            {
              id: j.sessionId,
              title: "Meditación personalizada",
              created_at: new Date().toISOString(),
            },
            ...prev,
          ];
        });
      }
      if (j.message) {
        await streamAssistant(j.message);
        setScriptReady(!!j.scriptReady);
        setUiStep(j.uiStep || "completed");
        setQuickOptions(j.quickOptions || []);
      }
      if (j.scriptReady && j.scriptText) {
        const sid = j.sessionId || sessionId;
        if (sid) generatedAudioForSession.current.add(sid);
        setNowPlayingTitle("Tu meditación");
        void generateAudio(sid, j.scriptText);
        void loadLibrary();
      }
    } catch {
      setMessages((m) => [
        ...m,
        msg("assistant", "No pude responder en este momento. Probemos de nuevo con calma."),
      ]);
    } finally {
      setLoading(false);
    }
  }

  function quickSend(option: string) {
    if (loading) return;
    void send(option);
  }

  async function streamAssistant(fullText: string) {
    const id = crypto.randomUUID();
    setMessages((prev) => [...prev, { id, role: "assistant", content: "" }]);
    let idx = 0;
    while (idx < fullText.length) {
      idx += 2;
      const chunk = fullText.slice(0, idx);
      setMessages((prev) => prev.map((m) => (m.id === id ? { ...m, content: chunk } : m)));
      // eslint-disable-next-line no-await-in-loop
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
  }

  async function generateAudio(
    targetSessionId: string | null,
    inlineText?: string,
    opts?: { playAfterLoad?: boolean },
  ) {
    if (!targetSessionId && !inlineText) return;
    const token = ++audioGenerationToken.current;
    const nameForTts = displayName || clerkFirstName();
    setAudioStatus("generating");
    setStickyPlayerDismissed(false);
    try {
      const r = await fetch("/api/meditation/audio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          inlineText
            ? {
                sessionId: targetSessionId || undefined,
                text: inlineText,
                displayName: nameForTts || undefined,
              }
            : { sessionId: targetSessionId, displayName: nameForTts || undefined },
        ),
      });
      if (!r.ok) {
        const err = await r.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || "TTS");
      }
      const blob = await r.blob();
      if (token !== audioGenerationToken.current) return;
      setAudioUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(blob);
      });
      setAudioStatus("ready");
      if (opts?.playAfterLoad && token === audioGenerationToken.current) {
        queueMicrotask(() => {
          void chatAudioRef.current?.play().catch(() => {});
        });
      }
    } catch {
      if (token === audioGenerationToken.current) setAudioStatus("error");
    }
  }

  async function playFromLibrary(item: LibraryItem) {
    setNowPlayingTitle(item.title);
    setActiveTab("session");
    await loadSession(item.sessionId);
    await generateAudio(item.sessionId, undefined, { playAfterLoad: true });
  }

  return (
    <div className="flex min-h-screen bg-[#faf9fb] text-[#1b1c1e]">
      <div className="hidden h-screen w-72 shrink-0 md:flex">
        <ChatSidebar
          sessions={sessions}
          activeSessionId={sessionId}
          onSelectSession={(id) => void loadSession(id)}
          onNewSession={startNewSession}
          onRenameSession={(id) => void renameSession(id)}
          onDeleteSession={(id) => void deleteSession(id)}
        />
      </div>
      <main className="relative flex h-screen min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-40 flex items-center justify-between bg-[#faf9fb] px-6 py-4 md:px-8">
          <h1 className="font-headline text-2xl italic text-[#4f17ce]">Calma</h1>
          <div className="flex items-center gap-6">
            <nav className="hidden gap-8 md:flex">
              <button
                type="button"
                className={
                  activeTab === "session"
                    ? "text-sm font-bold text-[#4f17ce]"
                    : "text-sm text-slate-500"
                }
                onClick={() => setActiveTab("session")}
              >
                Sesión
              </button>
              <button
                type="button"
                className={
                  activeTab === "library"
                    ? "text-sm font-bold text-[#4f17ce]"
                    : "text-sm text-slate-500"
                }
                onClick={() => void loadLibrary().then(() => setActiveTab("library"))}
              >
                Biblioteca
              </button>
              <a href="/#precios" className="text-sm text-slate-500 hover:text-[#4f17ce]">
                Precios
              </a>
              <a href="/blog" className="text-sm text-slate-500 hover:text-[#4f17ce]">
                Blog
              </a>
            </nav>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-[#f3f2f5]"
              >
                <span className="material-symbols-outlined text-[20px]">settings</span>
              </button>
              <button
                type="button"
                className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-[#f3f2f5]"
              >
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Perfil" className="h-8 w-8 rounded-full object-cover" />
                ) : (
                  <span className="material-symbols-outlined text-[20px]">account_circle</span>
                )}
              </button>
            </div>
          </div>
        </header>

        {activeTab === "library" ? (
          <section className="flex-1 overflow-y-auto px-6 py-8 md:px-12">
            <div className="mx-auto max-w-4xl">
              <h2 className="mb-5 font-headline text-2xl text-[#4f17ce]">Biblioteca de audios</h2>
              {library.length === 0 ? (
                <p className="text-slate-500">Aún no tienes audios guardados.</p>
              ) : (
                <div className="grid gap-3">
                  {library.map((item) => (
                    <div key={item.sessionId} className="rounded-2xl bg-white p-4 shadow-sm">
                      <div className="flex items-center justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-on-surface">{item.title}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {new Date(item.createdAt).toLocaleString("es-ES")}
                          </p>
                          <p className="mt-2 line-clamp-2 text-sm text-slate-600">{item.preview}</p>
                        </div>
                        <button
                          type="button"
                          className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-white"
                          onClick={() => void playFromLibrary(item)}
                        >
                          Escuchar
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        ) : (
          <>
            <section className="flex-1 overflow-y-auto px-6 py-8 md:px-12 md:py-8">
              <div className="mb-6 flex justify-center">
                <span className="rounded-full bg-surface-container-low px-4 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Hoy
                </span>
              </div>
              {!hasMessages && (
                <div className="mx-auto max-w-2xl space-y-4">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                      <span className="material-symbols-outlined text-[18px] text-primary">
                        auto_awesome
                      </span>
                    </div>
                    <div className="rounded-2xl rounded-tl-none bg-surface-container-high p-5 shadow-sm">
                      <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
                        {welcome}
                      </p>
                    </div>
                  </div>
                  {uiStep === "emotion" && (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                      {["Ansiedad", "Estrés", "Cansancio"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className="rounded-xl border border-outline-variant/25 bg-white px-3 py-3 text-left text-sm hover:bg-primary-fixed"
                          onClick={() => quickSend(option)}
                        >
                          <p className="text-xs text-on-surface-variant">¿Cómo te sientes?</p>
                          <p className="mt-1 font-medium text-on-surface">{option}</p>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mx-auto max-w-2xl space-y-6">
                {messages.map((m) =>
                  m.role === "assistant" ? (
                    <div key={m.id} className="flex max-w-2xl gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-fixed">
                        <span className="material-symbols-outlined text-[18px] text-primary">
                          auto_awesome
                        </span>
                      </div>
                      <div className="rounded-2xl rounded-tl-none bg-surface-container-high p-5 shadow-sm">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div key={m.id} className="ml-auto flex max-w-2xl flex-row-reverse gap-4">
                      <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container-highest">
                        {profileImageUrl ? (
                          <img
                            src={profileImageUrl}
                            alt={displayName ? `Foto de ${displayName}` : "Tu perfil"}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        ) : (
                          <span className="material-symbols-outlined text-[18px] text-slate-500">
                            account_circle
                          </span>
                        )}
                      </div>
                      <div className="rounded-2xl rounded-tr-none bg-primary-container p-5 text-white shadow-sm">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed md:text-base">
                          {m.content}
                        </p>
                      </div>
                    </div>
                  ),
                )}
                {loading && <p className="animate-pulse text-sm text-tertiary">Escribiendo…</p>}
                <div ref={listEndRef} />
              </div>
            </section>
            <footer className="bg-transparent p-6 md:px-12 md:pb-10">
              <div className="mx-auto flex max-w-4xl flex-col gap-3">
                {audioStatus === "generating" && loading === false && (
                  <p className="mb-2 text-xs text-tertiary">
                    Preparando tu meditación y generando audio…
                  </p>
                )}
                {audioStatus === "error" && (
                  <p className="mb-2 text-xs text-error">
                    No se pudo generar el audio. Probá de nuevo desde Biblioteca o enviando otro
                    mensaje.
                  </p>
                )}
                {quickOptions.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {quickOptions.map((option) => (
                      <button
                        key={option}
                        type="button"
                        className="shrink-0 rounded-full border border-outline-variant/20 bg-white px-4 py-2 text-xs font-medium hover:bg-primary-fixed"
                        onClick={() => quickSend(option)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                )}
                <div className="relative flex items-center">
                  <textarea
                    className="min-h-[3.4rem] max-h-32 w-full resize-none rounded-[20px] border-none bg-surface-container-highest py-4 pl-6 pr-16 text-sm text-on-surface outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-primary-fixed"
                    placeholder="Cuéntame, ¿cómo te sientes en este momento?"
                    rows={1}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void send();
                      }
                    }}
                  />
                  <button
                    type="button"
                    className="absolute right-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-white transition-transform active:scale-95 disabled:opacity-50"
                    disabled={!canSend}
                    onClick={() => void send()}
                  >
                    <span className="material-symbols-outlined text-[20px]">send</span>
                  </button>
                </div>
                <p className="text-center text-[10px] font-medium text-slate-400">
                  VozCalma es una guía de acompañamiento, no reemplaza la terapia profesional.
                </p>
              </div>
            </footer>
          </>
        )}

        <MeditationPlayer
          audioUrl={audioUrl}
          title={nowPlayingTitle}
          audioRef={chatAudioRef}
          isPlaying={audioPlaying}
          onPlayingChange={setAudioPlaying}
          minimized={stickyPlayerDismissed}
          onMinimize={() => setStickyPlayerDismissed(true)}
          onExpand={() => setStickyPlayerDismissed(false)}
        />
      </main>

      {renameDialog.open && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 p-4"
          onClick={() => setRenameDialog({ open: false, sessionId: null, value: "" })}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-headline text-xl text-[#4f17ce]">Renombrar sesión</h3>
            <p className="mt-1 text-sm text-slate-500">
              Elige un nombre claro para identificar esta conversación.
            </p>
            <input
              className="mt-4 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-primary"
              value={renameDialog.value}
              onChange={(e) => setRenameDialog((prev) => ({ ...prev, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitRenameDialog();
              }}
            />
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-slate-100"
                onClick={() => setRenameDialog({ open: false, sessionId: null, value: "" })}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                onClick={() => void submitRenameDialog()}
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
