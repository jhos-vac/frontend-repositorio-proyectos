import { useAuthStore } from "@/store/authStore"

/** Rol del usuario en sesión (ADMIN | TEACHER | USER). USER = estudiante. */
export function useRole(): string {
  const role = useAuthStore((s) => s.user?.role?.name || s.userRole)
  return role || localStorage.getItem("role") || ""
}

export const useIsStudent = () => useRole() === "USER"
