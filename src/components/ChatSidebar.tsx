import { useEffect, useRef, useState } from "react";

type Session = {
  id: string;
  title: string | null;
  created_at: string;
};

type ChatSidebarProps = {
  sessions: Session[];
  activeSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewSession: () => void;
  onRenameSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
};

export default function ChatSidebar({
  sessions,
  activeSessionId,
  onSelectSession,
  onNewSession,
  onRenameSession,
  onDeleteSession,
}: ChatSidebarProps) {
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!openMenuId) return;
      const target = event.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openMenuId]);

  return (
    <aside className="sticky top-0 z-50 flex h-screen w-72 flex-col gap-4 rounded-r-[24px] bg-[#f3f2f5] p-6">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white">
          <span className="material-symbols-outlined">spa</span>
        </div>
        <div>
          <h2 className="font-headline text-xl text-[#4f17ce]">Peaceful Mind</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-500">
            Deep Breath Mode
          </p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onNewSession}
          className="mb-2 w-full rounded-full bg-primary py-4 text-sm font-semibold text-white shadow-sm transition-transform active:scale-95"
        >
          Nueva meditación
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-sm text-on-surface-variant">Sin sesiones aún.</p>
        ) : (
          sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={
                  "mb-2 rounded-xl px-3 py-3 text-sm transition-colors " +
                  (active
                    ? "bg-white text-primary shadow-sm"
                    : "text-slate-600 hover:bg-white/60")
                }
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectSession(session.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate font-medium">
                      {session.title?.trim() || "Meditación personalizada"}
                    </p>
                    <p className="mt-1 text-xs opacity-80">
                      {new Date(session.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </button>
                  <div className="relative" ref={openMenuId === session.id ? menuRef : null}>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-slate-100"
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === session.id ? null : session.id))
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                    </button>
                    {openMenuId === session.id && (
                      <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-slate-100"
                          onClick={() => {
                            setOpenMenuId(null);
                            onRenameSession(session.id);
                          }}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50"
                          onClick={() => {
                            setOpenMenuId(null);
                            onDeleteSession(session.id);
                          }}
                        >
                          Eliminar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
