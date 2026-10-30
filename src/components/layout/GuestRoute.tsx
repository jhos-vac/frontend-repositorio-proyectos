import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

/** Rutas de acceso (login, registro): con sesión abierta se va directo al panel. */
export function GuestRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const hasToken = !!localStorage.getItem("token")

  if (isLoggedIn || hasToken) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
