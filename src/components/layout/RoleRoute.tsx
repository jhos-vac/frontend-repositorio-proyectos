import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/store/authStore"

/** Restringe un grupo de rutas a ciertos roles (el servidor valida igualmente cada llamada). */
export function RoleRoute({ allow }: { allow: string[] }) {
  const role = useAuthStore((s) => s.user?.role?.name) || localStorage.getItem("role") || ""
  if (!allow.includes(role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
