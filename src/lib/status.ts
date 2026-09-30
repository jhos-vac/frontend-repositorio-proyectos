/**
 * Estados de proyecto unificados para toda la interfaz.
 * El backend guarda "in-progress" pero el frontend históricamente usaba
 * "en progreso", "completado" y "Finalizado": aquí se normalizan a tres valores.
 */
export type ProjectStatus = "por-iniciar" | "en-progreso" | "completado"

export const STATUS_LABEL: Record<ProjectStatus, string> = {
  "por-iniciar": "Por iniciar",
  "en-progreso": "En progreso",
  "completado": "Completado",
}

// Colores propios (el azul de marca se reserva para acciones y navegación)
export const STATUS_STYLE: Record<ProjectStatus, { badge: string; dot: string }> = {
  "por-iniciar": { badge: "bg-violet-50 text-violet-700 ring-violet-200", dot: "bg-violet-500" },
  "en-progreso": { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  "completado": { badge: "bg-slate-100 text-slate-700 ring-slate-200", dot: "bg-slate-400" },
}

export function normalizeStatus(
  status?: string | null,
  startDate?: string | null,
  endDate?: string | null
): ProjectStatus {
  // Si hay fechas, mandan sobre el texto guardado (misma regla que tenía la pantalla de proyectos)
  if (startDate && endDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const start = new Date(startDate); start.setHours(0, 0, 0, 0)
    const end = new Date(endDate); end.setHours(0, 0, 0, 0)
    if (today > end) return "completado"
    if (today >= start) return "en-progreso"
    return "por-iniciar"
  }
  const s = (status || "").toLowerCase()
  if (s.includes("complet") || s.includes("finaliz")) return "completado"
  if (s.includes("inici") || s.includes("pend")) return "por-iniciar"
  return "en-progreso"
}

/** Porcentaje de avance según fechas; null si el proyecto no tiene fechas. */
export function projectProgress(startDate?: string | null, endDate?: string | null): number | null {
  if (!startDate || !endDate) return null
  const start = new Date(startDate).getTime()
  const end = new Date(endDate).getTime()
  if (!(end > start)) return null
  const pct = ((Date.now() - start) / (end - start)) * 100
  return Math.max(0, Math.min(100, Math.round(pct)))
}

export function initials(name?: string | null): string {
  if (!name) return "?"
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] || "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "?"
}

/* ---------- Revisión del docente (flujo de aprobación) ---------- */
export type ReviewStatus = "pending" | "approved" | "rejected"

export const REVIEW_LABEL: Record<ReviewStatus, string> = {
  pending: "Pendiente",
  approved: "Aprobado",
  rejected: "Rechazado",
}

export const REVIEW_STYLE: Record<ReviewStatus, { badge: string; dot: string }> = {
  pending: { badge: "bg-amber-50 text-amber-700 ring-amber-200", dot: "bg-amber-500" },
  approved: { badge: "bg-emerald-50 text-emerald-700 ring-emerald-200", dot: "bg-emerald-500" },
  rejected: { badge: "bg-red-50 text-red-700 ring-red-200", dot: "bg-red-500" },
}

export function normalizeReview(s?: string | null): ReviewStatus {
  return s === "pending" || s === "rejected" ? s : "approved"
}

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  TEACHER: "Docente",
  USER: "Estudiante",
}

export const LEVELS = [1, 2, 3, 4] as const
export const levelLabel = (n?: number | null) => (n ? `Nivel ${n}` : "Sin nivel")
