import { type ReactNode, useState } from "react";

const NAV: { href: string; label: string; icon: string }[] = [
  { href: "/admin", label: "Overview", icon: "dashboard" },
  { href: "/admin/sessions", label: "Sesiones", icon: "list_alt" },
  { href: "/admin/payments", label: "Pagos", icon: "payments" },
  { href: "/admin/costs", label: "Costos", icon: "request_quote" },
  { href: "/admin/coupons", label: "Cupones", icon: "local_offer" },
  { href: "/admin/referrals", label: "Referidos", icon: "share" },
];

export default function AdminShell({
  title,
  currentPath,
  children,
}: {
  title: string;
  currentPath: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  async function onLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.href = "/admin/login";
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <aside
        className={`${open ? "translate-x-0" : "-translate-x-full"} fixed inset-y-0 left-0 z-30 w-64 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-transform md:translate-x-0`}
      >
        <div className="h-16 flex items-center px-5 border-b border-slate-200 dark:border-slate-800">
          <span className="text-lg font-semibold">VozCalma Admin</span>
        </div>
        <nav className="p-3 space-y-1">
          {NAV.map((item) => {
            const active =
              currentPath === item.href ||
              (item.href !== "/admin" && currentPath.startsWith(item.href));
            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 font-medium"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">
                  {item.icon}
                </span>
                {item.label}
              </a>
            );
          })}
        </nav>
      </aside>

      <div className="md:pl-64">
        <header className="sticky top-0 z-20 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4 md:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="md:hidden rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Abrir menú"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="rounded-lg px-3 py-1.5 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Salir
          </button>
        </header>

        <main className="p-4 md:p-6 max-w-7xl">{children}</main>
      </div>

      {open && (
        <div
          className="md:hidden fixed inset-0 z-20 bg-black/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
}
