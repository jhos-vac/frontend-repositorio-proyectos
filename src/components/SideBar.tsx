import { useEffect, useState } from "react"
import { NavLink, useNavigate, Link } from "react-router-dom"
import type { LucideIcon } from "lucide-react"
import { LayoutDashboard, FolderKanban, UserRound, LogOut, X, Plus } from "lucide-react"
import api from "@/api/axios"
import { useAuthStore } from "@/store/authStore"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import {
  Dialog, DialogClose, DialogContent, DialogTrigger,
  DialogDescription, DialogHeader, DialogFooter, DialogTitle,
} from "./ui/dialog"
import { Button } from "@/components/ui/button"
import { CreateTeacherModal } from "./ui/CreateTeacherModal"
import { BulkRegisterModal } from "./ui/BulkRegisterModal"

const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Administrador",
  TEACHER: "Docente",
  USER: "Lector",
}

type Props = { open: boolean; onClose: () => void }

const Sidebar = ({ open, onClose }: Props) => {
  const userId = useAuthStore((s) => s.userId)
  const user = useAuthStore((s) => s.user)
  const setUser = useAuthStore((s) => s.setUser)
  const isLogged = useAuthStore((s) => s.isLoggedIn)
  const logoutStore = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  const [projectCount, setProjectCount] = useState<number | null>(null)

  const baseUrl = api.defaults.baseURL?.replace(/\/$/, "") || ""
  const roleName: string | undefined = user?.role?.name
  const isAdmin = roleName === "ADMIN"
  const canCreate = isAdmin || roleName === "TEACHER"

  useEffect(() => {
    if (!isLogged || !userId) return
    api.get(`/api/users/${userId}`).then((res) => setUser(res.data)).catch(() => {})
    api.get("/api/projects?limit=1").then((res) => setProjectCount(res.data?.meta?.total ?? null)).catch(() => {})
  }, [isLogged, userId, setUser])

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("auth-storage")
    logoutStore()
    navigate("/login")
  }

  const image = user?.image ? (user.image.startsWith("http") ? user.image : `${baseUrl}${user.image}`) : null

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-slate-900/50 md:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-brand-900 text-blue-100 transition-transform duration-200 md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <img src="/its.png" alt="Logo ITS" className="size-9 rounded-lg bg-white p-1 object-contain" />
          <div className="leading-tight">
            <p className="text-base font-semibold text-white">RepoDigital</p>
            <p className="text-[11px] text-blue-200">ITS Sudamericano</p>
          </div>
          <button onClick={onClose} className="ml-auto rounded p-1 text-blue-200 hover:bg-white/10 md:hidden" aria-label="Cerrar menú">
            <X className="size-5" />
          </button>
        </div>

        <nav className="custom-scrollbar flex-1 space-y-6 overflow-y-auto px-3 py-5">
          <div>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300">Espacio académico</p>
            <div className="space-y-1">
              <NavItem to="/dashboard" icon={LayoutDashboard} label="Inicio" onClick={onClose} />
              <NavItem to="/projects" icon={FolderKanban} label="Proyectos" count={projectCount} onClick={onClose} />
              <NavItem to="/profile" icon={UserRound} label="Mi perfil" onClick={onClose} />
            </div>
          </div>

          {isAdmin && (
            <div>
              <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-blue-300">Administración</p>
              <div className="space-y-1" onClick={onClose}>
                <CreateTeacherModal />
                <BulkRegisterModal />
              </div>
            </div>
          )}

          {canCreate && (
            <div className="rounded-xl bg-white/10 p-4">
              <p className="text-sm font-semibold text-white">¿Una nueva iniciativa?</p>
              <p className="mt-1 text-xs text-blue-200">Registra el proyecto y asigna las tecnologías.</p>
              <Button
                onClick={() => { onClose(); navigate("/projects?nuevo=1") }}
                className="mt-3 h-9 w-full gap-1.5 bg-white text-brand-900 hover:bg-blue-50"
              >
                <Plus className="size-4" /> Registrar proyecto
              </Button>
            </div>
          )}
        </nav>

        {isLogged && (
          <div className="flex items-center gap-3 border-t border-white/10 px-4 py-4">
            <Link to="/profile" onClick={onClose} className="flex min-w-0 flex-1 items-center gap-3">
              {image ? (
                <img src={image} alt="Perfil" className="size-9 rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = "none" }} />
              ) : (
                <InitialsAvatar name={user?.name} className="size-9 bg-white/15 text-white" />
              )}
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-sm font-medium text-white">{user?.name || "Cargando…"}</span>
                <span className="block truncate text-[11px] text-blue-200">{ROLE_LABEL[roleName || ""] || ""}</span>
              </span>
            </Link>

            <Dialog>
              <DialogTrigger asChild>
                <button className="rounded-md p-2 text-blue-200 hover:bg-white/10 hover:text-white" aria-label="Cerrar sesión" title="Cerrar sesión">
                  <LogOut className="size-4" />
                </button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Cerrar sesión</DialogTitle>
                  <DialogDescription>¿Deseas salir de tu cuenta?</DialogDescription>
                </DialogHeader>
                <DialogFooter className="gap-2">
                  <DialogClose asChild><Button variant="ghost">Cancelar</Button></DialogClose>
                  <Button variant="destructive" onClick={handleLogout}>Cerrar sesión</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </aside>
    </>
  )
}

const NavItem = ({ to, icon: Icon, label, count, onClick }: {
  to: string; icon: LucideIcon; label: string; count?: number | null; onClick?: () => void
}) => (
  <NavLink
    to={to}
    onClick={onClick}
    className={({ isActive }) =>
      `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
        isActive ? "bg-white/15 font-medium text-white" : "text-blue-100 hover:bg-white/10 hover:text-white"
      }`
    }
  >
    <Icon className="size-[18px]" />
    <span className="flex-1">{label}</span>
    {typeof count === "number" && (
      <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11px] font-medium text-white">{count}</span>
    )}
  </NavLink>
)

export default Sidebar
