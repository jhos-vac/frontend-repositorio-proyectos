import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { ChevronLeft, ChevronRight, History, Loader2, Search, X } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { cn } from "@/lib/utils"
import type { Paged, ProjectRow } from "@/lib/types"

type Tag = { id: string; name: string; count: number }
const PAGE_SIZE = 12

/**
 * Proyectos de ciclos pasados para ver si algo merece continuidad.
 * Se filtran por etiquetas (tecnologías) y por texto.
 */
export default function PastProjects() {
  const [params, setParams] = useSearchParams()
  const [tags, setTags] = useState<Tag[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [search, setSearch] = useState(params.get("q") || "")
  const [debounced, setDebounced] = useState(search)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<Paged<ProjectRow> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get<Tag[]>("/api/projects/past/tags").then((r) => setTags(r.data ?? [])).catch(() => setTags([]))
  }, [])

  // La búsqueda de la barra superior llega como ?q=
  useEffect(() => {
    const q = params.get("q") || ""
    setSearch(q)
  }, [params])

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => { setPage(1) }, [debounced, selected])

  useEffect(() => {
    setLoading(true)
    api
      .get<Paged<ProjectRow>>("/api/projects", {
        params: {
          pastPeriods: true,
          limit: PAGE_SIZE,
          page,
          search: debounced || undefined,
          skillIds: selected.length ? selected.join(",") : undefined,
        },
      })
      .then((r) => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [debounced, selected, page])

  const toggle = (id: string) =>
    setSelected((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]))

  const clear = () => {
    setSelected([])
    setSearch("")
    if (params.get("q")) setParams({}, { replace: true })
  }

  const projects = data?.data ?? []
  const total = data?.meta?.total ?? 0
  const hasFilters = selected.length > 0 || !!debounced

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Ciclos pasados</h1>
        <p className="mt-1 text-sm text-slate-500">
          Revisa lo que se hizo en ciclos anteriores y encuentra un proyecto al que puedas dar continuidad.
        </p>
      </header>

      <section className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar proyectos de ciclos pasados"
            className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm outline-none transition focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/20"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-slate-700">Etiquetas</p>
            {hasFilters && (
              <button onClick={clear} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                <X className="size-3.5" /> Limpiar filtros
              </button>
            )}
          </div>
          {tags.length === 0 ? (
            <p className="text-sm text-slate-500">Todavía no hay etiquetas en proyectos de ciclos pasados.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => {
                const on = selected.includes(t.id)
                return (
                  <button
                    key={t.id}
                    onClick={() => toggle(t.id)}
                    aria-pressed={on}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs ring-1 ring-inset transition",
                      on ? "bg-brand-700 text-white ring-brand-700" : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                    )}
                  >
                    {t.name} <span className={on ? "text-white/70" : "text-slate-400"}>{t.count}</span>
                  </button>
                )
              })}
            </div>
          )}
          {selected.length > 1 && (
            <p className="mt-2 text-xs text-slate-500">Se muestran los proyectos que tienen todas las etiquetas elegidas.</p>
          )}
        </div>
      </section>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500">
          <Loader2 className="mr-2 size-5 animate-spin text-brand-600" /> Buscando proyectos…
        </div>
      ) : projects.length === 0 ? (
        <EmptyState
          icon={History}
          title={hasFilters ? "Ningún proyecto coincide" : "Aún no hay proyectos de ciclos pasados"}
          description={hasFilters ? "Prueba quitando alguna etiqueta o cambiando la búsqueda." : "Cuando un ciclo termine, sus proyectos aprobados aparecerán aquí."}
        />
      ) : (
        <>
          <p className="text-sm text-slate-500">{total} {total === 1 ? "proyecto" : "proyectos"}</p>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((p) => <ProjectCard key={p.id} project={p} showAuthor highlightTags={selected} />)}
          </div>
          {(data?.meta?.totalPages ?? 1) > 1 && (
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" disabled={!data?.meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="size-4" /> Anterior
              </Button>
              <span className="text-sm text-slate-500">Página {page} de {data?.meta.totalPages}</span>
              <Button variant="outline" size="sm" disabled={!data?.meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>
                Siguiente <ChevronRight className="size-4" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
