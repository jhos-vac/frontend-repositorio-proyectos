import { useAuthStore } from "@/store/authStore"

/** Rol del usuario en sesión (ADMIN | TEACHER). Los estudiantes no tienen cuenta (BE-08). */
export function useRole(): string {
  const role = useAuthStore((s) => s.user?.role?.name || s.userRole)
  return role || localStorage.getItem("role") || ""
}

