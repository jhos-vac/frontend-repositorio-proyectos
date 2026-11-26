import { useCallback, useEffect, useState } from "react"
import { GraduationCap, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import api from "@/api/axios"
import type { AxiosError } from "axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmptyState } from "@/components/common/EmptyState"
import { apiError, type Career } from "@/lib/types"

/** Administración de carreras: alta, edición y baja del catálogo del instituto. */
export default function CareersAdmin() {
  const [careers, setCareers] = useState<Career[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [dialog, setDialog] = useState<"create" | "edit" | null>(null)
  const [editing, setEditing] = useState<Career | null>(null)
  const [form, setForm] = useState<{ name: string }>({ name: "" })
  const [formErr, setFormErr] = useState("")
  const [deleting, setDeleting] = useState<Career | null>(null)

  const flash = (ok: boolean, text: string) => { setMsg({ ok, text }); setTimeout(() => setMsg(null), 4500) }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get("/api/careers?limit=1000")
      setCareers(Array.isArray(res.data) ? res.data : (res.data.data || []))
    } catch (e) { flash(false, apiError(e, "No se pudo cargar las carreras.")) } finally { setLoading(false) }
  }, [])
  useEffect(() => { load() }, [load])

  const openCreate = () => { setForm({ name: "" }); setFormErr(""); setEditing(null); setDialog("create") }
  const openEdit = (c: Career) => { setEditing(c); setForm({ name: c.name }); setFormErr(""); setDialog("edit") }

  const save = async () => {
    setFormErr("")
    if (!form.name.trim()) return setFormErr("El nombre es obligatorio.")
    setBusy(true)
    try {
      if (dialog === "create") await api.post("/api/careers", { name: form.name.trim() })
      else if (editing) await api.patch(`/api/careers/${editing.id}`, { name: form.name.trim() })
      flash(true, dialog === "create" ? "Carrera creada." : "Cambios guardados.")
      setDialog(null); await load()
    } catch (e) { setFormErr(apiError(e)) } finally { setBusy(false) }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setBusy(true)
    try { await api.delete(`/api/careers/${deleting.id}`); flash(true, `«${deleting.name}» eliminada.`); setDeleting(null); await load() }
    catch (e) {
      const status = (e as AxiosError).response?.status
      flash(false, status === 409
        ? "No se eliminó: la carrera tiene usuarios, estudiantes o proyectos. Reasígnalos primero."
        : apiError(e))
      setDeleting(null)
    } finally { setBusy(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Carreras</h1>
          <p className="mt-1 text-sm text-slate-500">Crea, edita y elimina las carreras del instituto.</p>
        </div>
        <Button onClick={openCreate} className="gap-1.5"><Plus className="size-4" /> Nueva carrera</Button>
      </div>

      {msg && <div role="status" className={`rounded-lg border px-4 py-2.5 text-sm ${msg.ok ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>{msg.text}</div>}

      {loading ? (
        <div className="flex h-32 items-center justify-center text-slate-500"><Loader2 className="mr-2 size-5 animate-spin" /> Cargando…</div>
      ) : careers.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Aún no hay carreras" description="Crea la primera para poder asignarla a usuarios y proyectos." />
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr><th className="px-4 py-3">Carrera</th><th className="px-4 py-3 text-right">Acciones</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {careers.map((c) => (
                <tr key={c.id}>
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-slate-900"><GraduationCap className="size-4 text-brand-600" /> {c.name}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" aria-label={`Editar ${c.name}`} onClick={() => openEdit(c)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" aria-label={`Eliminar ${c.name}`} className="text-red-600 hover:bg-red-50" onClick={() => setDeleting(c)}><Trash2 className="size-4" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={!!dialog} onOpenChange={(o) => !o && setDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{dialog === "create" ? "Nueva carrera" : "Editar carrera"}</DialogTitle>
            <DialogDescription>El nombre es el que verán al elegir carrera en su perfil.</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="c-name">Nombre</Label>
            <Input id="c-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
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
            <DialogTitle>Eliminar carrera</DialogTitle>
            <DialogDescription>{`Solo se elimina "${deleting?.name ?? ""}" si no tiene usuarios, estudiantes ni proyectos; si los tiene, se rechaza. Las asignaciones de docentes se borran junto con ella. No se puede deshacer.`}</DialogDescription>
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
