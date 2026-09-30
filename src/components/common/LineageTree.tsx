import { GitBranch } from "lucide-react"
import { ReviewBadge } from "@/components/common/ReviewBadge"

export type LineageNode = {
  id: string
  name: string
  parentId: string | null
  branchNumber: number
  reviewStatus: string
  createdAt: string
  user?: { id: string; name: string } | null
  career?: { name: string } | null
}

/**
 * Historial de continuidad del proyecto, al estilo de las ramas de un repositorio:
 * el origen arriba y cada continuación sangrada bajo el proyecto del que parte.
 */
export function LineageTree({
  nodes, currentId, onOpen,
}: { nodes: LineageNode[]; currentId?: string; onOpen?: (id: string) => void }) {
  const byParent = new Map<string | null, LineageNode[]>()
  nodes.forEach((n) => {
    const key = n.parentId && nodes.some((x) => x.id === n.parentId) ? n.parentId : null
    byParent.set(key, [...(byParent.get(key) || []), n])
  })

  const render = (parent: string | null, depth: number): React.ReactNode =>
    (byParent.get(parent) || []).map((n) => (
      <li key={n.id}>
        <div style={{ paddingLeft: depth * 20 }}>
        <button
          type="button"
          onClick={() => onOpen?.(n.id)}
          className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition hover:bg-slate-100 ${
            n.id === currentId ? "border-brand-600 bg-brand-50" : "border-slate-200 bg-white"
          }`}
        >
          <GitBranch className="size-4 shrink-0 text-brand-600" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium text-slate-900">{n.name}</span>
            <span className="block text-xs text-slate-500">
              {n.parentId ? `Continuación #${n.branchNumber}` : "Proyecto original"} · {n.user?.name || "Sin responsable"} · {new Date(n.createdAt).toLocaleDateString("es-ES")}
            </span>
          </span>
          <ReviewBadge status={n.reviewStatus} />
        </button>
        </div>
        {render(n.id, depth + 1) && <ul className="mt-2 space-y-2">{render(n.id, depth + 1)}</ul>}
      </li>
    ))

  return <ul className="space-y-2">{render(null, 0)}</ul>
}
