import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Eye, FolderKanban, GitBranch, Loader2, Network, Pencil, Search, Trash2, Users } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { LineageTree, type LineageNode } from "@/components/common/LineageTree"
import { LEVELS, levelLabel } from "@/lib/status"
import { apiError, selectCls, type Career, type Paged, type ProjectRow } from "@/lib/types"

const LIMIT = 10

/** Gestión global de proyectos: edición, baja y trazabilidad de continuaciones (sin revisión: BE-08). */
export default function ProjectsAdmin() {
  const navigate = useNavigate()
  const [rows, setRows] = useState<ProjectRow[]>([])
  const [meta, setMeta] = useState<Paged<ProjectRow>["meta"] | null>(null)
  const [careers, setCareers] = useState<Career[]>([])
  const [page, setPage] = useState(1)
  const [fCont, setFCont] = useState(""); const [fCareer, setFCareer] = useState(""); const [fLevel, setFLevel] = useState("")
  const [search, setSearch] = useState(""); const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [deleting, setDeleting] = useState<ProjectRow | null>(null)
  const [history, setHistory] = useState<{ project: ProjectRow; nodes: LineageNode[] } | null>(null)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }

  useEffect(() => { api.get("/api/careers?limit=1000").then((r) => setCareers(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {}) }, [])
  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(t) }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (fCont) p.set("continuity", fCont)
      if (fCareer) p.set("careerId", fCareer); if (fLevel) p.set("level", fLevel); if (q) p.set("search", q)
      const res = await api.get<Paged<ProjectRow>>(`/api/projects?${p}`)
      setRows(res.data.data); setMeta(res.data.meta)
    } catch (e) { flash(false, apiError(e, "No se pudo cargar los proyectos.")) } finally { setLoading(false) }
  }, [page, fCont, fCareer, fLevel, q])
  useEffect(() => { load() }, [load])

  const remove = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/api/projects/${deleting.id}`); flash(true, `«${deleting.name}» eliminado.`); setDeleting(null); await load() }
    catch (e) { flash(false, apiError(e)); setDeleting(null) } finally { setBusy(false) }
  }

  const openHistory = async (p: ProjectRow) => {
    try {
      const res = await api.get<{ nodes: LineageNode[] }>(`/api/projects/${p.id}/lineage`)
      setHistory({ project: p, nodes: res.data.nodes })
    } catch (e) { flash(false, apiError(e)) }
  }

  const reset = <T,>(fn: (v: T) => void) => (v: T) => { fn(v); setPage(1) }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestión de proyectos</h1>
        <p className="mt-1 text-sm text-slate-500">Edita y elimina cualquier proyecto, y consulta cuáles son continuaciones de proyectos anteriores.</p>
      </div>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar proyecto" className="pl-9" aria-label="Buscar" />
        </div>
        <select className={selectCls} value={fCont} onChange={(e) => reset(setFCont)(e.target.value)} aria-label="Continuidad">
          <option value="">Toda continuidad</option><option value="continuations">Son continuación de otro</option><option value="origins">Tienen continuaciones</option>
        </select>
        <select className={selectCls} value={fCareer} onChange={(e) => reset(setFCareer)(e.target.value)} aria-label="Carrera">
          <option value="">Todas las carreras</option>{careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectCls} value={fLevel} onChange={(e) => reset(setFLevel)(e.target.value)} aria-label="Nivel">
          <option value="">Todos los niveles</option>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={FolderKanban} title="Sin proyectos" description="No hay proyectos con esos filtros." />
      ) : (
        <ul className="space-y-3">
          {rows.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{p.name}</h2>
                    {p.parent && <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700"><GitBranch className="size-3" /> Continuación de {p.parent.name}</span>}
                    {!!p._count?.branches && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">{p._count.branches} continuación{p._count.branches > 1 ? "es" : ""}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">{p.user?.name || "Sin responsable"} · {p.career?.name} · {levelLabel(p.level)} · {new Date(p.createdAt).toLocaleDateString("es-ES")}</p>
                  {!!p.students?.length && <p className="mt-1 inline-flex items-center gap-1 text-xs text-slate-600"><Users className="size-3" /> {p.modality === "individual" ? "Individual" : "Grupal"}: {p.students.map((s) => s.student.name).join(", ")}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap gap-1.5">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/projects/${p.id}`)}><Eye className="size-4" /> Ver</Button>
                  {(p.parentId || !!p._count?.branches) && <Button variant="outline" size="sm" className="gap-1.5" onClick={() => openHistory(p)}><Network className="size-4" /> Historial</Button>}
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/projects?editar=${p.id}`)}><Pencil className="size-4" /> Editar</Button>
                  <Button variant="ghost" size="icon" aria-label={`Eliminar ${p.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(p)}><Trash2 className="size-4" /></Button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{meta.total} proyectos · página {page} de {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar proyecto</DialogTitle>
            <DialogDescription>Vas a eliminar «{deleting?.name}». Si tiene continuaciones, estas se conservan como proyectos independientes. No se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy} onClick={remove}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!history} onOpenChange={(o) => !o && setHistory(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de continuidad</DialogTitle>
            <DialogDescription>Origen y continuaciones de «{history?.project.name}».</DialogDescription>
          </DialogHeader>
          {history && <LineageTree nodes={history.nodes} currentId={history.project.id} onOpen={(id) => { setHistory(null); navigate(`/projects/${id}`) }} />}
        </DialogContent>
      </Dialog>
    </div>
  )
}
