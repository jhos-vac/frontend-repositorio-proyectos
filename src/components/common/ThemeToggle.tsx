import { Moon, Sun } from "lucide-react"
import { useThemeStore } from "@/store/themeStore"

/** Botón claro/oscuro. Los dos iconos se alternan con CSS para no depender del estado inicial. */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const toggle = useThemeStore((s) => s.toggle)
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Cambiar entre modo claro y oscuro"
      title="Cambiar tema"
      className={`inline-flex size-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 ${className}`}
    >
      <Moon className="size-4 dark:hidden" />
      <Sun className="hidden size-4 dark:block" />
    </button>
  )
}
