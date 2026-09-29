import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

/** Rutas internas: sin sesión se redirige al login. */
export function ProtectedRoute() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn)
  const location = useLocation()
  const hasToken = !!localStorage.getItem("token")

  if (!isLoggedIn && !hasToken) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <Outlet />
}
