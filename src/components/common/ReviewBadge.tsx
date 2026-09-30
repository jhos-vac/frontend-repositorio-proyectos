import { REVIEW_LABEL, REVIEW_STYLE, normalizeReview } from "@/lib/status"

/** Estado de revisión del proyecto: Pendiente / Aprobado / Rechazado. */
export function ReviewBadge({ status, className = "" }: { status?: string | null; className?: string }) {
  const s = normalizeReview(status)
  const st = REVIEW_STYLE[s]
  return (
    <span className={`inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset ${st.badge} ${className}`}>
      <span className={`size-1.5 rounded-full ${st.dot}`} />
      {REVIEW_LABEL[s]}
    </span>
  )
}
