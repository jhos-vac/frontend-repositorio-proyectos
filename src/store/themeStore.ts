import { create } from "zustand"

export type ThemeMode = "light" | "dark" | "system"
const KEY = "theme"

const systemPrefersDark = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches

/** Aplica la clase "dark" en <html> y el color de la barra del navegador. */
export function applyTheme(mode: ThemeMode) {
  const dark = mode === "dark" || (mode === "system" && systemPrefersDark())
  document.documentElement.classList.toggle("dark", dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", "#041517")
}

const read = (): ThemeMode => {
  try {
    const v = localStorage.getItem(KEY)
    if (v === "light" || v === "dark" || v === "system") return v
  } catch { /* almacenamiento no disponible */ }
  return "system"
}

interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
  toggle: () => void
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: read(),
  setMode: (mode) => {
    try { localStorage.setItem(KEY, mode) } catch { /* ignorar */ }
    applyTheme(mode)
    set({ mode })
  },
  // Alterna entre claro y oscuro según lo que se está viendo ahora
  toggle: () => {
    const isDark = document.documentElement.classList.contains("dark")
    get().setMode(isDark ? "light" : "dark")
  },
}))

// Si el modo es "system", seguir los cambios del sistema operativo
if (typeof window !== "undefined") {
  window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    if (useThemeStore.getState().mode === "system") applyTheme("system")
  })
}
