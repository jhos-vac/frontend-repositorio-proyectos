import { useCallback, useEffect, useState } from "react"
import { CalendarRange, Loader2, Plus, Trash2 } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { apiError, selectCls } from "@/lib/types"

type Period = { id: string; name: string; createdAt: string }
const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"]

/** Períodos académicos: el administrador solo elige mes y año de inicio y de fin. */
export default function PeriodsAdmin() {
  const now = new Date()
  const years = Array.from({ length: 6 }, (_, i) => now.getFullYear() - 1 + i)
  const [periods, setPeriods] = useState<Period[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [sm, setSm] = useState(9); const [sy, setSy] = useState(now.getFullYear())
  const [em, setEm] = useState(1); const [ey, setEy] = useState(now.getFullYear() + 1)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }
  const load = useCallback(async () => {
    try { setPeriods((await api.get<Period[]>("/api/period")).data) }
    catch (e) { flash(false, apiError(e, "No se pudo cargar los períodos.")) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const preview = `${MONTHS[sm - 1]}-${sy} – ${MONTHS[em - 1]}-${ey}`
  const invalid = ey * 12 + em < sy * 12 + sm

  const create = async () => {
    setBusy(true)
    try {
      await api.post("/api/period", { startMonth: sm, startYear: sy, endMonth: em, endYear: ey })
      flash(true, `Período «${preview}» creado.`); await load()
    } catch (e) { flash(false, apiError(e)) } finally { setBusy(false) }
  }
  const remove = async (p: Period) => {
    if (!window.confirm(`¿Eliminar el período ${p.name}?`)) return
    try { await api.delete(`/api/period/${p.id}`); flash(true, "Período eliminado."); await load() }
    catch (e) { flash(false, apiError(e)) }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Períodos académicos</h1>
        <p className="mt-1 text-sm text-slate-500">Basta con indicar mes y año de inicio y de fin. Los estudiantes eligen uno al registrar su proyecto.</p>
      </div>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Mes de inicio
            <select className={selectCls} value={sm} onChange={(e) => setSm(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Año de inicio
            <select className={selectCls} value={sy} onChange={(e) => setSy(+e.target.value)}>{years.map((y) => <option key={y}>{y}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Mes de fin
            <select className={selectCls} value={em} onChange={(e) => setEm(+e.target.value)}>{MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select></label>
          <label className="space-y-1.5 text-sm font-medium text-slate-700">Año de fin
            <select className={selectCls} value={ey} onChange={(e) => setEy(+e.target.value)}>{years.concat(years[years.length - 1] + 1).map((y) => <option key={y}>{y}</option>)}</select></label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">Se creará: <span className="font-semibold text-slate-900">{preview}</span>{invalid && <span className="ml-2 text-red-600">El fin no puede ser anterior al inicio.</span>}</p>
          <Button onClick={create} disabled={busy || invalid} className="gap-1.5"><Plus className="size-4" /> Crear período</Button>
        </div>
      </div>

      {loading ? (
        <div className="flex h-32 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : periods.length === 0 ? (
        <EmptyState icon={CalendarRange} title="Aún no hay períodos" description="Crea el primero para que los estudiantes puedan registrar proyectos." />
      ) : (
        <ul className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
          {periods.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-4 py-3">
              <span className="flex items-center gap-2 font-medium text-slate-900"><CalendarRange className="size-4 text-brand-600" /> {p.name}</span>
              <Button variant="ghost" size="icon" aria-label={`Eliminar ${p.name}`} className="text-red-600 hover:bg-red-50" onClick={() => remove(p)}><Trash2 className="size-4" /></Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
