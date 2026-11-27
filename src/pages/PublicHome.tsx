import { useEffect, useRef, useState } from "react"
import { Link } from "react-router-dom"
import { CheckCircle2, Loader2, LogIn, Search, SearchX } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/common/ThemeToggle"
import { useAuthStore } from "@/store/authStore"

type PublicProject = { id: string; name: string; description: string | null }
type Page = { data: PublicProject[]; total: number; page: number; lastPage: number }
const LIMIT = 12

/**
 * Página inicial pública: los proyectos finalizados del semillero, para que los
 * estudiantes los conozcan. Solo se ven el título y la descripción (sin estudiantes,
 * docentes ni documentos). No requiere iniciar sesión.
 */
export default function PublicHome() {
  const loggedIn = useAuthStore((s) => s.isLoggedIn) || !!localStorage.getItem("token")
  const [search, setSearch] = useState("")
  const [q, setQ] = useState("")
  const [page, setPage] = useState(1)
  const [res, setRes] = useState<Page | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const reqId = useRef(0)

  useEffect(() => { const t = setTimeout(() => { setQ(search.trim()); setPage(1) }, 350); return () => clearTimeout(t) }, [search])
  useEffect(() => {
    const id = ++reqId.current
    setLoading(true); setError(false)
    api.get<Page>("/api/public/projects", { params: { page, limit: LIMIT, ...(q ? { search: q } : {}) } })
      .then((r) => { if (id === reqId.current) setRes(r.data) })
      .catch(() => { if (id === reqId.current) setError(true) })
      .finally(() => { if (id === reqId.current) setLoading(false) })
  }, [q, page])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex min-w-0 items-center gap-3">
            <img src="/its.png" alt="Logo ITS" className="size-10 shrink-0 object-contain" />
            <span className="min-w-0 leading-tight">
              <span className="block truncate font-semibold text-slate-900">RepoDigital</span>
              <span className="block truncate text-xs text-slate-500">Semillero · ITS Sudamericano</span>
            </span>
          </Link>
          <div className="flex shrink-0 items-center gap-2">
            <ThemeToggle />
            <Button asChild size="sm" className="gap-1.5">
              <Link to={loggedIn ? "/dashboard" : "/login"}><LogIn className="size-4" /> {loggedIn ? "Ir al panel" : "Iniciar sesión"}</Link>
            </Button>
          </div>
        </div>
      </header>

      <section className="bg-brand-900 text-white">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <h1 className="max-w-2xl text-3xl font-semibold leading-tight sm:text-4xl">Proyectos finalizados del semillero</h1>
          <p className="mt-3 max-w-2xl text-sm text-brand-100 sm:text-base">
            Conoce los proyectos que ya terminaron otros estudiantes del instituto: te pueden inspirar o servir de base para continuar uno.
          </p>
          <div className="relative mt-6 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título o descripción"
              aria-label="Buscar proyectos"
              className="h-11 border-0 bg-white pl-9 text-slate-900"
            />
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        {loading && !res ? (
          <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
        ) : error ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No se pudieron cargar los proyectos. Intenta de nuevo en unos minutos.</p>
        ) : !res?.data.length ? (
          <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            <SearchX className="mb-3 size-8 text-slate-400" />
            <p className="font-medium text-slate-800">{q ? "No hay proyectos finalizados que coincidan" : "Aún no hay proyectos finalizados"}</p>
            {q && <p className="mt-1 text-sm text-slate-500">Prueba con otras palabras.</p>}
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-slate-500" aria-live="polite">
              {res.total} proyecto{res.total === 1 ? "" : "s"} finalizado{res.total === 1 ? "" : "s"}{q ? ` para «${q}»` : ""}
            </p>
            <ul className={`grid gap-4 sm:grid-cols-2 lg:grid-cols-3 ${loading ? "opacity-60" : ""}`}>
              {res.data.map((p) => (
                <li key={p.id} className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <span className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="size-3.5" /> Finalizado
                  </span>
                  <h2 className="break-words font-semibold text-slate-900">{p.name}</h2>
                  <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-600">{p.description || "Sin descripción."}</p>
                </li>
              ))}
            </ul>
            {res.lastPage > 1 && (
              <div className="mt-6 flex items-center justify-between text-sm text-slate-500">
                <span>Página {res.page} de {res.lastPage}</span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1 || loading} onClick={() => setPage((n) => n - 1)}>Anterior</Button>
                  <Button variant="outline" size="sm" disabled={page >= res.lastPage || loading} onClick={() => setPage((n) => n + 1)}>Siguiente</Button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500">Instituto Tecnológico Superior Sudamericano</footer>
    </div>
  )
}
