import { useCallback, useEffect, useState } from "react"
import { Link, useNavigate, useParams } from "react-router-dom"
import { ArrowLeft, CalendarRange, CheckCircle2, FileText, GitBranch, GraduationCap, Loader2, Pencil, Target, UserRound, Users } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { StatusBadge } from "@/components/common/StatusBadge"
import { LineageTree, type LineageNode } from "@/components/common/LineageTree"
import { ProjectFilesPanel } from "@/components/projects/ProjectFilesPanel"
import { LEVELS, levelLabel } from "@/lib/status"
import { MODALITY_LABEL, apiError, type Career, type Cohort, type Modality, type ProjectStudent } from "@/lib/types"
import { useRole } from "@/lib/useRole"
import { useAuthStore } from "@/store/authStore"

type Detail = {
  id: string; name: string; description: string; summary?: string | null; problems?: string | null
  status: string; objectives?: string[]; deliverables?: string[]; cycle?: string | null; academic_period?: string | null
  careerId: string; career?: Career | null; level?: number | null; modality?: Modality
  createdBy: string | null; user?: { id: string; name: string } | null
  parentId?: string | null; parent?: { id: string; name: string } | null; _count?: { branches: number }
  students?: ProjectStudent[]; projectSkills?: { id: string; skill: { id: string; name: string } }[]
  createdAt?: string; updatedAt?: string
}

const isCompleted = (status?: string) => /complet|finaliz/i.test(status || "")
const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" }) : "")

function Section({ title, icon: Icon, children }: { title: string; icon: typeof FileText; children: React.ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="mb-3 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-brand-700"><Icon className="size-4" /> {title}</h2>
      {children}
    </section>
  )
}

/** FE-06: detalle del proyecto en su propia página (/projects/:id), con enlace para compartir. */
export default function ProjectDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const role = useRole()
  const me = useAuthStore((s) => s.user?.id) || localStorage.getItem("id")
  const [p, setP] = useState<Detail | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [careers, setCareers] = useState<Career[]>([])
  const [cohorts, setCohorts] = useState<Cohort[]>([])
  const [lineage, setLineage] = useState<LineageNode[]>([])
  const [confirmStatus, setConfirmStatus] = useState(false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setNotFound(false)
    try {
      const res = await api.get<Detail>(`/api/projects/${id}`)
      setP(res.data)
    } catch { setP(null); setNotFound(true) }
  }, [id])

  useEffect(() => { setP(null); setLineage([]); load() }, [load])
  useEffect(() => {
    api.get("/api/careers?limit=1000").then((r) => setCareers(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {})
  }, [])
  useEffect(() => {
    if (role === "TEACHER") api.get<Cohort[]>("/api/assignments/mine").then((r) => setCohorts(r.data)).catch(() => setCohorts([]))
  }, [role])
  useEffect(() => {
    if (!p || (!p.parentId && !p._count?.branches)) return
    api.get(`/api/projects/${p.id}/lineage`).then((r) => setLineage(r.data?.nodes || [])).catch(() => setLineage([]))
  }, [p?.id, p?.parentId, p?._count?.branches]) // eslint-disable-line react-hooks/exhaustive-deps

  if (notFound) {
    return (
      <div className="space-y-4">
        <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="size-4" /> Volver a proyectos</Link>
        <EmptyState icon={FileText} title="Proyecto no encontrado" description="Puede que se haya eliminado o que el enlace esté incompleto." />
      </div>
    )
  }
  if (!p) return <div className="flex h-60 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando proyecto…</div>

  const isAdmin = role === "ADMIN"
  const assigned = cohorts.some((c) => c.careerId === p.careerId && c.level === p.level)
  const canModify = isAdmin || (!!me && p.createdBy === me) || assigned
  const branchLevels = isAdmin ? [...LEVELS] : cohorts.filter((c) => c.careerId === p.careerId).map((c) => c.level)
  const careerName = p.career?.name || careers.find((c) => c.id === p.careerId)?.name || "—"
  const skills = (p.projectSkills || []).map((ps) => ps.skill).filter(Boolean)
  const links = (p.deliverables || []).filter((d) => /^https?:\/\//.test(d))
  const deliverables = (p.deliverables || []).filter((d) => !/^https?:\/\//.test(d))

  const toggleStatus = async () => {
    setBusy(true)
    try {
      const status = isCompleted(p.status) ? "en progreso" : "completado"
      const res = await api.patch(`/api/projects/${p.id}/status`, { status })
      setP((prev) => (prev ? { ...prev, ...res.data } : prev))
      setMsg({ ok: true, text: status === "completado" ? "Proyecto marcado como completado." : "Proyecto reabierto." })
    } catch (e) { setMsg({ ok: false, text: apiError(e, "No se pudo cambiar el estado del proyecto.") }) }
    finally { setBusy(false); setConfirmStatus(false); setTimeout(() => setMsg(null), 4500) }
  }

  return (
    <div className="space-y-6">
      <Link to="/projects" className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"><ArrowLeft className="size-4" /> Volver a proyectos</Link>

      <header className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 space-y-2">
          <h1 className="break-words text-3xl font-bold tracking-tight text-slate-900">{p.name}</h1>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <StatusBadge status={p.status} />
            {p.level ? <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{levelLabel(p.level)}</span> : null}
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">{MODALITY_LABEL[p.modality || "grupal"]}</span>
            {p.parent && (
              <Link to={`/projects/${p.parent.id}`} className="inline-flex items-center gap-1 text-xs font-medium text-brand-700 hover:underline">
                <GitBranch className="size-3" /> Continuación de {p.parent.name}
              </Link>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canModify && (
            <Button variant="outline" className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50" onClick={() => setConfirmStatus(true)}>
              <CheckCircle2 className="size-4" /> {isCompleted(p.status) ? "Reabrir" : "Marcar como completado"}
            </Button>
          )}
          {branchLevels.length > 0 && (
            <Button variant="outline" className="gap-1.5" onClick={() => navigate(`/projects?continuar=${p.id}`)}><GitBranch className="size-4" /> Continuar proyecto</Button>
          )}
          {canModify && <Button className="gap-1.5" onClick={() => navigate(`/projects?editar=${p.id}`)}><Pencil className="size-4" /> Editar</Button>}
        </div>
      </header>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Section title="Problemática" icon={FileText}>
            <p className="whitespace-pre-wrap break-words leading-relaxed text-slate-700">{p.description}</p>
            {p.problems && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-600">{p.problems}</p>}
          </Section>
          {p.summary && (
            <Section title="Resumen" icon={FileText}><p className="whitespace-pre-wrap break-words text-slate-700">{p.summary}</p></Section>
          )}
          {!!p.objectives?.length && (
            <Section title="Objetivos" icon={Target}>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">{p.objectives.map((o, i) => <li key={i} className="break-words">{o}</li>)}</ul>
            </Section>
          )}
          {(deliverables.length > 0 || links.length > 0) && (
            <Section title="Entregables" icon={FileText}>
              <ul className="list-disc space-y-1 pl-5 text-slate-700">
                {deliverables.map((d, i) => <li key={i} className="break-words">{d}</li>)}
                {links.map((l) => <li key={l}><a href={l} target="_blank" rel="noreferrer" className="break-all text-brand-700 hover:underline">{l}</a></li>)}
              </ul>
            </Section>
          )}
          <ProjectFilesPanel project={p as never} canEdit={canModify} isAdmin={isAdmin} />
          {lineage.length > 1 && (
            <Section title="Historial de continuidad" icon={GitBranch}>
              <LineageTree nodes={lineage} currentId={p.id} onOpen={(pid) => navigate(`/projects/${pid}`)} />
            </Section>
          )}
        </div>

        <aside className="space-y-6">
          <Section title="Datos" icon={GraduationCap}>
            <dl className="space-y-3 text-sm">
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Carrera</dt><dd className="text-slate-800">{careerName}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Período</dt><dd className="flex items-center gap-1.5 text-slate-800"><CalendarRange className="size-4 text-slate-400" /> {p.academic_period || "—"}{p.cycle ? ` · ${p.cycle}` : ""}</dd></div>
              <div><dt className="text-xs font-semibold uppercase text-slate-500">Docente</dt><dd className="flex items-center gap-1.5 text-slate-800"><UserRound className="size-4 text-slate-400" /> {p.user?.name || "Sin responsable"}</dd></div>
              {p.createdAt && <div><dt className="text-xs font-semibold uppercase text-slate-500">Registrado</dt><dd className="text-slate-800">{fmtDate(p.createdAt)}</dd></div>}
            </dl>
          </Section>
          <Section title={`Estudiantes (${p.students?.length || 0})`} icon={Users}>
            {p.students?.length ? (
              <ul className="space-y-2">
                {p.students.map(({ student: s }) => (
                  <li key={s.id} className="flex items-center gap-2">
                    <InitialsAvatar name={s.name} className="size-7 text-[10px]" />
                    <span className="min-w-0"><span className="block truncate text-sm text-slate-800">{s.name}</span><span className="block truncate text-xs text-slate-500">{s.email}</span></span>
                  </li>
                ))}
              </ul>
            ) : <p className="text-sm text-slate-500">Sin estudiantes asignados.</p>}
          </Section>
          <Section title="Tecnologías" icon={Target}>
            {skills.length ? <div className="flex flex-wrap gap-2">{skills.map((s) => <Badge key={s.id} className="bg-slate-100 text-slate-900 hover:bg-slate-200">{s.name}</Badge>)}</div>
              : <p className="text-sm text-slate-500">Sin tecnologías registradas.</p>}
          </Section>
        </aside>
      </div>

      <Dialog open={confirmStatus} onOpenChange={setConfirmStatus}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{isCompleted(p.status) ? "Reabrir proyecto" : "Marcar como completado"}</DialogTitle>
            <DialogDescription>
              {isCompleted(p.status)
                ? "El proyecto volverá a estar en progreso y se podrán modificar otra vez sus archivos y enlaces."
                : "El proyecto quedará como completado: ya no se podrán modificar sus archivos ni enlaces."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmStatus(false)}>Cancelar</Button>
            <Button onClick={toggleStatus} disabled={busy}>{busy ? "Guardando…" : "Confirmar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
