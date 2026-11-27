import { GitBranch, GitCommitHorizontal } from "lucide-react"
import { StatusBadge } from "@/components/common/StatusBadge"
import { levelLabel } from "@/lib/status"

export type LineageNode = {
  id: string
  name: string
  parentId: string | null
  branchNumber: number
  createdAt: string
  status?: string
  level?: number | null
  user?: { id: string; name: string } | null
  career?: { name: string } | null
}

/**
 * FE-12: historial de continuidad como árbol, al estilo de las ramas de un repositorio.
 * El proyecto original arriba; cada continuación cuelga de una línea que la une con el
 * proyecto del que parte. Cada nodo se abre con un clic; el proyecto actual se resalta.
 */
export function LineageTree({
  nodes, currentId, onOpen,
}: { nodes: LineageNode[]; currentId?: string; onOpen?: (id: string) => void }) {
  // Un nodo cuyo padre no es visible se muestra como raíz para no perderlo
  const byParent = new Map<string | null, LineageNode[]>()
  nodes.forEach((n) => {
    const key = n.parentId && nodes.some((x) => x.id === n.parentId) ? n.parentId : null
    byParent.set(key, [...(byParent.get(key) || []), n])
  })

  const renderNode = (n: LineageNode) => {
    const current = n.id === currentId
    const kids = byParent.get(n.id)?.length || 0
    return (
      <button
        type="button"
        onClick={() => onOpen?.(n.id)}
        aria-current={current ? "page" : undefined}
        className={`flex w-full items-start gap-2.5 rounded-lg border px-3 py-2 text-left text-sm transition hover:border-brand-400 hover:bg-slate-50 ${
          current ? "border-brand-600 bg-brand-50 ring-1 ring-brand-600" : "border-slate-200 bg-white"
        }`}
      >
        {n.parentId ? <GitBranch className="mt-0.5 size-4 shrink-0 text-brand-600" /> : <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-brand-700" />}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className="break-words font-medium text-slate-900">{n.name}</span>
            {current && <span className="rounded-full bg-brand-600 px-2 py-0.5 text-[10px] font-semibold text-white">Estás aquí</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span>{n.parentId ? `Continuación #${n.branchNumber}` : "Proyecto original"}</span>
            {n.level ? <span>· {levelLabel(n.level)}</span> : null}
            <span>· {n.user?.name || "Sin responsable"}</span>
            <span>· {new Date(n.createdAt).toLocaleDateString("es-EC")}</span>
            {kids > 0 && <span>· {kids} continuaci{kids === 1 ? "ón" : "ones"}</span>}
          </span>
        </span>
        {n.status && <StatusBadge status={n.status} className="shrink-0" />}
      </button>
    )
  }

  // Rama: línea vertical del padre hacia sus hijos y un codo horizontal hacia cada hijo.
  // La vertical cubre también el espacio entre nodos; en el último hijo se corta a la altura del codo.
  const render = (parent: string | null): React.ReactNode => {
    const list = byParent.get(parent) || []
    return list.map((n, i) => {
      const last = i === list.length - 1
      return (
        <li key={n.id} className={parent ? "relative pl-6" : ""}>
          {parent && (
            <>
              <span aria-hidden className={`absolute -top-2 left-2 w-0.5 bg-brand-200 ${last ? "h-8" : "-bottom-2"}`} />
              <span aria-hidden className="absolute left-2 top-6 h-0.5 w-4 bg-brand-200" />
            </>
          )}
          {renderNode(n)}
          {byParent.get(n.id)?.length ? <ul className="mt-2 space-y-2">{render(n.id)}</ul> : null}
        </li>
      )
    })
  }

  return <ul className="space-y-2" aria-label="Historial de continuidad">{render(null)}</ul>
}
