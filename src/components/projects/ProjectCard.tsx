import { Link } from "react-router-dom"
import { GitBranch } from "lucide-react"
import { StatusBadge } from "@/components/common/StatusBadge"
import { ReviewBadge } from "@/components/common/ReviewBadge"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { cn } from "@/lib/utils"
import type { ProjectRow } from "@/lib/types"

type Props = {
  project: ProjectRow
  /** Muestra el estado de revisión (útil en "Mis proyectos"). */
  showReview?: boolean
  /** Muestra quién registró el proyecto (útil en ciclos pasados). */
  showAuthor?: boolean
  /** Etiquetas ya elegidas en el filtro: se resaltan. */
  highlightTags?: string[]
}

/** Tarjeta de proyecto para las vistas del estudiante. */
export function ProjectCard({ project: p, showReview, showAuthor, highlightTags = [] }: Props) {
  const tags = p.projectSkills?.map((ps) => ps.skill).filter(Boolean) ?? []
  return (
    <Link
      to={`/projects/${p.id}`}
      className="group flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="truncate rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
          {p.career?.name || "Sin carrera"}
        </span>
        <div className="flex items-center gap-1.5">
          {showReview && <ReviewBadge status={p.reviewStatus} />}
          {(!showReview || p.reviewStatus === "approved") && <StatusBadge status={p.status} />}
        </div>
      </div>

      <h3 className="mt-3 line-clamp-2 font-semibold text-slate-900 group-hover:text-brand-700">{p.name}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>

      {tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map((t) => (
            <span
              key={t.id}
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] ring-1 ring-inset",
                highlightTags.includes(t.id)
                  ? "bg-brand-700 text-white ring-brand-700"
                  : "bg-slate-50 text-slate-600 ring-slate-200"
              )}
            >
              {t.name}
            </span>
          ))}
          {tags.length > 6 && <span className="text-[11px] text-slate-400">+{tags.length - 6}</span>}
        </div>
      )}

      <div className="mt-auto flex items-center gap-2 pt-4">
        {showAuthor && <InitialsAvatar name={p.user?.name} className="size-6 text-[10px]" />}
        <p className="min-w-0 flex-1 truncate text-xs text-slate-500">
          {showAuthor ? `${p.user?.name || "—"} · ` : ""}
          {p.academic_period || "Sin período"}
        </p>
        {(p.branchNumber ?? 1) > 1 && (
          <span className="inline-flex items-center gap-1 text-[11px] text-slate-500" title="Continuación de otro proyecto">
            <GitBranch className="size-3.5" /> Rama {p.branchNumber}
          </span>
        )}
        {!!p._count?.branches && (
          <span className="inline-flex items-center gap-1 text-[11px] text-brand-700" title="Proyectos que lo continuaron">
            <GitBranch className="size-3.5" /> {p._count.branches}
          </span>
        )}
      </div>
    </Link>
  )
}
