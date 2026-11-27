import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CheckCircle2, FileSpreadsheet, GraduationCap, Loader2, Pencil, Plus, Search, Trash2, UploadCloud } from "lucide-react"
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
import { parseSga, type SgaCourse } from "@/lib/sga"

type Form = { name: string; cedula: string; email: string; careerId: string; level: string; group: string; academicPeriod: string }
const EMPTY: Form = { name: "", cedula: "", email: "", careerId: "", level: "", group: "", academicPeriod: "" }
const LIMIT = 20

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
  const [periods, setPeriods] = useState<{ id: string; name: string; active?: boolean }[]>([])
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
  const [sga, setSga] = useState<SgaCourse[] | null>(null) // vista previa del archivo del SGA
  // El período lo activa y lo cambia solo el administrador; los estudiantes nuevos quedan en el activo
  const activePeriod = periods.find((p) => p.active)?.name || ""
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
    setForm({ ...EMPTY, careerId: c, level: String(levelsFor(c)[0] ?? ""), academicPeriod: isAdmin ? activePeriod : "" })
    setFormErr(""); setEditing(null); setDialog("create")
  }
  const openEdit = (s: Student) => {
    setEditing(s); setFormErr("")
    setForm({ name: s.name, cedula: s.cedula || "", email: s.email || "", careerId: s.careerId, level: String(s.level), group: s.group || "", academicPeriod: s.academicPeriod || "" })
    setDialog("edit")
  }

  const save = async () => {
    setFormErr("")
    if (!form.name.trim()) return setFormErr("El nombre es obligatorio.")
    if (!form.cedula.trim() && !form.email.trim()) return setFormErr("Indica la cédula (o el correo institucional).")
    if (form.cedula.trim() && !/^\d{10}$/.test(form.cedula.trim())) return setFormErr("La cédula debe tener 10 dígitos.")
    if (form.email.trim() && !isInstitutionalEmail(form.email.trim())) return setFormErr(INSTITUTIONAL_EMAIL_HINT)
    if (!form.careerId || !form.level) return setFormErr("Elige la carrera y el nivel.")
    const body = {
      name: form.name.trim(), cedula: form.cedula.trim() || undefined, email: form.email.trim() || undefined,
      careerId: form.careerId, level: Number(form.level), group: form.group.trim() || undefined,
      academicPeriod: isAdmin ? form.academicPeriod || undefined : undefined,
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

  // ------------------------------------------------------------ carga desde el SGA
  const openBulk = () => { setBulkErrors([]); setSga(null); setBulkOpen(true) }

  /** Lee el reporte del SGA y muestra una vista previa (carrera, curso, nivel y estudiantes) antes de guardar. */
  const readFile = async (file?: File) => {
    if (!file) return
    setBulkErrors([]); setSga(null)
    try {
      const courses = parseSga(XLSX.read(await file.arrayBuffer()), careers)
      if (!courses.length) throw new Error("El archivo no parece un reporte del SGA (no tiene la línea «CARRERA:» ni la columna CEDULA).")
      const errs = courses.flatMap((c) => c.errors.map((e) => (courses.length > 1 ? `Hoja «${c.sheet}»: ${e}` : e)))
      if (!isAdmin) {
        for (const c of courses) {
          if (c.career && c.level && !cohorts?.some((x) => x.careerId === c.career!.id && x.level === c.level)) {
            errs.push(`${c.career.name}, ${levelLabel(c.level)}: no está entre tus carreras y niveles asignados.`)
          }
        }
      }
      if (errs.length) { setBulkErrors(errs); return }
      setSga(courses)
    } catch (e) { setBulkErrors([(e as Error).message || "No se pudo leer el archivo."]) }
    finally { if (fileRef.current) fileRef.current.value = "" }
  }

  const saveSga = async () => {
    if (!sga) return
    const students = sga.flatMap((c) => c.students.map((st) => ({
      name: st.name, cedula: st.cedula, careerId: c.career!.id, level: c.level!, group: c.course || undefined,
    })))
    setBulkErrors([]); setBusy(true)
    try {
      // Si suben otra materia del mismo curso, los que ya están registrados se omiten
      const res = await api.post("/api/students/bulk", { students, skipExisting: true })
      const created = res.data?.created ?? 0
      const skipped = res.data?.skipped ?? 0
      setBulkOpen(false); setSga(null)
      flash(true, `Carga completada: ${created} registrado${created === 1 ? "" : "s"}${skipped ? `; ${skipped} ya estaba${skipped === 1 ? "" : "n"} registrado${skipped === 1 ? "" : "s"}` : ""}.`)
      await load()
    } catch (e) {
      const err = e as { message?: string; response?: { data?: { message?: string | string[] } } }
      const m = err.response?.data?.message
      setBulkErrors(Array.isArray(m) ? m.map((l) => l.replace(/^students\.(\d+)\./, (_: string, n: string) => `Fila ${Number(n) + 1}: `)) : [m || err.message || "No se pudo guardar."])
    } finally { setBusy(false) }
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
          <Button variant="outline" onClick={openBulk} disabled={noCohorts} className="gap-1.5"><UploadCloud className="size-4" /> Cargar desde el SGA</Button>
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
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre, cédula o correo" className="pl-9" aria-label="Buscar" />
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
        <EmptyState icon={GraduationCap} title="Sin estudiantes" description="Regístralos uno por uno o sube el reporte del SGA." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Estudiante</th><th className="px-4 py-3">Carrera</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3">Grupo</th><th className="px-4 py-3">Período</th><th className="px-4 py-3 text-right">Proyectos</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><InitialsAvatar name={s.name} /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{s.name}</p><p className="truncate text-xs text-slate-500">{[s.cedula, s.email].filter(Boolean).join(" · ")}</p></div></div></td>
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
            <div className="space-y-1.5"><Label htmlFor="s-cedula">Cédula</Label><Input id="s-cedula" inputMode="numeric" maxLength={10} value={form.cedula} onChange={(e) => set("cedula", e.target.value.replace(/\D/g, ""))} /></div>
            <div className="space-y-1.5"><Label htmlFor="s-email">Correo institucional</Label><Input id="s-email" type="email" placeholder="Opcional" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
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
              {isAdmin ? (
                <select id="s-period" className={selectCls} value={form.academicPeriod} onChange={(e) => set("academicPeriod", e.target.value)}>
                  <option value="">Sin período</option>{periods.map((p) => <option key={p.id} value={p.name}>{p.name}{p.active ? " (activo)" : ""}</option>)}
                </select>
              ) : (
                <p id="s-period" className="flex h-9 items-center rounded-md border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700">
                  {dialog === "edit" ? form.academicPeriod || "—" : activePeriod || "No hay un período activo"}
                </p>
              )}</div>
          </div>
          {formErr && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formErr}</p>}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={bulkOpen} onOpenChange={(o) => { setBulkOpen(o); if (!o) setSga(null) }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-brand-700" /> Cargar estudiantes desde el SGA</DialogTitle>
            <DialogDescription>
              Sube tal cual el reporte de <b>evaluaciones por materia</b> que descargas del SGA. Se toman la carrera, el curso, el nivel y la cédula y el nombre de cada estudiante; las notas no se guardan.
              {activePeriod ? ` Quedan en el período activo (${activePeriod}).` : ""}
            </DialogDescription>
          </DialogHeader>
          {sga ? (
            <div className="space-y-3">
              {sga.map((c) => (
                <div key={c.sheet} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <p className="font-semibold text-slate-900">{c.career?.name} · {c.level ? levelLabel(c.level) : ""}</p>
                  <p className="text-xs text-slate-500">Curso {c.course}{c.modality ? ` · ${c.modality.toLowerCase()}` : ""}{c.subject ? ` · ${c.subject.toLowerCase()}` : ""}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-slate-700"><CheckCircle2 className="size-4 text-emerald-600" /> {c.students.length} estudiante{c.students.length === 1 ? "" : "s"}</p>
                  <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-slate-600">
                    {c.students.map((st) => <li key={st.cedula} className="truncate">{st.cedula} · {st.name}</li>)}
                  </ul>
                </div>
              ))}
              <p className="text-xs text-slate-500">Los que ya estén registrados con la misma cédula se omiten.</p>
              <DialogFooter className="gap-2">
                <Button variant="ghost" onClick={() => setSga(null)} disabled={busy}>Elegir otro archivo</Button>
                <Button onClick={saveSga} disabled={busy}>{busy ? "Guardando…" : "Registrar estudiantes"}</Button>
              </DialogFooter>
            </div>
          ) : (
            <>
              <label htmlFor="s-bulk" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-brand-600">
                <UploadCloud className="mb-2 size-10 text-slate-500" />
                <span className="text-sm font-semibold text-slate-800">Subir reporte del SGA (.xlsx, .xls)</span>
              </label>
              <input ref={fileRef} id="s-bulk" type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => readFile(e.target.files?.[0])} />
            </>
          )}
          {bulkErrors.length > 0 && (
            <div role="alert" className="max-h-56 overflow-y-auto rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              <p className="mb-1 font-semibold">No se registró ningún estudiante. Revisa el archivo:</p>
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
