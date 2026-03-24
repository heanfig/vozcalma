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
    <aside className="sticky top-0 z-50 flex h-screen w-72 shrink-0 flex-col gap-4 rounded-r-[24px] border-r border-slate-200/80 bg-[#ecebf0] p-6 dark:border-white/[0.07] dark:bg-[#12141a]">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-container text-white shadow-sm dark:bg-[#5b3ddb] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.06)]">
          <span className="material-symbols-outlined">spa</span>
        </div>
        <div>
          <h2 className="font-headline text-xl text-[#4f17ce] dark:text-[#c4b5fd]">VozCalma</h2>
          <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-slate-400">
            Modo calma
          </p>
        </div>
      </div>
      <div>
        <button
          type="button"
          onClick={onNewSession}
          className="mb-2 w-full rounded-full bg-primary py-4 text-sm font-semibold text-white shadow-md transition-transform active:scale-95 dark:shadow-[0_4px_14px_rgba(79,23,206,0.35)]"
        >
          Nueva meditación
        </button>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/80 dark:[&::-webkit-scrollbar-thumb]:bg-white/15">
        {sessions.length === 0 ? (
          <p className="px-2 py-4 text-sm text-slate-600 dark:text-slate-400">Sin sesiones aún.</p>
        ) : (
          sessions.map((session) => {
            const active = session.id === activeSessionId;
            return (
              <div
                key={session.id}
                className={
                  "mb-2 rounded-xl px-3 py-3 text-sm transition-colors " +
                  (active
                    ? "bg-white text-primary shadow-sm ring-1 ring-black/[0.04] dark:bg-[#1c1f28] dark:text-[#d4c4ff] dark:shadow-none dark:ring-1 dark:ring-white/[0.08]"
                    : "text-slate-700 hover:bg-white/70 dark:text-slate-300 dark:hover:bg-white/[0.06]")
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
                    <p className="mt-1 text-xs opacity-80 dark:opacity-70">
                      {new Date(session.created_at).toLocaleDateString("es-ES", {
                        day: "2-digit",
                        month: "short",
                      })}
                    </p>
                  </button>
                  <div className="relative" ref={openMenuId === session.id ? menuRef : null}>
                    <button
                      type="button"
                      className="cursor-pointer rounded-md p-1 text-slate-500 hover:bg-black/[0.05] dark:text-slate-400 dark:hover:bg-white/[0.08]"
                      onClick={() =>
                        setOpenMenuId((prev) => (prev === session.id ? null : session.id))
                      }
                    >
                      <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                    </button>
                    {openMenuId === session.id && (
                      <div className="absolute right-0 z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-white/[0.1] dark:bg-[#1c1f28] dark:shadow-xl">
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-xs hover:bg-slate-100 dark:hover:bg-white/[0.08]"
                          onClick={() => {
                            setOpenMenuId(null);
                            onRenameSession(session.id);
                          }}
                        >
                          Renombrar
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-md px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10"
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
