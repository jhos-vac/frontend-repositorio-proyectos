import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check, ClipboardCheck, Eye, GitBranch, Loader2, Users, X } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { ReviewBadge } from "@/components/common/ReviewBadge"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { RejectDialog } from "@/components/projects/RejectDialog"
import { levelLabel } from "@/lib/status"
import { apiError, type AppUser, type Paged, type ProjectRow } from "@/lib/types"
import { useAuthStore } from "@/store/authStore"

type Assignment = { id: string; level: number; career: { id: string; name: string }; teacher: { id: string; name: string } }
type Tab = "pending" | "done" | "students"

/** Cola de revisión del docente: proyectos de sus carrera+nivel asignados (el admin ve todos). */
export default function ReviewPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.user?.role?.name)
  const [tab, setTab] = useState<Tab>("pending")
  const [items, setItems] = useState<ProjectRow[]>([])
  const [students, setStudents] = useState<AppUser[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [rejecting, setRejecting] = useState<ProjectRow | null>(null)
  const [pendingCount, setPendingCount] = useState<number | null>(null)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      if (tab === "students") {
        const res = await api.get<Paged<AppUser>>("/api/users/students?limit=200")
        setStudents(res.data.data)
      } else if (tab === "pending") {
        const res = await api.get<Paged<ProjectRow>>("/api/projects/review?reviewStatus=pending&limit=200&order=asc")
        setItems(res.data.data); setPendingCount(res.data.meta.total)
      } else {
        const [a, r] = await Promise.all([
          api.get<Paged<ProjectRow>>("/api/projects/review?reviewStatus=approved&limit=100"),
          api.get<Paged<ProjectRow>>("/api/projects/review?reviewStatus=rejected&limit=100"),
        ])
        setItems([...a.data.data, ...r.data.data].sort((x, y) => +new Date(y.createdAt) - +new Date(x.createdAt)))
      }
    } catch (e) {
      flash(false, apiError(e, "No se pudo cargar la información."))
    } finally { setLoading(false) }
  }, [tab])

  useEffect(() => { load() }, [load])
  useEffect(() => { api.get<Assignment[]>("/api/assignments/mine").then((r) => setAssignments(r.data)).catch(() => {}) }, [])

  const decide = async (p: ProjectRow, decision: "approved" | "rejected", note?: string) => {
    setBusy(true)
    try {
      await api.patch(`/api/projects/${p.id}/review`, { decision, note })
      setRejecting(null)
      flash(true, decision === "approved" ? `«${p.name}» aprobado` : `«${p.name}» rechazado`)
      await load()
    } catch (e) { flash(false, apiError(e)) } finally { setBusy(false) }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "pending", label: `Por revisar${pendingCount != null ? ` (${pendingCount})` : ""}` },
    { id: "done", label: "Revisados" },
    { id: "students", label: "Mis estudiantes" },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Revisión de proyectos</h1>
        <p className="mt-1 text-sm text-slate-500">
          {role === "ADMIN"
            ? "Como administrador ves los proyectos de todas las carreras y niveles."
            : "Proyectos de los estudiantes de las carreras y niveles que tienes asignados."}
        </p>
        {role === "TEACHER" && (
          <div className="mt-3 flex flex-wrap gap-2">
            {assignments.length === 0
              ? <span className="text-sm text-amber-600">Aún no tienes carrera y nivel asignados. Pide al administrador que te asigne.</span>
              : assignments.map((a) => (
                <span key={a.id} className="rounded-full bg-brand-50 px-3 py-1 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
                  {a.career.name} · {levelLabel(a.level)}
                </span>
              ))}
          </div>
        )}
      </div>

      {msg && (
        <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          {msg.text}
        </div>
      )}

      <div className="flex gap-1 border-b border-slate-200" role="tablist">
        {tabs.map((t) => (
          <button
            key={t.id} role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition ${tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-slate-500 hover:text-slate-900"}`}
          >{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-48 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : tab === "students" ? (
        students.length === 0 ? (
          <EmptyState icon={Users} title="Sin estudiantes" description="Todavía no hay estudiantes registrados en tus carreras y niveles." />
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Carrera</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3 text-right">Proyectos</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {students.map((s) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><InitialsAvatar name={s.name} /><div><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-500">{s.email}</p></div></div></td>
                    <td className="px-4 py-3 text-slate-600">{s.career?.name}</td>
                    <td className="px-4 py-3 text-slate-600">{levelLabel(s.level)}</td>
                    <td className="px-4 py-3 text-right text-slate-600">{s._count?.createdProjects ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : items.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={tab === "pending" ? "No hay proyectos por revisar" : "Aún no has revisado proyectos"}
          description={tab === "pending" ? "Cuando un estudiante envíe un proyecto aparecerá aquí." : undefined}
        />
      ) : (
        <ul className="space-y-3">
          {items.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-semibold text-slate-900">{p.name}</h2>
                    <ReviewBadge status={p.reviewStatus} />
                    {p.parent && <span className="inline-flex items-center gap-1 text-xs font-medium text-brand-700"><GitBranch className="size-3" /> Continuación de {p.parent.name}</span>}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {p.user?.name || "Sin responsable"} · {p.career?.name} · {levelLabel(p.level)} · {new Date(p.createdAt).toLocaleDateString("es-ES")}
                  </p>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{p.description}</p>
                  {p.reviewNote && <p className="mt-2 text-xs text-slate-500"><span className="font-semibold">Observación:</span> {p.reviewNote}</p>}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => navigate(`/projects/${p.id}`)}><Eye className="size-4" /> Ver</Button>
                  {p.reviewStatus !== "approved" && (
                    <Button size="sm" className="gap-1.5" disabled={busy} onClick={() => decide(p, "approved")}><Check className="size-4" /> Aprobar</Button>
                  )}
                  {p.reviewStatus !== "rejected" && (
                    <Button size="sm" variant="outline" className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50" disabled={busy} onClick={() => setRejecting(p)}><X className="size-4" /> Rechazar</Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <RejectDialog
        open={!!rejecting} projectName={rejecting?.name} busy={busy}
        onClose={() => setRejecting(null)}
        onConfirm={(note) => rejecting && decide(rejecting, "rejected", note)}
      />
    </div>
  )
}
