import { useEffect, useMemo, useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { FolderOpen, History, Loader2, Plus } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { MySummary } from "@/components/projects/MySummary"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { normalizeStatus } from "@/lib/status"
import { cn } from "@/lib/utils"
import type { Paged, ProjectRow } from "@/lib/types"

type Filter = "all" | "pending" | "approved" | "rejected" | "completed"

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "approved", label: "Aceptados" },
  { key: "completed", label: "Terminados" },
  { key: "pending", label: "Pendientes" },
  { key: "rejected", label: "Rechazados" },
]

/** Todos los proyectos del estudiante, sin importar el ciclo (incluye los de períodos pasados). */
export default function MyProjects() {
  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<Filter>("all")
  const created = !!(useLocation().state as { created?: boolean } | null)?.created

  useEffect(() => {
    api
      .get<Paged<ProjectRow>>("/api/projects", { params: { mine: true, limit: 500 } })
      .then((r) => setProjects(r.data?.data ?? []))
      .catch(() => setProjects([]))
      .finally(() => setLoading(false))
  }, [])

  const shown = useMemo(
    () =>
      projects.filter((p) => {
        if (filter === "all") return true
        if (filter === "completed") return p.reviewStatus === "approved" && normalizeStatus(p.status) === "completado"
        return p.reviewStatus === filter
      }),
    [projects, filter]
  )

  // Agrupados por ciclo, en el orden en que llegan (más recientes primero)
  const groups = useMemo(() => {
    const map = new Map<string, ProjectRow[]>()
    shown.forEach((p) => {
      const k = p.academic_period || "Sin período"
      map.set(k, [...(map.get(k) ?? []), p])
    })
    return [...map.entries()]
  }, [shown])

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Mis proyectos</h1>
        <p className="mt-1 text-sm text-slate-500">Todos tus proyectos, de este ciclo y de ciclos anteriores.</p>
      </header>

      {created && (
        <div role="status" className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Proyecto enviado: quedará pendiente hasta que tu docente lo revise.
        </div>
      )}

      <MySummary onSelect={setFilter} />

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filtrar mis proyectos">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            role="tab"
            aria-selected={filter === f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm ring-1 ring-inset transition",
              filter === f.key
                ? "bg-brand-700 text-white ring-brand-700"
                : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 size-5 animate-spin text-brand-600" /> Cargando tus proyectos…
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={projects.length === 0 ? "Aún no tienes proyectos" : "No hay proyectos con este filtro"}
          description={
            projects.length === 0
              ? "Registra uno nuevo o busca uno de ciclos pasados para darle continuidad."
              : "Prueba con otro estado."
          }
          action={
            projects.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild><Link to="/projects?nuevo=1"><Plus className="size-4" /> Registrar proyecto</Link></Button>
                <Button asChild variant="outline"><Link to="/ciclos-pasados"><History className="size-4" /> Ver ciclos pasados</Link></Button>
              </div>
            ) : undefined
          }
        />
      ) : (
        groups.map(([period, list]) => (
          <section key={period}>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-700">{period}</h2>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {list.map((p) => <ProjectCard key={p.id} project={p} showReview />)}
            </div>
          </section>
        ))
      )}
    </div>
  )
}
