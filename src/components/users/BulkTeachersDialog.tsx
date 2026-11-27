import { useRef, useState } from "react"
import { CheckCircle2, Download, FileSpreadsheet, KeyRound, UploadCloud } from "lucide-react"
import * as XLSX from "xlsx"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { INSTITUTIONAL_DOMAINS, INSTITUTIONAL_EMAIL_HINT, isInstitutionalEmail } from "@/lib/institutional"
import type { Career } from "@/lib/types"

/** Normaliza encabezados y nombres: minúsculas y sin tildes ("Contraseña" -> "contrasena"). */
const norm = (k: string) => k.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase()
const COLUMNS = ["nombre", "correo", "carrera", "contraseña"] as const
const STRONG = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{6,72}$/

/** Contraseña temporal segura (12 caracteres: mayúscula, minúscula, número y símbolo). Sin caracteres confusos. */
function tempPassword(): string {
  const sets = ["ABCDEFGHJKLMNPQRSTUVWXYZ", "abcdefghijkmnpqrstuvwxyz", "23456789", "!#$%&*?@"]
  const all = sets.join("")
  const rnd = (n: number) => { const a = new Uint32Array(1); crypto.getRandomValues(a); return a[0] % n }
  const chars = sets.map((s) => s[rnd(s.length)])
  while (chars.length < 12) chars.push(all[rnd(all.length)])
  for (let i = chars.length - 1; i > 0; i--) { const j = rnd(i + 1); [chars[i], chars[j]] = [chars[j], chars[i]] }
  return chars.join("")
}

type Access = { nombre: string; correo: string; carrera: string; contrasena: string; generada: boolean }

/**
 * FE-19: alta de docentes por archivo, dentro de «Usuarios y roles».
 * La contraseña es opcional en la plantilla: si falta, se genera una temporal. Al terminar se
 * descarga un Excel con los accesos para entregarlos; cada docente debe cambiarla al entrar.
 * Todo o nada: el servidor crea todos los docentes o ninguno.
 */
export function BulkTeachersDialog({ open, onOpenChange, careers, onDone }: {
  open: boolean; onOpenChange: (o: boolean) => void; careers: Career[]; onDone: (created: number) => void
}) {
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const [accesses, setAccesses] = useState<Access[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const close = (o: boolean) => { if (!o) { setErrors([]); setAccesses(null) } onOpenChange(o) }

  const downloadTemplate = () => {
    const domain = INSTITUTIONAL_DOMAINS[0] || "sudamericano.edu.ec"
    const ws = XLSX.utils.json_to_sheet(
      [{ nombre: "María López Hernández", correo: `maria.lopez@${domain}`, carrera: careers[0]?.name || "", "contraseña": "" }],
      { header: [...COLUMNS] },
    )
    ws["!cols"] = [{ wch: 32 }, { wch: 36 }, { wch: 34 }, { wch: 18 }]
    const help = XLSX.utils.aoa_to_sheet([
      ["Cómo llenar la plantilla"],
      ["Una fila por docente. Obligatorias: nombre, correo y carrera."],
      [INSTITUTIONAL_EMAIL_HINT],
      ["carrera: escribe el nombre tal como aparece en la lista de abajo."],
      ["contraseña (opcional): si la dejas vacía, el sistema genera una temporal. Si la escribes: mínimo 6 caracteres con mayúscula, minúscula, número y símbolo."],
      ["Al terminar se descarga un Excel con los accesos. Cada docente debe cambiar su contraseña al ingresar."],
      ["Si una fila tiene un error, no se registra ningún docente: corrige y vuelve a subir el archivo."],
      [],
      ["Carreras"],
      ...careers.map((c) => [c.name]),
    ])
    help["!cols"] = [{ wch: 100 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Docentes")
    XLSX.utils.book_append_sheet(wb, help, "Instrucciones")
    XLSX.writeFile(wb, "plantilla-docentes.xlsx")
  }

  const downloadAccesses = (list: Access[]) => {
    const ws = XLSX.utils.json_to_sheet(list.map((a) => ({
      Nombre: a.nombre, Correo: a.correo, Carrera: a.carrera,
      "Contraseña temporal": a.contrasena, Origen: a.generada ? "Generada por el sistema" : "Del archivo",
    })))
    ws["!cols"] = [{ wch: 32 }, { wch: 36 }, { wch: 34 }, { wch: 20 }, { wch: 24 }]
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Accesos")
    XLSX.writeFile(wb, `accesos-docentes-${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  const uploadFile = async (file?: File) => {
    if (!file) return
    setErrors([]); setAccesses(null); setBusy(true)
    try {
      const wb = XLSX.read(await file.arrayBuffer())
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0]], { defval: "" })
      const errs: string[] = []
      const list: Access[] = []
      const teachers = raw
        .map((r) => { const row: Record<string, string> = {}; Object.entries(r).forEach(([k, v]) => { row[norm(k)] = String(v ?? "").trim() }); return row })
        .filter((row) => Object.values(row).some(Boolean)) // filas vacías al final del Excel
        .map((row, i) => {
          const name = row.nombre || row.name || ""
          const email = (row.correo || row.email || "").toLowerCase()
          const careerName = row.carrera || row.career || ""
          const career = careers.find((c) => norm(c.name) === norm(careerName))
          const given = row.contrasena || row.password || ""
          const label = `Fila ${i + 1}${email ? ` (${email})` : ""}`
          if (!name) errs.push(`${label}: falta el nombre.`)
          if (!isInstitutionalEmail(email)) errs.push(`${label}: ${INSTITUTIONAL_EMAIL_HINT}`)
          if (!career) errs.push(`${label}: la carrera «${careerName}» no existe (copia el nombre de la hoja Instrucciones).`)
          if (given && !STRONG.test(given)) errs.push(`${label}: la contraseña debe tener al menos 6 caracteres con mayúscula, minúscula, número y símbolo (o déjala vacía).`)
          const password = given || tempPassword()
          list.push({ nombre: name, correo: email, carrera: career?.name || careerName, contrasena: password, generada: !given })
          return { name, email, password, careerId: career?.id || "" }
        })
      if (!teachers.length) throw new Error("El archivo no tiene docentes.")
      if (errs.length) { setErrors(errs); return }
      const res = await api.post("/api/users/create-teachers", { teachers })
      setAccesses(list)
      downloadAccesses(list)
      onDone(res.data?.created ?? teachers.length)
    } catch (e) {
      const err = e as { message?: string; response?: { data?: { message?: string | string[] } } }
      const m = err.response?.data?.message
      setErrors(Array.isArray(m)
        ? m.map((l) => l.replace(/^teachers\.(\d+)\./, (_: string, n: string) => `Fila ${Number(n) + 1}: `))
        : [m || err.message || "No se pudo procesar el archivo."])
    } finally { setBusy(false); if (fileRef.current) fileRef.current.value = "" }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="size-5 text-brand-700" /> Carga masiva de docentes</DialogTitle>
          <DialogDescription>
            Descarga la plantilla, escribe un docente por fila y súbela. Si alguna fila tiene un error no se registra nadie y te mostramos qué corregir.
          </DialogDescription>
        </DialogHeader>

        {accesses ? (
          <div className="space-y-3">
            <p className="flex items-center gap-2 rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              <CheckCircle2 className="size-4 shrink-0" /> {accesses.length} docente{accesses.length === 1 ? "" : "s"} registrado{accesses.length === 1 ? "" : "s"}.
            </p>
            <p className="flex gap-2 text-sm text-slate-600">
              <KeyRound className="mt-0.5 size-4 shrink-0 text-amber-600" />
              Se descargó un Excel con los accesos y las contraseñas temporales. Guárdalo en un lugar seguro y entrégalo a cada docente: deberán cambiar la contraseña al ingresar. No se vuelve a mostrar.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1.5" onClick={() => downloadAccesses(accesses)}><Download className="size-4" /> Descargar accesos otra vez</Button>
              <Button size="sm" onClick={() => close(false)}>Listo</Button>
            </div>
          </div>
        ) : (
          <>
            <Button variant="outline" size="sm" className="w-fit gap-1.5" onClick={downloadTemplate} disabled={!careers.length}><Download className="size-4" /> Descargar plantilla</Button>
            <label htmlFor="t-bulk" className="flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed border-slate-300 bg-white p-8 text-center hover:border-brand-600">
              <UploadCloud className="mb-2 size-8 text-brand-600" />
              <span className="text-sm font-semibold text-slate-800">{busy ? "Procesando…" : "Subir archivo (.xlsx, .xls)"}</span>
              <span className="mt-1 text-xs text-slate-500">Hasta 200 docentes por archivo.</span>
            </label>
            <input ref={fileRef} id="t-bulk" type="file" accept=".xlsx,.xls" className="hidden" disabled={busy} onChange={(e) => uploadFile(e.target.files?.[0])} />
          </>
        )}

        {errors.length > 0 && (
          <div role="alert" className="max-h-56 overflow-y-auto rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <p className="mb-1 font-semibold">No se registró ningún docente. Corrige estos puntos y vuelve a subir el archivo:</p>
            <ul className="list-disc space-y-0.5 pl-4">{errors.map((e, i) => <li key={i}>{e}</li>)}</ul>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
