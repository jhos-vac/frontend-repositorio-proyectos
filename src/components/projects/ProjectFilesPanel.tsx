import { useCallback, useEffect, useRef, useState } from "react"
import { ExternalLink, FileText, Github, Link2, Loader2, Lock, Play, Star, Trash2, Upload } from "lucide-react"
import api from "@/api/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiError, selectCls } from "@/lib/types"

type Doc = { id: string; kind: string; originalName: string; size: number; createdAt: string; uploadedBy?: { name: string } | null }
type LinkRow = { id: string; type: string; label: string | null; url: string; ref: string | null; isFinal: boolean }
type P = {
  id: string; createdBy: string | null; reviewStatus: string; status: string
  userProjects?: { userId: string }[]
}

const KIND: Record<string, string> = { informe: "Informe", presentacion: "Presentación", otro: "Otro" }
const TYPE: Record<string, string> = { repositorio: "Repositorio", demo: "Demo en línea", video: "Video", otro: "Otro" }
const MAX_MB = 20

const size = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
const hostOf = (u: string) => { try { return new URL(u).hostname.replace(/^www\./, "") } catch { return u } }

/** Motivo por el que el usuario no puede modificar archivos/enlaces (null = puede). Espeja la regla del servidor. */
export function filesLockReason(p: P, userId: string | null, isAdmin: boolean): string | null {
  if (isAdmin) return null
  const member = p.createdBy === userId || (p.userProjects || []).some((m) => m.userId === userId)
  if (!member) return "Solo el equipo del proyecto puede adjuntar archivos y enlaces."
  if (p.reviewStatus === "rejected") return "El proyecto fue rechazado: no se pueden adjuntar archivos ni enlaces."
  if (p.reviewStatus !== "approved") return "El proyecto está en revisión: podrás adjuntar archivos cuando sea aprobado."
  if (/complet|finaliz/i.test(p.status || "")) return "El proyecto está finalizado: ya no se pueden modificar sus archivos ni enlaces."
  return null
}

export function ProjectFilesPanel({ project, userId, isAdmin }: { project: P; userId: string | null; isAdmin: boolean }) {
  const [docs, setDocs] = useState<Doc[]>([])
  const [links, setLinks] = useState<LinkRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [err, setErr] = useState("")
  const [kind, setKind] = useState("informe")
  const [lt, setLt] = useState("repositorio"); const [lurl, setLurl] = useState(""); const [llabel, setLlabel] = useState("")
  const [lref, setLref] = useState(""); const [lfinal, setLfinal] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const lock = filesLockReason(project, userId, isAdmin)

  const load = useCallback(async () => {
    try {
      const [d, l] = await Promise.all([api.get<Doc[]>(`/api/projects/${project.id}/documents`), api.get<LinkRow[]>(`/api/projects/${project.id}/links`)])
      setDocs(d.data); setLinks(l.data)
    } catch (e) { setErr(apiError(e, "No se pudieron cargar los archivos.")) } finally { setLoading(false) }
  }, [project.id])
  useEffect(() => { setLoading(true); setErr(""); load() }, [load])

  const upload = async (file?: File) => {
    if (!file) return
    setErr("")
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") return setErr("Solo se permiten archivos PDF.")
    if (file.size > MAX_MB * 1048576) return setErr(`El PDF supera el máximo de ${MAX_MB} MB.`)
    const fd = new FormData(); fd.append("kind", kind); fd.append("file", file)
    setBusy(true); setProgress(0)
    try {
      await api.post(`/api/projects/${project.id}/documents`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (e) => setProgress(e.total ? Math.round((e.loaded / e.total) * 100) : null),
      })
      await load()
    } catch (e) { setErr(apiError(e)) } finally { setBusy(false); setProgress(null); if (fileRef.current) fileRef.current.value = "" }
  }

  const open = async (d: Doc, inline: boolean) => {
    setErr("")
    try {
      const res = await api.get(`/api/projects/${project.id}/documents/${d.id}/download`, { responseType: "blob" })
      const url = URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }))
      if (inline) window.open(url, "_blank", "noopener")
      else { const a = document.createElement("a"); a.href = url; a.download = d.originalName; a.click() }
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      // con responseType blob el mensaje del servidor llega como Blob
      let msg = "No se pudo descargar el archivo."
      try { msg = JSON.parse(await e.response.data.text()).message || msg } catch { /* sin detalle */ }
      setErr(msg)
    }
  }

  const removeDoc = async (d: Doc) => {
    if (!window.confirm(`¿Eliminar «${d.originalName}»?`)) return
    try { await api.delete(`/api/projects/${project.id}/documents/${d.id}`); await load() } catch (e) { setErr(apiError(e)) }
  }

  const addLink = async () => {
    setErr(""); setBusy(true)
    try {
      await api.post(`/api/projects/${project.id}/links`, {
        type: lt, url: lurl.trim(), label: llabel.trim() || undefined, ref: lt === "repositorio" ? lref.trim() || undefined : undefined, isFinal: lfinal,
      })
      setLurl(""); setLlabel(""); setLref(""); setLfinal(false); await load()
    } catch (e) { setErr(apiError(e)) } finally { setBusy(false) }
  }
  const removeLink = async (l: LinkRow) => {
    try { await api.delete(`/api/projects/${project.id}/links/${l.id}`); await load() } catch (e) { setErr(apiError(e)) }
  }

  const icon = (t: string, url: string) => (/github\.com/.test(url) ? <Github className="size-4" /> : t === "video" ? <Play className="size-4" /> : <Link2 className="size-4" />)

  return (
    <section className="space-y-5 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Archivos y enlaces">
      {err && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
      {lock && <p className="flex items-start gap-2 text-xs text-slate-500"><Lock className="mt-0.5 size-3.5 shrink-0" /> {lock}</p>}

      <div>
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-brand-600"><FileText className="size-4" /> Documentos (PDF)</h4>
        {loading ? <Loader2 className="size-4 animate-spin text-slate-400" /> : docs.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no hay documentos.</p>
        ) : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {docs.map((d) => (
              <li key={d.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <FileText className="size-4 text-brand-600" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900" title={d.originalName}>{d.originalName}</p>
                  <p className="text-[11px] text-slate-500">{KIND[d.kind] || d.kind} · {size(d.size)}{d.uploadedBy ? ` · ${d.uploadedBy.name}` : ""} · {new Date(d.createdAt).toLocaleDateString("es-EC")}</p>
                </div>
                <Button type="button" variant="outline" size="sm" onClick={() => open(d, true)}>Abrir</Button>
                <Button type="button" variant="outline" size="sm" onClick={() => open(d, false)}>Descargar</Button>
                {!lock && <Button type="button" variant="ghost" size="icon" aria-label={`Eliminar ${d.originalName}`} className="text-red-600 hover:bg-red-50" onClick={() => removeDoc(d)}><Trash2 className="size-4" /></Button>}
              </li>
            ))}
          </ul>
        )}
        {!lock && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select aria-label="Tipo de documento" className={`${selectCls} w-40`} value={kind} onChange={(e) => setKind(e.target.value)}>
              {Object.entries(KIND).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
            <Button type="button" size="sm" className="gap-1.5" disabled={busy} onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> {progress !== null ? `Subiendo ${progress}%` : "Subir PDF"}
            </Button>
            <span className="text-[11px] text-slate-500">Máximo {MAX_MB} MB por archivo.</span>
          </div>
        )}
      </div>

      <div>
        <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-brand-600"><Link2 className="size-4" /> Enlaces y producto final</h4>
        {!loading && links.length === 0 ? <p className="text-sm text-slate-500">Aún no hay enlaces.</p> : (
          <ul className="divide-y divide-slate-200 rounded-md border border-slate-200 bg-white">
            {links.map((l) => (
              <li key={l.id} className="flex flex-wrap items-center gap-2 px-3 py-2">
                <span className="text-brand-600">{icon(l.type, l.url)}</span>
                <div className="min-w-0 flex-1">
                  <a href={l.url} target="_blank" rel="noopener noreferrer nofollow" className="flex items-center gap-1 truncate text-sm font-medium text-brand-700 hover:underline">
                    {l.label || hostOf(l.url)} <ExternalLink className="size-3 shrink-0" />
                  </a>
                  <p className="truncate text-[11px] text-slate-500">{TYPE[l.type] || l.type} · {hostOf(l.url)}{l.ref ? ` · versión ${l.ref}` : ""}</p>
                </div>
                {l.isFinal && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-200"><Star className="size-3" /> Producto final</span>}
                {!lock && <Button type="button" variant="ghost" size="icon" aria-label={`Quitar enlace ${l.label || hostOf(l.url)}`} className="text-red-600 hover:bg-red-50" onClick={() => removeLink(l)}><Trash2 className="size-4" /></Button>}
              </li>
            ))}
          </ul>
        )}
        {!lock && (
          <div className="mt-3 grid gap-3 rounded-md border border-dashed border-slate-300 bg-white p-3 sm:grid-cols-2">
            <div className="space-y-1"><Label htmlFor="l-type">Tipo</Label>
              <select id="l-type" className={selectCls} value={lt} onChange={(e) => setLt(e.target.value)}>{Object.entries(TYPE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
            <div className="space-y-1"><Label htmlFor="l-url">Enlace (https)</Label>
              <Input id="l-url" value={lurl} onChange={(e) => setLurl(e.target.value)} placeholder={lt === "repositorio" ? "https://github.com/usuario/repositorio" : "https://…"} /></div>
            <div className="space-y-1"><Label htmlFor="l-label">Nombre (opcional)</Label>
              <Input id="l-label" value={llabel} maxLength={100} onChange={(e) => setLlabel(e.target.value)} /></div>
            {lt === "repositorio" && (
              <div className="space-y-1"><Label htmlFor="l-ref">Versión final (tag o commit)</Label>
                <Input id="l-ref" value={lref} maxLength={80} onChange={(e) => setLref(e.target.value)} placeholder="v1.0.0" /></div>
            )}
            <label className="flex items-center gap-2 text-sm text-slate-700 sm:col-span-2">
              <input type="checkbox" checked={lfinal} onChange={(e) => setLfinal(e.target.checked)} /> Es el registro del producto final
            </label>
            <div className="sm:col-span-2"><Button type="button" size="sm" disabled={busy || !lurl.trim()} onClick={addLink}>Agregar enlace</Button></div>
          </div>
        )}
      </div>
    </section>
  )
}
