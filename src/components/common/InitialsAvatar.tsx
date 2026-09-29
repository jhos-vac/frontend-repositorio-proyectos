import { cn } from "@/lib/utils"
import { initials } from "@/lib/status"

const TONES = [
  "bg-blue-100 text-blue-800",
  "bg-emerald-100 text-emerald-800",
  "bg-violet-100 text-violet-800",
  "bg-amber-100 text-amber-800",
  "bg-rose-100 text-rose-800",
  "bg-cyan-100 text-cyan-800",
]

export function InitialsAvatar({ name, className }: { name?: string | null; className?: string }) {
  const tone = TONES[(name || "?").length % TONES.length]
  return (
    <span
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
        tone,
        className
      )}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  )
}
