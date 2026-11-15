import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import api from "@/api/axios"

type Similar = {
  id: string
  name: string
  academic_period?: string | null
  career?: { name: string } | null
}

/**
 * RN-04: mientras se escribe el nombre (y la descripción) de un proyecto nuevo,
 * avisa si ya existen proyectos parecidos. Solo informa; no impide guardar.
 */
export function SimilarProjectsHint({ name, description }: { name?: string; description?: string }) {
  const [items, setItems] = useState<Similar[]>([])

  useEffect(() => {
    const n = (name || "").trim()
    if (n.length < 4) { setItems([]); return }
    let cancelled = false
    const t = setTimeout(() => {
      api
        .get<Similar[]>("/api/projects/similar", { params: { name: n, description: (description || "").slice(0, 500) } })
        .then((res) => { if (!cancelled) setItems(res.data || []) })
        .catch(() => { if (!cancelled) setItems([]) })
    }, 500)
    return () => { cancelled = true; clearTimeout(t) }
  }, [name, description])

  if (items.length === 0) return null

  return (
    <div role="status" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
      <p className="flex items-center gap-2 font-semibold">
        <AlertTriangle className="size-4" /> Ya hay proyectos parecidos
      </p>
      <ul className="mt-2 space-y-1">
        {items.map((p) => (
          <li key={p.id}>
            <a href={`/projects/${p.id}`} target="_blank" rel="noreferrer" className="font-medium text-amber-800 underline hover:text-amber-600">
              {p.name}
            </a>
            <span className="text-xs text-amber-800"> · {[p.career?.name, p.academic_period].filter(Boolean).join(" · ")}</span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-xs text-amber-800">
        Si trata el mismo tema, considera continuar ese proyecto (botón «Continuar») en lugar de registrar uno nuevo.
      </p>
    </div>
  )
}
