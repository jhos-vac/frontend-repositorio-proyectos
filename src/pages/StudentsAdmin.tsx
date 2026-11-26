import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Download, GraduationCap, Loader2, Pencil, Plus, Search, Trash2, UploadCloud } from "lucide-react"
import * as XLSX from "xlsx"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { LEVELS, levelLabel } from "@/lib/status"
import { INSTITUTIONAL_EMAIL_HINT, isInstitutionalEmail } from "@/lib/institutional"
import { apiError, selectCls, type Career, type Cohort, type Paged, type Student } from "@/lib/types"
import { useRole } from "@/lib/useRole"

type Form = { name: string; email: string; careerId: string; level: string; group: string; academicPeriod: string }
const EMPTY: Form = { name: "", email: "", careerId: "", level: "", group: "", academicPeriod: "" }
const LIMIT = 20

/** Normaliza un encabezado de Excel: minúsculas y sin tildes ("Período" -> "periodo"). */
const key = (k: string) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()

/**
 * FE-16 (BE-08): los estudiantes no tienen cuenta; el docente los registra y administra
 * (solo en sus carreras y niveles asignados) y el ADMIN, en cualquiera.
 */
export default function StudentsAdmin() {
  const isAdmin = useRole() === "ADMIN"
  const [rows, setRows] = useState<Student[]>([])
  const [meta, setMeta] = useState<Paged<Student>["meta"] | null>(null)
  const [careers, setCareers] = useState<Career[]>([])
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null) // null = cargando
  const [periods, setPeriods] = useState<{ id: string; name: string }[]>([])
  const [page, setPage] = useState(1)
  const [fCareer, setFCareer] = useState(""); const [fLevel, setFLevel] = useState(""); const [fGroup, setFGroup] = useState("")
  const [search, setSearch] = useState(""); const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<Student | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [formErr, setFormErr] = useState("")
  const [deleting, setDeleting] = useState<Student | null>(null)
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 5000) }

  useEffect(() => {
    api.get("/api/careers?limit=1000").then((r) => setCareers(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {})
    api.get("/api/period").then((r) => setPeriods(r.data || [])).catch(() => {})
  }, [])

  // Carrera + nivel en los que el usuario puede registrar: los asignados (docente) o todos (ADMIN)
  useEffect(() => {
    if (isAdmin) { setCohorts(careers.flatMap((c) => LEVELS.map((l) => ({ id: `${c.id}-${l}`, careerId: c.id, level: l, career: c })))); return }
    api.get<Cohort[]>("/api/assignments/mine").then((r) => setCohorts(r.data)).catch(() => setCohorts([]))
  }, [isAdmin, careers])

  const careerOptions = useMemo(() => {
    const ids = new Set((cohorts || []).map((c) => c.careerId))
    return careers.filter((c) => ids.has(c.id))
  }, [cohorts, careers])
  const levelsFor = (careerId: string) => (cohorts || []).filter((c) => c.careerId === careerId).map((c) => c.level).sort()

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(t) }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT) })
      if (fCareer) p.set("careerId", fCareer); if (fLevel) p.set("level", fLevel); if (fGroup.trim()) p.set("group", fGroup.trim()); if (q) p.set("search", q)
      const res = await api.get<Paged<Student>>(`/api/students?${p}`)
      setRows(res.data.data); setMeta(res.data.meta)
    } catch (e) { flash(false, apiError(e, "No se pudo cargar los estudiantes.")) } finally { setLoading(false) }
  }, [page, fCareer, fLevel, fGroup, q])
  useEffect(() => { load() }, [load])

  const set = (k: keyof Form, v: string) => setForm((f) => {
    const next = { ...f, [k]: v }
    // Al cambiar de carrera, el nivel debe ser uno de los asignados para esa carrera
    if (k === "careerId" && !levelsFor(v).includes(Number(f.level))) next.level = String(levelsFor(v)[0] ?? "")
    return next
  })

  const openCreate = () => {
    const c = careerOptions[0]?.id || ""
    setForm({ ...EMPTY, careerId: c, level: String(levelsFor(c)[0] ?? ""), academicPeriod: periods[0]?.name || "" })
    setFormErr(""); setEditing(null); setDialog("create")
  }
  const openEdit = (s: Student) => {
    setEditing(s); setFormErr("")
    setForm({ name: s.name, email: s.email, careerId: s.careerId, level: String(s.level), group: s.group || "", academicPeriod: s.academicPeriod || "" })
    setDialog("edit")
  }

  const save = async () => {
    setFormErr("")
    if (!form.name.trim() || !form.email.trim()) return setFormErr("Nombre y correo son obligatorios.")
    if (!isInstitutionalEmail(form.email.trim())) return setFormErr(INSTITUTIONAL_EMAIL_HINT)
    if (!form.careerId || !form.level) return setFormErr("Elige la carrera y el nivel.")
    const body = {
      name: form.name.trim(), email: form.email.trim(), careerId: form.careerId, level: Number(form.level),
      group: form.group.trim() || undefined, academicPeriod: form.academicPeriod || undefined,
    }
    setBusy(true)
    try {
      if (dialog === "create") { await api.post("/api/students", body); flash(true, `«${body.name}» registrado.`) }
      else if (editing) { await api.patch(`/api/students/${editing.id}`, body); flash(true, "Cambios guardados.") }
      setDialog(null); await load()
    } catch (e) { setFormErr(apiError(e)) } finally { setBusy(false) }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/api/students/${deleting.id}`); flash(true, `«${deleting.name}» eliminado.`); setDeleting(null); await load() }
    catch (e) { flash(false, apiError(e)); setDeleting(null) } finally { setBusy(false) }
  }

  // ------------------------------------------------------------ carga masiva
  const downloadTemplate = () => {
    const c = careerOptions[0]
    const ws = XLSX.utils.json_to_sheet([{ nombre: "Ana Torres", correo: "ana.torres@sudamericano.edu.ec", carrera: c?.name || "", nivel: levelsFor(c?.id || "")[0] ?? 1, grupo: "A", periodo: periods[0]?.name || "" }])
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Estudiantes")
    XLSX.writeFile(wb, "plantilla-estudiantes.xlsx")
  }

  const uploadFile = async (file?: File) => {
    if (!file) return
    setBulkErrors([]); setBusy(true)
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" })
      if (!raw.length) throw new Error("El archivo está vacío.")
      const errs: string[] = []
      const students = raw.map((r, i) => {
        const row: Record<string, string> = {}
        Object.entries(r).forEach(([k, v]) => { row[key(k)] = String(v ?? "").trim() })
        const careerName = row.carrera || row.career || ""
        const career = careers.find((c) => c.name.toLowerCase() === careerName.toLowerCase())
        if (!career) errs.push(`Fila ${i + 1}: la carrera «${careerName}» no existe (escribe el nombre exacto).`)
        return {
          name: row.nombre || row.name || "", email: row.correo || row.email || "",
          careerId: career?.id || "", level: Number(row.nivel || row.level),
          group: row.grupo || row.group || undefined, academicPeriod: row.periodo || row.period || undefined,
        }
      })
      if (errs.length) { setBulkErrors(errs); return }
      const res = await api.post("/api/students/bulk", { students })
      setBulkOpen(false); flash(true, `Carga completada: ${res.data?.created ?? students.length} estudiantes registrados.`); await load()
    } catch (e) {
      const err = e as { message?: string; response?: { data?: { message?: string | string[] } } }
      const m = err.response?.data?.message
      setBulkErrors(Array.isArray(m) ? m.map((l) => l.replace(/^students\.(\d+)\./, (_: string, n: string) => `Fila ${Number(n) + 1}: `)) : [m || err.message || "No se pudo procesar el archivo."])
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = "" }
  }

  const noCohorts = cohorts !== null && cohorts.length === 0

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Estudiantes</h1>
          <p className="mt-1 text-sm text-slate-500">
            Los estudiantes no tienen cuenta: regístralos aquí para asignarlos a los proyectos.{!isAdmin && " Solo ves los de tus carreras y niveles asignados."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setBulkErrors([]); setBulkOpen(true) }} disabled={noCohorts} className="gap-1.5"><UploadCloud className="size-4" /> Carga masiva</Button>
          <Button onClick={openCreate} disabled={noCohorts || cohorts === null} className="gap-1.5"><Plus className="size-4" /> Nuevo estudiante</Button>
        </div>
      </div>

      {noCohorts && (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-800">
          Aún no tienes carreras ni niveles asignados. Pide al administrador que te asigne en «Docentes por nivel».
        </div>
      )}
      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o correo" className="pl-9" aria-label="Buscar" />
        </div>
        <select className={selectCls} value={fCareer} onChange={(e) => { setFCareer(e.target.value); setPage(1) }} aria-label="Carrera">
          <option value="">Todas las carreras</option>{careerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectCls} value={fLevel} onChange={(e) => { setFLevel(e.target.value); setPage(1) }} aria-label="Nivel">
          <option value="">Todos los niveles</option>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
        </select>
        <Input value={fGroup} onChange={(e) => { setFGroup(e.target.value); setPage(1) }} placeholder="Grupo (p. ej. A)" aria-label="Grupo" />
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sin estudiantes" description="Registra estudiantes uno por uno o con la carga masiva." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Carrera</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Período</th><th className="px-4 py-3 text-right">Proyectos</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><InitialsAvatar name={s.name} /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{s.name}</p><p className="truncate text-xs text-slate-500">{s.email}</p></div></div></td>
                  <td className="px-4 py-3 text-slate-600">{s.career?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{levelLabel(s.level)}</td>
                  <td className="px-4 py-3 text-slate-600">{s.group || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{s.academicPeriod || "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{s._count?.projects ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Editar ${s.name}`} onClick={() => openEdit(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${s.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(s)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{meta.total} estudiantes · página {page} de {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Nuevo estudiante" : "Editar estudiante"}</DialogTitle>
            <DialogDescription>El estudiante no inicia sesión: queda registrado para asignarlo a proyectos.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-name">Nombre completo</Label><Input id="s-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-email">Correo institucional</Label><Input id="s-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-career">Carrera</Label>
              <select id="s-career" className={selectCls} value={form.careerId} onChange={(e) => set("careerId", e.target.value)}>
                {careerOptions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="space-y-1.5"><Label htmlFor="s-level">Nivel</Label>
              <select id="s-level" className={selectCls} value={form.level} onChange={(e) => set("level", e.target.value)}>
                {levelsFor(form.careerId).map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
              </select></div>
            <div className="space-y-1.5"><Label htmlFor="s-group">Grupo</Label><Input id="s-group" value={form.group} maxLength={30} placeholder="Opcional (p. ej. A)" onChange={(e) => set("group", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="s-period">Período académico</Label>
              <select id="s-period" className={selectCls} value={form.academicPeriod} onChange={(e) => set("academicPeriod", e.target.value)}>
                <option value="">Sin período</option>{periods.map((p) => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select></div>
          </div>
          {formErr && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formErr}</p>}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Carga masiva de estudiantes</DialogTitle>
            <DialogDescription>
              Excel con las columnas <b>nombre, correo, carrera, nivel</b> y, opcionales, <b>grupo, periodo</b>. {INSTITUTIONAL_EMAIL_HINT} Se registran todos o ninguno.
            </DialogDescription>
          </DialogHeader>
          <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={downloadTemplate}><Download className="size-4" /> Descargar plantilla</Button>
          <label htmlFor="s-bulk" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-brand-600">
            {busy ? <Loader2 className="mb-2 size-10 animate-spin text-brand-600" /> : <UploadCloud className="mb-2 size-10 text-slate-500" />}
            <span className="text-sm font-semibold text-slate-800">{busy ? "Procesando…" : "Subir archivo (.xlsx, .xls)"}</span>
          </label>
          <input ref={fileRef} id="s-bulk" type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => uploadFile(e.target.files?.[0])} />
          {bulkErrors.length > 0 && (
            <div role="alert" className="max-h-56 overflow-y-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <p className="mb-1 font-semibold">No se registró ningún estudiante. Corrige el archivo:</p>
              <ul className="list-disc space-y-0.5 pl-4">{bulkErrors.map((e, i) => <li key={i}>{e}</li>)}</ul>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar estudiante</DialogTitle>
            <DialogDescription>
              Vas a eliminar a «{deleting?.name}»{deleting?._count?.projects ? ` y se quitará de ${deleting._count.projects} proyecto(s)` : ""}. Los proyectos se conservan. Esta acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
