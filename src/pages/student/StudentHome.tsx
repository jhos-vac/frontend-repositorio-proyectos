import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { ArrowRight, FolderOpen, History, Plus } from "lucide-react"
import api from "@/api/axios"
import { useAuthStore } from "@/store/authStore"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { MySummary } from "@/components/projects/MySummary"
import { ProjectCard } from "@/components/projects/ProjectCard"
import { greeting } from "@/lib/format"
import type { Paged, ProjectRow } from "@/lib/types"

/** Inicio del estudiante: solo lo suyo, sin cifras globales del semillero. */
export default function StudentHome() {
  const user = useAuthStore((s) => s.user)
  const [recent, setRecent] = useState<ProjectRow[]>([])

  useEffect(() => {
    api
      .get<Paged<ProjectRow>>("/api/projects", { params: { mine: true, limit: 3 } })
      .then((r) => setRecent(r.data?.data ?? []))
      .catch(() => setRecent([]))
  }, [])

  const firstName = (user?.name || "").split(" ")[0]

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            {greeting()}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Este es el resumen de tus proyectos.</p>
        </div>
        <Button asChild><Link to="/projects?nuevo=1"><Plus className="size-4" /> Registrar proyecto</Link></Button>
      </header>

      <MySummary />

      <section>
        <div className="mb-3 flex items-end justify-between gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Mis proyectos recientes</h2>
          <Link to="/mis-proyectos" className="inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:underline">
            Ver todos <ArrowRight className="size-4" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <EmptyState icon={FolderOpen} title="Aún no tienes proyectos" description="Registra uno nuevo o busca uno de ciclos pasados para continuarlo." />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {recent.map((p) => <ProjectCard key={p.id} project={p} showReview />)}
          </div>
        )}
      </section>

      <Link
        to="/ciclos-pasados"
        className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-brand-200 hover:shadow-md"
      >
        <span className="rounded-lg bg-brand-50 p-3 text-brand-700"><History className="size-5" /></span>
        <div className="flex-1">
          <p className="font-semibold text-slate-900">¿Buscas qué proyecto continuar?</p>
          <p className="text-sm text-slate-500">Explora los proyectos de ciclos pasados y filtra por tecnologías.</p>
        </div>
        <ArrowRight className="size-5 text-brand-700" />
      </Link>
    </div>
  )
}
