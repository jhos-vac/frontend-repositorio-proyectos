import { cn } from "@/lib/utils"
import { STATUS_LABEL, STATUS_STYLE, normalizeStatus } from "@/lib/status"

type Props = {
  status?: string | null
  startDate?: string | null
  endDate?: string | null
  className?: string
}

export function StatusBadge({ status, startDate, endDate, className }: Props) {
  const key = normalizeStatus(status, startDate, endDate)
  const style = STATUS_STYLE[key]
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset whitespace-nowrap",
        style.badge,
        className
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {STATUS_LABEL[key]}
    </span>
  )
}
