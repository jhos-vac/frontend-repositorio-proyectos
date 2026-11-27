import { useEffect, useMemo, useRef, useState } from "react"
import { Download, FileSpreadsheet, UploadCloud } from "lucide-react"
import * as XLSX from "xlsx"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { LEVELS } from "@/lib/status"
import { MAX_STUDENTS, type Career, type Cohort } from "@/lib/types"

/** Normaliza un encabezado o valor: minúsculas y sin tildes ("Período" -> "periodo"). */
const norm = (k: string) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()
/** Lista de una celda: separada por coma, punto y coma o salto de línea. */
const list = (v: string) => v.split(/[,;\n]+/).map((x) => x.trim()).filter(Boolean)
/** Objetivos y entregables: uno por línea o separados por punto y coma (pueden llevar comas). */
const items = (v: string) => v.split(/[;\n]+/).map((x) => x.trim()).filter(Boolean)

const COLUMNS = ["nombre", "descripcion", "carrera", "nivel", "modalidad", "estudiantes", "resumen", "problema", "objetivos", "entregables"] as const

/**
 * BE-11 / FE-18: el docente descarga una plantilla Excel, la llena con sus proyectos
 * (y la cédula o el correo de los estudiantes de cada uno). Se registran en el período activo. y la sube. Todo o nada: si una fila
 * tiene un error no se registra ningún proyecto y se listan los errores por fila.
 */
export function BulkProjectsDialog({ open, onOpenChange, isAdmin, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; isAdmin: boolean; onDone: (created: number) => void
}) {
  const [careers, setCareers] = useState<Career[]>([])
  const [active, setActive] = useState("")
  const [cohorts, setCohorts] = useState<Cohort[] | null>(null)
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setErrors([])
    api.get("/api/careers?limit=1000").then((r) => setCareers(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {})
    api.get("/api/period/active").then((r) => setActive(r.data?.name || "")).catch(() => {})
    if (!isAdmin) api.get<Cohort[]>("/api/assignments/mine").then((r) => setCohorts(r.data)).catch(() => setCohorts([]))
  }, [open, isAdmin])

  // Carrera + nivel en los que puede registrar: los asignados (docente) o todos (ADMIN)
  const allowed = useMemo(() => isAdmin
    ? careers.flatMap((c) => LEVELS.map((level) => ({ career: c, level })))
    : (cohorts || []).map((c) => ({ career: careers.find((x) => x.id === c.careerId), level: c.level })).filter((x) => x.career) as { career: Career; level: number }[],
  [isAdmin, careers, cohorts])

  const downloadTemplate = () => {
    const first = allowed[0]
    const example = {
      nombre: "Sistema de inventario para la cafetería",
      descripcion: "Aplicación web para registrar entradas y salidas de productos.",
      carrera: first?.career.name || "", nivel: first?.level ?? 1,
      modalidad: "grupal",
      estudiantes: "0102030405, 0106070809",
      resumen: "", problema: "", objetivos: "Registrar productos; Generar reportes", entregables: "Informe; Presentación",
    }
    const ws = XLSX.utils.json_to_sheet([example], { header: [...COLUMNS] })
    ws["!cols"] = COLUMNS.map((c) => ({ wch: c === "descripcion" || c === "estudiantes" ? 45 : c === "nombre" ? 35 : 16 }))
    const help = [
      ["Cómo llenar la plantilla"],
      ["Una fila por proyecto. Columnas obligatorias: nombre, descripcion, carrera, nivel, modalidad y estudiantes."],
      [`Todos los proyectos se registran en el período activo${active ? ` (${active})` : ""}; solo el administrador lo cambia.`],
      ["modalidad: individual (exactamente 1 estudiante) o grupal (de 2 a " + MAX_STUDENTS + " estudiantes)."],
      ["estudiantes: cédulas (o correos institucionales) separadas por coma. Deben estar registrados en Estudiantes, en la misma carrera y nivel."],
      ["objetivos y entregables (opcionales): separados por punto y coma."],
      ["Si una fila tiene un error, no se registra ningún proyecto: corrige y vuelve a subir el archivo."],
      [],
      ["Carreras y niveles en los que puedes registrar", ""],
      ["carrera", "nivel"],
      ...allowed.map((a) => [a.career.name, a.level]),
    ]
    const ws2 = XLSX.utils.aoa_to_sheet(help)
    ws2["!cols"] = [{ wch: 60 }, { wch: 10 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Proyectos")
    XLSX.utils.book_append_sheet(wb, ws2, "Instrucciones")
    XLSX.writeFile(wb, "plantilla-proyectos.xlsx")
  }

  const uploadFile = async (file?: File) => {
    if (!file) return
    setErrors([]); setBusy(true)
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" })
      const errs: string[] = []
      const projects = raw
        .map((r) => { const row: Record<string, string> = {}; Object.entries(r).forEach(([k, v]) => { row[norm(k)] = String(v ?? "").trim() }); return row })
        .filter((row) => Object.values(row).some(Boolean)) // filas vacías al final del Excel
        .map((row, i) => {
          const career = careers.find((c) => norm(c.name) === norm(row.carrera || ""))
          if (!career) errs.push(`Fila ${i + 1}: la carrera «${row.carrera}» no existe (copia el nombre de la hoja Instrucciones).`)
          return {
            name: row.nombre || "", description: row.descripcion || "",
            careerId: career?.id || "", level: Number(row.nivel), academic_period: isAdmin && row.periodo ? row.periodo : undefined,
            modality: norm(row.modalidad || ""), studentEmails: list(row.estudiantes || "").map((e) => e.toLowerCase()),
            summary: row.resumen || undefined, problems: row.problema || undefined,
            objectives: row.objetivos ? items(row.objetivos) : undefined,
            deliverables: row.entregables ? items(row.entregables) : undefined,
          }
        })
      if (!projects.length) throw new Error("El archivo no tiene proyectos.")
      if (errs.length) { setErrors(errs); return }
      const res = await api.post("/api/projects/bulk", { projects })
      onOpenChange(false)
      onDone(res.data?.created ?? projects.length)
    } catch (e) {
      const err = e as { message?: string; response?: { data?: { message?: string | string[] } } }
      const m = err.response?.data?.message
      setErrors(Array.isArray(m)
        ? m.map((l) => l.replace(/^projects\.(\d+)\.(\w+\.)?/, (_: string, n: string) => `Fila ${Number(n) + 1}: `))
        : [m || err.message || "No se pudo procesar el archivo."])
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = "" }
  }

  const noCohorts = !isAdmin && cohorts !== null && cohorts.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-brand-700" /> Carga masiva de proyectos</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, escribe un proyecto por fila con las cédulas de sus estudiantes y súbela. Se registran en el período activo{active ? ` (${active})` : ""}.
            Si alguna fila tiene un error no se registra nada y te mostramos qué corregir.
          </DialogDescription>
        </DialogHeader>
        {noCohorts ? (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-800">Aún no tienes carreras ni niveles asignados. Pide al administrador que te asigne uno.</p>
        ) : (
          <>
            <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={downloadTemplate} disabled={!allowed.length}><Download className="size-4" /> Descargar plantilla</Button>
            <label htmlFor="p-bulk" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-brand-600">
              <UploadCloud className="mb-2 size-8 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">{busy ? "Procesando…" : "Subir archivo (.xlsx, .xls)"}</span>
              <span className="mt-1 text-xs text-slate-500">Hasta 100 proyectos por archivo.</span>
            </label>
            <input ref={fileRef} id="p-bulk" type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => uploadFile(e.target.files?.[0])} />
          </>
        )}
        {errors.length > 0 && (
          <div role="alert" className="max-h-56 overflow-y-auto rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <p className="mb-1 font-semibold">No se registró ningún proyecto. Corrige estos puntos y vuelve a subir el archivo:</p>
            <ul className="list-disc space-y-0.5 pl-4">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
