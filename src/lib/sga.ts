import * as XLSX from "xlsx"
import type { Career } from "@/lib/types"

/** Minúsculas, sin tildes y sin espacios repetidos ("TECNOLOGÍA" -> "tecnologia"). */
const norm = (v: string) => v.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, " ").trim().toLowerCase()

/** "BARRETO SANDOVAL EDWIN" -> "Barreto Sandoval Edwin" */
const titleCase = (v: string) => v.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_m, sep: string, ch: string) => sep + ch.toUpperCase())

/** Prefijos del nombre oficial de la carrera en el SGA que no están en el catálogo del sistema. */
const PREFIXES = [/^tecnologia superior universitaria en /, /^tecnologia superior en /, /^tecnico superior en /, /^tecnologia en /]

/** Busca la carrera del catálogo a partir del nombre del SGA ("TECNOLOGÍA SUPERIOR EN DESARROLLO DE SOFTWARE"). */
export function matchCareer(sgaName: string, careers: Career[]): Career | undefined {
  let n = norm(sgaName)
  for (const p of PREFIXES) n = n.replace(p, "")
  return careers.find((c) => norm(c.name) === n)
    || careers.find((c) => n.includes(norm(c.name)) || norm(c.name).includes(n))
}

export type SgaStudent = { cedula: string; name: string }
export type SgaCourse = {
  sheet: string
  subject: string
  careerText: string // como viene en el SGA
  career?: Career
  course: string // p. ej. "2DO-DS-MAT-A" (se guarda como grupo)
  level?: number // 1 a 4, del inicio del curso ("2DO" -> 2)
  modality: string // p. ej. "PRESENCIAL"
  students: SgaStudent[]
  errors: string[]
}

/**
 * Lee el reporte «evaluaciones por materia» del SGA. De cada hoja toma:
 *  - «CARRERA: <carrera> - <curso> - <modalidad>» -> carrera, curso (grupo) y nivel
 *  - la tabla que empieza en la fila con CEDULA y APELLIDOS Y NOMBRES -> estudiantes
 * Las notas y la asistencia se ignoran.
 */
export function parseSga(wb: XLSX.WorkBook, careers: Career[]): SgaCourse[] {
  const out: SgaCourse[] = []
  for (const sheet of wb.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheet], { header: 1, defval: "", raw: false })
    const cell = (r: unknown[], i: number) => String(r[i] ?? "").trim()
    const firstText = (r: unknown[]) => (r.map((c) => String(c ?? "").trim()).find(Boolean) || "")

    const subject = firstText(rows.find((r) => /^materia\s*:/i.test(firstText(r))) || []).replace(/^materia\s*:\s*/i, "")
    const careerLine = firstText(rows.find((r) => /^carrera\s*:/i.test(firstText(r))) || []).replace(/^carrera\s*:\s*/i, "")
    const headerAt = rows.findIndex((r) => r.some((c) => norm(String(c ?? "")) === "cedula"))
    if (!careerLine && headerAt < 0) continue // hoja que no es del SGA

    const errors: string[] = []
    const parts = careerLine.split(/\s+-\s+/)
    const careerText = parts[0] || ""
    const course = (parts[1] || "").toUpperCase()
    const modality = parts.slice(2).join(" - ")
    const career = careerText ? matchCareer(careerText, careers) : undefined
    const lv = Number(course.match(/^(\d)/)?.[1])
    const level = lv >= 1 && lv <= 4 ? lv : undefined
    if (!careerLine) errors.push("no se encontró la línea «CARRERA: …».")
    else if (!career) errors.push(`la carrera «${careerText}» no está en el catálogo del sistema.`)
    if (careerLine && !level) errors.push(`no se pudo leer el nivel del curso «${course || "—"}» (debe empezar con 1RO, 2DO, 3RO o 4TO).`)

    const students: SgaStudent[] = []
    if (headerAt < 0) errors.push("no se encontró la columna CEDULA.")
    else {
      const header = rows[headerAt].map((c) => norm(String(c ?? "")))
      const ci = header.indexOf("cedula")
      const ni = header.findIndex((h) => h.includes("nombre"))
      if (ni < 0) errors.push("no se encontró la columna APELLIDOS Y NOMBRES.")
      for (const [k, r] of rows.slice(headerAt + 1).entries()) {
        const raw = cell(r, ci).replace(/\D/g, "")
        const name = ni >= 0 ? cell(r, ni) : ""
        if (!raw && !name) continue
        const cedula = raw.padStart(10, "0") // Excel puede quitar el 0 inicial
        if (raw.length < 9 || raw.length > 10) errors.push(`fila ${headerAt + k + 2}: la cédula «${cell(r, ci)}» no es válida.`)
        if (!name) errors.push(`fila ${headerAt + k + 2}: falta el nombre.`)
        students.push({ cedula, name: titleCase(name) })
      }
      if (!students.length) errors.push("la hoja no tiene estudiantes.")
    }
    out.push({ sheet, subject, careerText, career, course, level, modality, students, errors })
  }
  return out
}
