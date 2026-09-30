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
import ProjectsAdmin from './pages/admin/ProjectsAdmin'
import { RoleRoute } from './components/layout/RoleRoute'
import { AppLayout } from './components/layout/AppLayout'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Acceso (públicas) */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />

      {/* Internas: requieren sesión y comparten menú lateral + barra superior */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/projects" element={<ProyectPage />} />
          <Route path="/projects/:id" element={<ProyectPage />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route element={<RoleRoute allow={['TEACHER', 'ADMIN']} />}>
            <Route path="/revision" element={<ReviewPage />} />
          </Route>
          <Route element={<RoleRoute allow={['ADMIN']} />}>
            <Route path="/admin/usuarios" element={<UsersAdmin />} />
            <Route path="/admin/asignaciones" element={<AssignmentsAdmin />} />
            <Route path="/admin/proyectos" element={<ProjectsAdmin />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}

export default App
