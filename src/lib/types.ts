export type Career = { id: string; name: string }
export type Role = { id: string; name: string }

export type AppUser = {
  id: string
  name: string
  email: string
  roleId: string
  careerId: string
  level?: number | null
  role?: Role
  career?: Career
  _count?: { createdProjects: number }
  createdAt?: string
}

export type ProjectRow = {
  id: string
  name: string
  description: string
  status: string
  reviewStatus: string
  reviewNote?: string | null
  level?: number | null
  academic_period?: string | null
  careerId: string
  createdBy: string | null
  createdAt: string
  parentId?: string | null
  rootId?: string | null
  branchNumber?: number
  parent?: { id: string; name: string } | null
  reviewedBy?: { id: string; name: string } | null
  _count?: { branches: number }
  user?: { id: string; name: string; email: string } | null
  career?: Career
  objectives?: string[]
  problems?: string | null
  summary?: string | null
  projectSkills?: { id: string; skill: { id: string; name: string } }[]
}

export type Paged<T> = {
  data: T[]
  meta: { total: number; totalPages: number; hasNextPage: boolean; hasPreviousPage: boolean; pagination: { page: number; limit: number } }
}

/** Mensaje de error legible que devuelve la API (o uno genérico). */
export function apiError(e: any, fallback = "Ocurrió un error. Inténtalo de nuevo."): string {
  const m = e?.response?.data?.message
  return Array.isArray(m) ? m.join(". ") : m || fallback
}

export const selectCls =
  "h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:opacity-60"
