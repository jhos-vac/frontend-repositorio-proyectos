import { cn } from "@/lib/utils"

export function ProgressBar({ value, className }: { value: number; className?: string }) {
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-slate-100", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div className="h-full rounded-full bg-brand-600 transition-all" style={{ width: `${value}%` }} />
    </div>
  )
}
