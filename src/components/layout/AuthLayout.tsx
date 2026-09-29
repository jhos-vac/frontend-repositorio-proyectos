import type { ReactNode } from "react"
import { FolderKanban, GitBranch, ShieldCheck } from "lucide-react"

const POINTS = [
  { icon: FolderKanban, text: "Todos los proyectos del instituto en un solo lugar" },
  { icon: GitBranch, text: "Cada avance queda registrado para darle continuidad" },
  { icon: ShieldCheck, text: "Acceso solo para la comunidad académica" },
]

/** Pantallas de acceso: panel de marca a la izquierda y formulario a la derecha. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-brand-900 p-10 text-blue-100 lg:flex">
        <div className="absolute -right-24 -top-24 size-72 rounded-full bg-white/5" />
        <div className="absolute -bottom-32 -left-16 size-96 rounded-full bg-white/5" />
        <div className="relative flex items-center gap-3">
          <img src="/its.png" alt="Logo ITS" className="size-11 rounded-xl bg-white p-1.5 object-contain" />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-white">RepoDigital</p>
            <p className="text-xs text-blue-200">ITS Sudamericano</p>
          </div>
        </div>

        <div className="relative max-w-md">
          <h2 className="text-3xl font-semibold leading-tight text-white">
            El semillero donde los proyectos siguen creciendo
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white">
                  <Icon className="size-4" />
                </span>
                {text}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-blue-300">Instituto Tecnológico Superior Sudamericano</p>
      </aside>

      <main className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <img src="/its.png" alt="Logo ITS" className="size-10 object-contain" />
            <p className="font-semibold text-slate-900">RepoDigital</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}
