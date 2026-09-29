import { useState } from "react"
import { Outlet } from "react-router-dom"
import Sidebar from "@/components/SideBar"
import { Topbar } from "@/components/layout/Topbar"

/** Estructura común de todas las pantallas internas: menú lateral + barra superior + contenido. */
export function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <div className="min-h-screen bg-background text-foreground">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="md:pl-64">
        <Topbar onOpenMenu={() => setMenuOpen(true)} />
        <main className="mx-auto w-full max-w-[1400px] px-4 pb-10 pt-6 md:px-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
