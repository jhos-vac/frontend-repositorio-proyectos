import { useEffect, useRef, useState } from "react"
import { useNavigate, useSearchParams, useLocation } from "react-router-dom"
import { CalendarDays, Menu, Plus, Search } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/store/authStore"
import { usePeriodStore } from "@/store/periodStore"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { useIsStudent } from "@/lib/useRole"

type Period = { id: string; name: string }

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const navigate = useNavigate()
  const location = useLocation()
  const [params] = useSearchParams()
  const user = useAuthStore((s) => s.user)
  const { period, setPeriod } = usePeriodStore()
  const [periods, setPeriods] = useState<Period[]>([])
  const [query, setQuery] = useState(params.get("q") || "")
  const inputRef = useRef<HTMLInputElement>(null)

  const roleName = user?.role?.name
  const isStudent = useIsStudent()
  const canCreate = !!roleName // estudiantes también registran proyectos (quedan pendientes de revisión)

  useEffect(() => {
    api.get("/api/period").then((res) => setPeriods(res.data || [])).catch(() => setPeriods([]))
  }, [])

  // Atajo Ctrl/Cmd + K para enfocar la búsqueda
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault()
        inputRef.current?.focus()
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    const base = isStudent ? "/ciclos-pasados" : "/projects"
    navigate(q ? `${base}?q=${encodeURIComponent(q)}` : base)
  }

  return (
    <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur md:px-8">
      <button
        onClick={onOpenMenu}
        className="rounded-md p-2 text-slate-600 hover:bg-slate-100 md:hidden"
        aria-label="Abrir menú"
      >
        <Menu className="size-5" />
      </button>

      <form onSubmit={submit} className="relative flex-1 max-w-xl">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={isStudent ? "Buscar en ciclos pasados…" : "Buscar proyectos, tecnologías…"}
          aria-label="Buscar proyectos"
          className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-14 text-sm outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20"
        />
        <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] text-slate-500 sm:block">
          Ctrl K
        </kbd>
      </form>

      <div className="ml-auto flex items-center gap-2">
        {!isStudent && <label className="relative hidden sm:block">
          <CalendarDays className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            aria-label="Período académico"
            className="h-10 appearance-none rounded-lg border border-slate-200 bg-white pl-8 pr-8 text-sm text-slate-700 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20"
          >
            <option value="">Todos los períodos</option>
            {periods.map((p) => (
              <option key={p.id} value={p.name}>{p.name}</option>
            ))}
          </select>
        </label>}

        <ThemeToggle />

        {canCreate && (
          <Button
            onClick={() => navigate("/projects?nuevo=1", { state: { at: location.key } })}
            className="h-10 gap-1.5"
          >
            <Plus className="size-4" />
            <span className="hidden sm:inline">Registrar proyecto</span>
          </Button>
        )}
      </div>
    </header>
  )
}
