import { useEffect, useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { ArrowRight, CheckCircle2, FolderKanban, Loader2, Cpu, PlayCircle, FolderOpen, GitCommitHorizontal } from "lucide-react"
import api from "@/api/axios"
import { useAuthStore } from "@/store/authStore"
import { usePeriodStore } from "@/store/periodStore"
import { StatCard } from "@/components/common/StatCard"
import { StatusBadge } from "@/components/common/StatusBadge"
import { InitialsAvatar } from "@/components/common/InitialsAvatar"
import { ProgressBar } from "@/components/common/ProgressBar"
import { EmptyState } from "@/components/common/EmptyState"
import { projectProgress } from "@/lib/status"
import { greeting, timeAgo } from "@/lib/format"
import { useIsStudent } from "@/lib/useRole"
import StudentHome from "@/pages/student/StudentHome"

type Project = {
  id: string
  name: string
  description: string
  status: string
  startDate?: string | null
  endDate?: string | null
  academic_period?: string | null
  createdAt: string
  user?: { name: string } | null
  career?: { name: string } | null
  projectSkills?: { skill?: { id: string; name: string } }[]
}

type DashboardSummary = {
  total: number
  active: number
  done: number
  featured: Project[]
  recent: Project[]
  topSkills: { name: string; n: number }[]
}

const StaffDashboard = () => {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const period = usePeriodStore((s) => s.period)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [skillsTotal, setSkillsTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  // El servidor calcula totales, en curso, recientes y tecnologías (solo lo visible y del período)
  useEffect(() => {
    let cancelled = false
    Promise.allSettled([
      api.get<DashboardSummary>("/api/projects/dashboard", { params: period ? { period } : {} }),
      api.get("/api/skills?limit=1"),
    ])
      .then(([p, s]) => {
        if (cancelled) return
        if (p.status === "fulfilled") setSummary(p.value.data)
        if (s.status === "fulfilled") setSkillsTotal(s.value.data?.meta?.total ?? s.value.data?.data?.length ?? 0)
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [period])

  const stats = { total: summary?.total ?? 0, active: summary?.active ?? 0, done: summary?.done ?? 0 }
  const featured = summary?.featured ?? []
  const recent = summary?.recent ?? []
  const topSkills = summary?.topSkills ?? []

  const firstName = (user?.name || "").split(" ")[0]

  if (loading) {
    return (
      <div className="flex h-72 flex-col items-center justify-center text-slate-500">
        <Loader2 className="mb-2 size-8 animate-spin text-brand-600" />
        <p className="text-sm">Cargando el panel…</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          {greeting()}{firstName ? `, ${firstName}` : ""}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Así avanza el semillero{period ? ` en ${period}` : ""}.
        </p>
      </header>

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Proyectos registrados" value={stats.total} icon={FolderKanban} onClick={() => navigate("/projects")} />
        <StatCard label="En progreso" value={stats.active} icon={PlayCircle} tone="emerald" hint="Proyectos activos" />
        <StatCard label="Completados" value={stats.done} icon={CheckCircle2} tone="violet" hint="Proyectos finalizados" />
        <StatCard label="Tecnologías" value={skillsTotal} icon={Cpu} tone="amber" hint="En el catálogo" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
        <div className="space-y-8 min-w-0">
          <section>
            <SectionHeader eyebrow="En foco" title="Proyectos en curso" href="/projects" link="Ver todos los proyectos" />
            {featured.length === 0 ? (
              <EmptyState icon={FolderOpen} title="No hay proyectos en progreso" description="Cuando haya proyectos activos aparecerán aquí." />
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {featured.map((p) => {
                  const pct = projectProgress(p.startDate, p.endDate)
                  return (
                    <Link
                      key={p.id}
                      to={`/projects/${p.id}`}
                      className="group rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-brand-200 hover:shadow-md"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate rounded-md bg-brand-50 px-2 py-0.5 text-[11px] font-medium text-brand-800">
                          {p.career?.name || "Sin carrera"}
                        </span>
                        <StatusBadge status={p.status} startDate={p.startDate} endDate={p.endDate} />
                      </div>
                      <h3 className="mt-3 line-clamp-1 font-semibold text-slate-900 group-hover:text-brand-700">{p.name}</h3>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500">{p.description}</p>
                      <div className="mt-4 flex items-center gap-2">
                        <InitialsAvatar name={p.user?.name} />
                        <div className="min-w-0 flex-1 leading-tight">
                          <p className="truncate text-sm text-slate-800">{p.user?.name || "Sin responsable"}</p>
                          <p className="text-[11px] text-slate-500">{p.academic_period || "Sin período"}</p>
                        </div>
                        {pct !== null && <span className="text-xs font-medium text-slate-600">{pct}%</span>}
                      </div>
                      {pct !== null && <ProgressBar value={pct} className="mt-3" />}
                    </Link>
                  )
                })}
              </div>
            )}
          </section>

          <section>
            <SectionHeader eyebrow="Trabajo reciente" title="Proyectos recientes" href="/projects" link="Abrir listado completo" />
            {recent.length === 0 ? (
              <EmptyState icon={FolderOpen} title="Aún no hay proyectos" description="Registra el primero desde el botón «Registrar proyecto»." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="hidden grid-cols-[1fr_180px_130px_110px] gap-4 border-b border-slate-100 bg-slate-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 md:grid">
                  <span>Proyecto</span><span>Responsable</span><span>Estado</span><span className="text-right">Registrado</span>
                </div>
                {recent.slice(0, 6).map((p) => (
                  <Link
                    key={p.id}
                    to={`/projects/${p.id}`}
                    className="grid grid-cols-1 items-center gap-2 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-brand-50/50 md:grid-cols-[1fr_180px_130px_110px] md:gap-4"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{p.name}</p>
                      <p className="truncate text-xs text-slate-500">{p.career?.name || "Sin carrera"}</p>
                    </div>
                    <div className="flex min-w-0 items-center gap-2">
                      <InitialsAvatar name={p.user?.name} className="size-6 text-[10px]" />
                      <span className="truncate text-sm text-slate-700">{p.user?.name || "—"}</span>
                    </div>
                    <div><StatusBadge status={p.status} startDate={p.startDate} endDate={p.endDate} /></div>
                    <span className="text-xs text-slate-500 md:text-right">{timeAgo(p.createdAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="font-semibold text-slate-900">Tecnologías más usadas</h2>
            {topSkills.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Todavía no hay proyectos con tecnologías asignadas.</p>
            ) : (
              <ul className="mt-4 space-y-3">
                {topSkills.map((s) => (
                  <li key={s.name}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="text-slate-700">{s.name}</span>
                      <span className="text-slate-500">{s.n}</span>
                    </div>
                    <ProgressBar value={Math.round((s.n / topSkills[0].n) * 100)} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-slate-900">Actividad reciente</h2>
              <Link to="/projects" className="text-xs font-medium text-brand-700 hover:underline">Ver todo</Link>
            </div>
            <ul className="mt-3 divide-y divide-slate-100">
              {recent.slice(0, 5).map((p) => (
                <li key={p.id} className="flex gap-3 py-3">
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                    <GitCommitHorizontal className="size-4" />
                  </span>
                  <div className="min-w-0 text-sm leading-snug">
                    <p className="text-slate-800">
                      <span className="font-medium">{p.user?.name || "Alguien"}</span> registró <span className="font-medium">{p.name}</span>
                    </p>
                    <p className="text-xs text-slate-500">{timeAgo(p.createdAt)}</p>
                  </div>
                </li>
              ))}
              {recent.length === 0 && <li className="py-3 text-sm text-slate-500">Sin actividad todavía.</li>}
            </ul>
          </section>
        </aside>
      </div>
    </div>
  )
}

function SectionHeader({ eyebrow, title, href, link }: { eyebrow: string; title: string; href: string; link: string }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-700">{eyebrow}</p>
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      <Link to={href} className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
        {link} <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}

/** El estudiante ve solo el resumen de sus proyectos; docentes y admin, el panel general. */
const Dashboard = () => (useIsStudent() ? <StudentHome /> : <StaffDashboard />)

export default Dashboard
