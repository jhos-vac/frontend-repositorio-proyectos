import { Route, Routes, Navigate } from 'react-router-dom'
import LoginPage from './pages/LoginPage'
import UserProfile from './pages/UserProfile'
import Dashboard from './pages/Dashboard'
import ProyectPage from './pages/ProyectPage'
import ProjectDetailPage from './pages/ProjectDetailPage'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import { ProtectedRoute } from './components/layout/ProtectedRoute'
import UsersAdmin from './pages/admin/UsersAdmin'
import CareersAdmin from './pages/admin/CareersAdmin'
import AssignmentsAdmin from './pages/admin/AssignmentsAdmin'
import PeriodsAdmin from './pages/admin/PeriodsAdmin'
import ProjectsAdmin from './pages/admin/ProjectsAdmin'
import StudentsAdmin from './pages/StudentsAdmin'
import { RoleRoute } from './components/layout/RoleRoute'
import { GuestRoute } from './components/layout/GuestRoute'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  return (
    <Routes>
      {/* Sin sesión, ProtectedRoute manda al login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Acceso (públicas): con sesión abierta se salta al panel. No hay registro público (RN-01) */}
      <Route element={<GuestRoute />}>
        <Route path="/login" element={<LoginPage />} />
      </Route>
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Internas: requieren sesión y comparten menú lateral + barra superior */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProyectPage />} />
          <Route path="/projects/:id" element={<ProjectDetailPage />} />
          <Route path="/profile" element={<UserProfile />} />
          {/* BE-08: los estudiantes no tienen cuenta; los administra el docente */}
          <Route element={<RoleRoute allow={['TEACHER', 'ADMIN']} />}>
            <Route path="/estudiantes" element={<StudentsAdmin />} />
          </Route>
          <Route element={<RoleRoute allow={['ADMIN']} />}>
            <Route path="/admin/usuarios" element={<UsersAdmin />} />
            <Route path="/admin/carreras" element={<CareersAdmin />} />
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
