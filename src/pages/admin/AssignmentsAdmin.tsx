import { useCallback, useEffect, useState } from "react"
import { AlertTriangle, Loader2 } from "lucide-react"
import api from "@/api/axios"
import { LEVELS, levelLabel } from "@/lib/status"
import { apiError, selectCls, type AppUser, type Career, type Paged } from "@/lib/types"

type Assignment = { id: string; level: number; careerId?: string; career: Career; teacher: { id: string; name: string } }

/** Matriz carrera × nivel: define qué docente acepta y revisa los proyectos de cada cohorte. */
export default function AssignmentsAdmin() {
  const [careers, setCareers] = useState<Career[]>([])
  const [teachers, setTeachers] = useState<AppUser[]>([])
  const [assign, setAssign] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4000) }

  const load = useCallback(async () => {
    try {
      const [c, t, a] = await Promise.all([
        api.get("/api/careers?limit=1000"),
        api.get<Paged<AppUser>>("/api/users?role=TEACHER&limit=1000"),
        api.get<Assignment[]>("/api/assignments"),
      ])
      setCareers(Array.isArray(c.data) ? c.data : c.data.data || [])
      setTeachers(t.data.data); setAssign(a.data)
    } catch (e) { flash(false, apiError(e, "No se pudo cargar las asignaciones.")) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const current = (careerId: string, level: number) => assign.find((a) => (a.career?.id ?? a.careerId) === careerId && a.level === level)

  const change = async (careerId: string, level: number, teacherId: string) => {
    const key = `${careerId}-${level}`
    setSaving(key)
    try {
      await api.put("/api/assignments", { careerId, level, teacherId: teacherId || null })
      flash(true, teacherId ? "Docente asignado." : "Asignación retirada.")
      await load()
    } catch (e) { flash(false, apiError(e)) } finally { setSaving(null) }
  }

  const missing = careers.flatMap((c) => LEVELS.filter((l) => !current(c.id, l)).map((l) => `${c.name} · ${levelLabel(l)}`))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Docentes por nivel</h1>
        <p className="mt-1 text-sm text-slate-500">Cada carrera y nivel (1 a 4) tiene un docente responsable de aceptar y revisar los proyectos de sus estudiantes.</p>
      </div>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : (
        <>
          {missing.length > 0 && (
            <div className="flex gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <p>{missing.length} combinaciones sin docente: los proyectos de esos estudiantes solo podrán ser revisados por un administrador.</p>
            </div>
          )}
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
                <tr><th className="px-4 py-3">Carrera</th>{LEVELS.map((l) => <th key={l} className="px-4 py-3">{levelLabel(l)}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {careers.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">{c.name}</td>
                    {LEVELS.map((l) => {
                      const a = current(c.id, l); const key = `${c.id}-${l}`
                      return (
                        <td key={l} className="px-3 py-2">
                          <select className={`${selectCls} ${a ? "" : "border-amber-300"}`} value={a?.teacher.id || ""} disabled={saving === key}
                            onChange={(e) => change(c.id, l, e.target.value)} aria-label={`Docente de ${c.name}, ${levelLabel(l)}`}>
                            <option value="">Sin asignar</option>
                            {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {teachers.length === 0 && <p className="text-sm text-slate-500">No hay docentes registrados. Crea uno desde «Usuarios y roles».</p>}
        </>
      )}
    </div>
  )
}
