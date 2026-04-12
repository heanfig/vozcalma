/**
 * Theme management — dark mode con CSS variables.
 *
 * Persistencia: localStorage key "vc-theme" con valores "light" | "dark" | "system".
 * Aplicación: togglea class "dark" en <html> → las CSS vars cambian automáticamente
 * (definidas en src/styles/onboarding.css @layer base).
 *
 * Anti-flash: un script blocking inline en el <head> de cada página lee localStorage
 * ANTES del primer paint y aplica la clase. Ver el snippet en las páginas .astro.
 */

export type Theme = "light" | "dark" | "system";

export function getStoredTheme(): Theme {
  if (typeof localStorage === "undefined") return "system";
  return (localStorage.getItem("vc-theme") as Theme) || "system";
}

export function resolveTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    return typeof window !== "undefined" &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return theme;
}

export function applyTheme(theme: Theme): void {
  const resolved = resolveTheme(theme);
  document.documentElement.classList.toggle("dark", resolved === "dark");
  localStorage.setItem("vc-theme", theme);
}

export function cycleTheme(): Theme {
  const current = getStoredTheme();
  const next: Theme =
    current === "light" ? "dark" : current === "dark" ? "system" : "light";
  applyTheme(next);
  return next;
}

export function initTheme(): void {
  const saved = getStoredTheme();
  applyTheme(saved);

  // Escuchar cambios del sistema en tiempo real si el usuario está en "system"
  if (typeof window !== "undefined") {
    window
      .matchMedia("(prefers-color-scheme: dark)")
      .addEventListener("change", () => {
        if (getStoredTheme() === "system") {
          applyTheme("system");
        }
      });
  }
}
