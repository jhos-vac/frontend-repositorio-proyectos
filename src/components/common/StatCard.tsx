import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type Props = {
  label: string
  value: number | string
  hint?: string
  icon: LucideIcon
  tone?: "brand" | "emerald" | "violet" | "amber"
  onClick?: () => void
}

const TONES = {
  brand: "bg-brand-50 text-brand-700",
  emerald: "bg-emerald-50 text-emerald-700",
  violet: "bg-violet-50 text-violet-700",
  amber: "bg-amber-50 text-amber-700",
}

export function StatCard({ label, value, hint, icon: Icon, tone = "brand", onClick }: Props) {
  const className = cn(
    "rounded-xl border border-slate-200 bg-white p-4 text-left shadow-sm",
    onClick && "transition hover:border-brand-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-brand-600"
  )
  const content = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        <span className={cn("rounded-lg p-2", TONES[tone])}>
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
    </>
  )
  return onClick ? (
    <button type="button" onClick={onClick} className={className}>{content}</button>
  ) : (
    <div className={className}>{content}</div>
  )
}
