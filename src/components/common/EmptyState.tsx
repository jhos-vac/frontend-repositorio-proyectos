import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

export function EmptyState({ icon: Icon, title, description, action }: {
  icon: LucideIcon; title: string; description?: string; action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="mb-3 rounded-full bg-brand-50 p-3 text-brand-700"><Icon className="size-5" /></span>
      <p className="font-medium text-slate-900">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
