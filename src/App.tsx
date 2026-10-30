import { Route, Routes, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import UserProfile from './pages/UserProfile'
import RegisterPage from './pages/RegisterPage'
import Dashboard from './pages/Dashboard'
import ProyectPage from './pages/ProyectPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import ReviewPage from './pages/ReviewPage'
import UsersAdmin from './pages/admin/UsersAdmin'
import AssignmentsAdmin from './pages/admin/AssignmentsAdmin'
import PeriodsAdmin from './pages/admin/PeriodsAdmin'
import ProjectsAdmin from './pages/admin/ProjectsAdmin'
import { RoleRoute } from './components/layout/RoleRoute'
import { GuestRoute } from './components/layout/GuestRoute'
import { AppLayout } from './components/layout/AppLayout'
import MyProjects from './pages/student/MyProjects'
import PastProjects from './pages/student/PastProjects'
import { useIsStudent } from './lib/useRole'
import { useParams, useSearchParams } from 'react-router-dom'
import { useState } from 'react'

/** El estudiante no usa el listado global: su entrada es "Mis proyectos". Sí conserva el detalle (/projects/:id) y el alta (?nuevo=1). */
function ProjectsEntry() {
  const isStudent = useIsStudent()
  const { id } = useParams()
  const [params] = useSearchParams()
  // Solo se decide al entrar: ProyectPage limpia ?nuevo=1 de la URL y no debe expulsar al estudiante a mitad del alta
  const [toMine] = useState(() => isStudent && !id && !params.get('nuevo'))
  return toMine ? <Navigate to="/mis-proyectos" replace /> : <ProyectPage />
}

function App() {
  return (
    <Routes>
      {/* Sin sesión, ProtectedRoute manda al login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Acceso (públicas): con sesión abierta se salta al panel */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Internas: requieren sesión y comparten menú lateral + barra superior */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProjectsEntry key="list" />} />
          <Route path="/projects/:id" element={<ProjectsEntry key="detail" />} />
          <Route element={<RoleRoute allow={['USER']} />}>
            <Route path="/mis-proyectos" element={<MyProjects />} />
            <Route path="/ciclos-pasados" element={<PastProjects />} />
          </Route>
          <Route path="/profile" element={<UserProfile />} />
          <Route element={<RoleRoute allow={['TEACHER', 'ADMIN']} />}>
            <Route path="/revision" element={<ReviewPage />} />
          </Route>
          <Route element={<RoleRoute allow={['ADMIN']} />}>
            <Route path="/admin/usuarios" element={<UsersAdmin />} />
            <Route path="/admin/asignaciones" element={<AssignmentsAdmin />} />
            <Route path="/admin/proyectos" element={<ProjectsAdmin />} />
            <Route path="/admin/periodos" element={<PeriodsAdmin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
