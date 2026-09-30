import { useEffect, useMemo, useState } from "react"
import { Search, Users, X } from "lucide-react"
import api from "@/api/axios"
import { Input } from "@/components/ui/input"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { levelLabel } from "@/lib/status"

type Candidate = { id: string; name: string; level: number | null }

/** Integrantes del proyecto: estudiantes de la misma carrera (el creador siempre participa). */
export function MemberPicker({ careerId, selfId, value, onChange }: {
  careerId: string; selfId?: string | null; value: string[]; onChange: (ids: string[]) => void
}) {
  const [all, setAll] = useState<Candidate[]>([])
  const [q, setQ] = useState("")

  useEffect(() => {
    if (!careerId) { setAll([]); return }
    api.get<Candidate[]>(`/api/users/candidates?careerId=${careerId}`).then((r) => setAll(r.data)).catch(() => setAll([]))
  }, [careerId])

  const options = useMemo(() => all.filter((c) => c.id !== selfId), [all, selfId])
  const chosen = options.filter((c) => value.includes(c.id))
  const shown = options.filter((c) => !value.includes(c.id) && c.name.toLowerCase().includes(q.toLowerCase())).slice(0, 6)
  const full = value.length >= 7

  return (
    <div className="md:col-span-2 rounded-lg border border-slate-200 bg-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-brand-700"><Users className="size-4" /> Integrantes</p>
      <p className="mb-2 text-xs text-slate-500">Tú apareces automáticamente. Suma a compañeros de tu carrera (máximo 8 en total).</p>

      {chosen.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {chosen.map((c) => (
            <span key={c.id} className="inline-flex items-center gap-1.5 rounded-full bg-brand-50 py-1 pl-1 pr-2 text-xs font-medium text-brand-800 ring-1 ring-inset ring-brand-200">
              <InitialsAvatar name={c.name} className="size-5 text-[9px]" /> {c.name}
              <button type="button" aria-label={`Quitar a ${c.name}`} onClick={() => onChange(value.filter((v) => v !== c.id))}><X className="size-3" /></button>
            </span>
          ))}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={careerId ? "Buscar compañero…" : "Elige primero la carrera"} disabled={!careerId || full} className="bg-white pl-9" aria-label="Buscar compañero" />
      </div>
      {full && <p className="mt-2 text-xs text-amber-600">Llegaste al máximo de integrantes.</p>}
      {shown.length > 0 && !full && (
        <ul className="mt-2 divide-y divide-slate-200 rounded-md border border-slate-200">
          {shown.map((c) => (
            <li key={c.id}>
              <button type="button" onClick={() => { onChange([...value, c.id]); setQ("") }} className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-slate-50">
                <InitialsAvatar name={c.name} className="size-6 text-[10px]" /> <span className="flex-1">{c.name}</span>
                <span className="text-xs text-slate-500">{levelLabel(c.level)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
