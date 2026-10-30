import { useNavigate } from "react-router-dom"
import api, { clearSession } from "@/api/axios"
import { useAuthStore } from "@/store/authStore"

/**
 * Cierra la sesión: la revoca en el servidor (best-effort) y limpia todo lo
 * local YA, antes de ir al login (si no, GuestRoute ve el token y regresa al panel).
 */
export function useLogout() {
  const navigate = useNavigate()
  const logoutStore = useAuthStore((s) => s.logout)

  return () => {
    const token = localStorage.getItem("token")
    api.post("/api/auth/logout", null, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {})
    clearSession()
    logoutStore()
    navigate("/login")
  }
}
