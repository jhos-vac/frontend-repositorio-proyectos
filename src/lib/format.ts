export function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return "Buenos días"
  if (h < 19) return "Buenas tardes"
  return "Buenas noches"
}

export function timeAgo(date?: string | null): string {
  if (!date) return ""
  const diff = Date.now() - new Date(date).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return "Ahora"
  if (min < 60) return `Hace ${min} min`
  const h = Math.floor(min / 60)
  if (h < 24) return `Hace ${h} h`
  const d = Math.floor(h / 24)
  if (d < 30) return `Hace ${d} d`
  return new Date(date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
}

export function formatDate(date?: string | null): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("es-EC", { day: "numeric", month: "short", year: "numeric" })
}
