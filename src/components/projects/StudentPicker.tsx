import { useEffect, useMemo, useState } from "react"
import { Link } from "react-router-dom"
import { Search, Users, X } from "lucide-react"
import api from "@/api/axios"
import { Input } from "@/components/ui/input"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { MAX_STUDENTS, MODALITY_LABEL, type Modality, type Paged, type Student } from "@/lib/types"

/** Mensaje de error de la selección (null = válida). Igual que la regla del servidor. */
export function studentsError(modality: Modality, ids: string[]): string | null {
  if (modality === "individual" && ids.length !== 1) return "Un proyecto individual debe tener exactamente un estudiante."
  if (modality === "grupal" && ids.length < 2) return "Un proyecto grupal debe tener al menos dos estudiantes."
  if (ids.length > MAX_STUDENTS) return `Un proyecto admite hasta ${MAX_STUDENTS} estudiantes.`
  return null
}

/**
 * BE-08: modalidad (individual / grupal) y estudiantes del proyecto, elegidos entre los
 * registrados en la misma carrera y nivel del proyecto.
 */
export function StudentPicker({ careerId, level, modality, onModality, value, onChange, error }: {
  careerId: string; level: number | null; modality: Modality; onModality: (m: Modality) => void
  value: string[]; onChange: (ids: string[]) => void; error?: string | null
}) {
  const [all, setAll] = useState<Student[]>([])
  const [q, setQ] = useState("")
  const ready = !!careerId && !!level

  useEffect(() => {
    if (!ready) { setAll([]); return }
    api.get<Paged<Student>>("/api/students", { params: { careerId, level, limit: 1000 } })
      .then((r) => setAll(r.data.data)).catch(() => setAll([]))
  }, [careerId, level, ready])

  const chosen = useMemo(() => value.map((id) => all.find((s) => s.id === id)).filter(Boolean) as Student[], [value, all])
  const max = modality === "individual" ? 1 : MAX_STUDENTS
  const full = value.length >= max
  const shown = all
    .filter((s) => !value.includes(s.id) && `${s.name} ${s.cedula || ""} ${s.email || ""} ${s.group || ""}`.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 8)

  const pick = (id: string) => { onChange(modality === "individual" ? [id] : [...value, id]); setQ("") }
  const changeModality = (m: Modality) => { onModality(m); if (m === "individual" && value.length > 1) onChange(value.slice(0, 1)) }

  return (
    <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-brand-700"><Users className="size-4" /> Estudiantes</p>
        <div role="radiogroup" aria-label="Modalidad" className="flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 text-xs">
          {(["individual", "grupal"] as Modality[]).map((m) => (
            <button key={m} type="button" role="radio" aria-checked={modality === m} onClick={() => changeModality(m)}
              className={`rounded-md px-3 py-1 font-medium transition ${modality === m ? "bg-white text-brand-800 shadow-sm" : "text-slate-500 hover:text-slate-800"}`}>
              {MODALITY_LABEL[m]}
            </button>
          ))}
        </div>
      </div>
      <p className="mb-2 text-xs text-slate-500">
        {modality === "individual" ? "Elige al estudiante" : `Elige entre 2 y ${MAX_STUDENTS} estudiantes`} de la carrera y el nivel del proyecto.{" "}
        ¿No aparece? <Link to="/estudiantes" className="font-medium text-brand-700 hover:underline">Regístralo en Estudiantes</Link>.
      </p>

      {chosen.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chosen.map((s) => (
            <span key={s.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-2 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
              <InitialsAvatar name={s.name} className="size-5 text-[9px]" /> {s.name}
              <button type="button" aria-label={`Quitar a ${s.name}`} onClick={() => onChange(value.filter((v) => v !== s.id))}><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} disabled={!ready || (full && modality === "grupal")} className="bg-white pl-9" aria-label="Buscar estudiante"
          placeholder={!ready ? "Elige primero la carrera y el nivel" : "Buscar por nombre, correo o grupo…"} />
      </div>
      {ready && all.length === 0 && <p className="mt-2 text-xs text-amber-600">No hay estudiantes registrados en esta carrera y nivel.</p>}
      {full && modality === "grupal" && <p className="mt-2 text-xs text-amber-600">Llegaste al máximo de estudiantes.</p>}
      {shown.length > 0 && !(full && modality === "grupal") && (
        <ul className="mt-2 max-h-56 divide-y divide-slate-200 overflow-y-auto rounded-md border border-slate-200">
          {shown.map((s) => (
            <li key={s.id}>
              <button type="button" onClick={() => pick(s.id)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <InitialsAvatar name={s.name} className="size-6 text-[10px]" />
                <span className="min-w-0 flex-1"><span className="block truncate">{s.name}</span><span className="block truncate text-xs text-slate-500">{[s.cedula, s.email].filter(Boolean).join(" · ")}</span></span>
                {s.group && <span className="text-xs text-slate-500">Grupo {s.group}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  )
}
