import { useEffect, useState } from "react"
import { CheckCircle2, Clock, FolderKanban, Flag, XCircle } from "lucide-react"
import api from "@/api/axios"
import { StatCard } from "@/components/common/StatCard"

type Summary = { total: number; pending: number; approved: number; rejected: number; completed: number; inProgress: number }

/** Resumen de los proyectos del propio estudiante (todos los ciclos). */
export function MySummary({ onSelect }: { onSelect?: (key: "all" | "pending" | "approved" | "rejected" | "completed") => void }) {
  const [s, setS] = useState<Summary | null>(null)

  useEffect(() => {
    api.get("/api/projects/mine/summary").then((r) => setS(r.data)).catch(() => setS(null))
  }, [])

  const v = (n?: number) => (s ? n ?? 0 : "—")

  return (
    <section className="grid grid-cols-2 gap-4 xl:grid-cols-4">
      <StatCard label="Mis proyectos" value={v(s?.total)} icon={FolderKanban} hint="De todos los ciclos" onClick={onSelect && (() => onSelect("all"))} />
      <StatCard label="Aceptados" value={v(s?.approved)} icon={CheckCircle2} tone="emerald" hint="Aprobados por tu docente" onClick={onSelect && (() => onSelect("approved"))} />
      <StatCard label="Terminados" value={v(s?.completed)} icon={Flag} tone="violet" hint="Proyectos finalizados" onClick={onSelect && (() => onSelect("completed"))} />
      {s && s.rejected > 0 ? (
        <StatCard label="Rechazados" value={s.rejected} icon={XCircle} tone="amber" hint="Corrígelos y reenvíalos" onClick={onSelect && (() => onSelect("rejected"))} />
      ) : (
        <StatCard label="Pendientes" value={v(s?.pending)} icon={Clock} tone="amber" hint="En revisión de tu docente" onClick={onSelect && (() => onSelect("pending"))} />
      )}
    </section>
  )
}
