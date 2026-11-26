/**
 * Dominios de correo institucional (RN-01). Deben coincidir con
 * INSTITUTIONAL_EMAIL_DOMAIN del backend; el servidor valida igualmente.
 */
export const INSTITUTIONAL_DOMAINS = (import.meta.env.VITE_INSTITUTIONAL_DOMAIN || "sudamericano.edu.ec")
  .split(",")
  .map((d: string) => d.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean)

export const isInstitutionalEmail = (email: string) =>
  INSTITUTIONAL_DOMAINS.includes((email.split("@")[1] ?? "").trim().toLowerCase())

export const INSTITUTIONAL_EMAIL_HINT = `El correo debe ser institucional (${INSTITUTIONAL_DOMAINS.map((d: string) => "@" + d).join(", ")}).`
