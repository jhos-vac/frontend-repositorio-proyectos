import { useCallback, useEffect, useState } from "react"
import { Loader2, Pencil, Plus, Search, Trash2, Users } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { LEVELS, ROLE_LABEL, levelLabel } from "@/lib/status"
import { apiError, selectCls, type AppUser, type Career, type Paged, type Role } from "@/lib/types"
import { useAuthStore } from "@/store/authStore"

type Form = { name: string; email: string; role: string; careerId: string; level: string; password: string }
const EMPTY: Form = { name: "", email: "", role: "USER", careerId: "", level: "1", password: "" }
const LIMIT = 10

const ROLE_PILL: Record<string, string> = {
  ADMIN: "bg-purple-50 text-purple-700 ring-purple-200",
  TEACHER: "bg-blue-50 text-blue-700 ring-blue-200",
  USER: "bg-emerald-50 text-emerald-700 ring-emerald-200",
}

/** Administración de integrantes: alta, edición, cambio de rol/carrera/nivel, reinicio de clave y baja. */
export default function UsersAdmin() {
  const me = useAuthStore((s) => s.user?.id)
  const [rows, setRows] = useState<AppUser[]>([])
  const [meta, setMeta] = useState<Paged<AppUser>["meta"] | null>(null)
  const [careers, setCareers] = useState<Career[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [page, setPage] = useState(1)
  const [fRole, setFRole] = useState(""); const [fCareer, setFCareer] = useState(""); const [fLevel, setFLevel] = useState("")
  const [search, setSearch] = useState(""); const [q, setQ] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<AppUser | null>(null)
  const [form, setForm] = useState<Form>(EMPTY)
  const [formErr, setFormErr] = useState("")
  const [deleting, setDeleting] = useState<AppUser | null>(null)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }

  useEffect(() => {
    api.get("/api/careers?limit=1000").then((r) => setCareers(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {})
    api.get("/api/roles?limit=1000").then((r) => setRoles(Array.isArray(r.data) ? r.data : r.data.data || [])).catch(() => {})
  }, [])
  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(1) }, 350); return () => clearTimeout(t) }, [search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const p = new URLSearchParams({ page: String(page), limit: String(LIMIT), order: "desc" })
      if (fRole) p.set("role", fRole); if (fCareer) p.set("careerId", fCareer); if (fLevel) p.set("level", fLevel); if (q) p.set("search", q)
      const res = await api.get<Paged<AppUser>>(`/api/users?${p}`)
      setRows(res.data.data); setMeta(res.data.meta)
    } catch (e) { flash(false, apiError(e, "No se pudo cargar los usuarios.")) } finally { setLoading(false) }
  }, [page, fRole, fCareer, fLevel, q])
  useEffect(() => { load() }, [load])

  const roleId = (name: string) => roles.find((r) => r.name === name)?.id
  const set = (k: keyof Form, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const openCreate = () => { setForm({ ...EMPTY, careerId: careers[0]?.id || "" }); setFormErr(""); setEditing(null); setDialog("create") }
  const openEdit = (u: AppUser) => {
    setEditing(u); setFormErr("")
    setForm({ name: u.name, email: u.email, role: u.role?.name || "USER", careerId: u.careerId, level: u.level ? String(u.level) : "1", password: "" })
    setDialog("edit")
  }

  const save = async () => {
    setFormErr("")
    if (!form.name.trim() || !form.email.trim()) return setFormErr("Nombre y correo son obligatorios.")
    if (dialog === "create" && !form.password) return setFormErr("Define una contraseña inicial.")
    setBusy(true)
    try {
      if (dialog === "create") {
        const body: any = { name: form.name.trim(), email: form.email.trim(), password: form.password, careerId: form.careerId }
        if (form.role === "USER") { body.level = Number(form.level); body.roleId = roleId("USER"); await api.post("/api/users", body) }
        else if (form.role === "TEACHER") await api.post("/api/users/create-teacher", body)
        else await api.post("/api/auth/register-admin", body)
        flash(true, "Usuario creado. Deberá cambiar su contraseña al ingresar.")
      } else if (editing) {
        const body: any = {
          name: form.name.trim(), email: form.email.trim(), roleId: roleId(form.role), careerId: form.careerId,
          level: form.role === "USER" ? Number(form.level) : null,
        }
        if (form.password) body.password = form.password
        await api.patch(`/api/users/${editing.id}/admin`, body)
        flash(true, "Cambios guardados.")
      }
      setDialog(null); await load()
    } catch (e) { setFormErr(apiError(e)) } finally { setBusy(false) }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/api/users/${deleting.id}`); flash(true, `«${deleting.name}» eliminado.`); setDeleting(null); await load() }
    catch (e) { flash(false, apiError(e)); setDeleting(null) } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Usuarios y roles</h1>
          <p className="mt-1 text-sm text-slate-500">Crea, edita y elimina integrantes, y reasigna su rol, carrera y nivel.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" /> Nuevo usuario</Button>
      </div>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar nombre o correo" className="pl-9" aria-label="Buscar" />
        </div>
        <select className={selectCls} value={fRole} onChange={(e) => { setFRole(e.target.value); setPage(1) }} aria-label="Rol">
          <option value="">Todos los roles</option>{Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={selectCls} value={fCareer} onChange={(e) => { setFCareer(e.target.value); setPage(1) }} aria-label="Carrera">
          <option value="">Todas las carreras</option>{careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select className={selectCls} value={fLevel} onChange={(e) => { setFLevel(e.target.value); setPage(1) }} aria-label="Nivel">
          <option value="">Todos los niveles</option>{LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : rows.length === 0 ? (
        <EmptyState icon={Users} title="Sin resultados" description="Ajusta los filtros o crea un usuario nuevo." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Usuario</th><th className="px-4 py-3">Rol</th><th className="px-4 py-3">Carrera</th><th className="px-4 py-3">Nivel</th><th className="px-4 py-3 text-right">Proyectos</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((u) => (
                <tr key={u.id}>
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><InitialsAvatar name={u.name} /><div className="min-w-0"><p className="truncate font-medium text-slate-900">{u.name}{u.id === me && <span className="ml-2 text-xs font-normal text-slate-400">(tú)</span>}</p><p className="truncate text-xs text-slate-500">{u.email}</p></div></div></td>
                  <td className="px-4 py-3"><span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${ROLE_PILL[u.role?.name || "USER"]}`}>{ROLE_LABEL[u.role?.name || "USER"]}</span></td>
                  <td className="px-4 py-3 text-slate-600">{u.career?.name}</td>
                  <td className="px-4 py-3 text-slate-600">{u.role?.name === "USER" ? levelLabel(u.level) : "—"}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{u._count?.createdProjects ?? 0}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Editar ${u.name}`} onClick={() => openEdit(u)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${u.name}`} disabled={u.id === me} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(u)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-500">
          <span>{meta.total} usuarios · página {page} de {meta.totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={!meta.hasPreviousPage} onClick={() => setPage((p) => p - 1)}>Anterior</Button>
            <Button variant="outline" size="sm" disabled={!meta.hasNextPage} onClick={() => setPage((p) => p + 1)}>Siguiente</Button>
          </div>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Nuevo usuario" : "Editar usuario"}</DialogTitle>
            <DialogDescription>{dialog === "create" ? "El usuario deberá cambiar la contraseña inicial al ingresar." : "Cambiar el rol o reiniciar la contraseña cierra sus sesiones activas."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-name">Nombre completo</Label><Input id="u-name" value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-email">Correo</Label><Input id="u-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></div>
            <div className="space-y-1.5"><Label htmlFor="u-role">Rol</Label>
              <select id="u-role" className={selectCls} value={form.role} onChange={(e) => set("role", e.target.value)}>
                {Object.entries(ROLE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select></div>
            <div className="space-y-1.5"><Label htmlFor="u-level">Nivel</Label>
              <select id="u-level" className={selectCls} value={form.level} disabled={form.role !== "USER"} onChange={(e) => set("level", e.target.value)}>
                {LEVELS.map((l) => <option key={l} value={l}>{levelLabel(l)}</option>)}
              </select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-career">Carrera</Label>
              <select id="u-career" className={selectCls} value={form.careerId} onChange={(e) => set("careerId", e.target.value)}>
                {careers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select></div>
            <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="u-pass">{dialog === "create" ? "Contraseña inicial" : "Nueva contraseña (opcional)"}</Label>
              <Input id="u-pass" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder={dialog === "edit" ? "Déjalo vacío para no cambiarla" : "Mínimo 6, con letras, números y símbolo"} /></div>
          </div>
          {formErr && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{formErr}</p>}
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDialog(null)}>Cancelar</Button>
            <Button onClick={save} disabled={busy}>{busy ? "Guardando…" : "Guardar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Eliminar usuario</DialogTitle>
            <DialogDescription>Vas a eliminar a «{deleting?.name}». Sus proyectos se conservan en el sistema, pero quedarán sin responsable. Esta acción no se puede deshacer.</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setDeleting(null)}>Cancelar</Button>
            <Button variant="destructive" disabled={busy} onClick={confirmDelete}>Eliminar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
