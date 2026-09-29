import { useState, useCallback } from "react"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useNavigate, Link } from "react-router-dom"
import api, { saveTokens } from "@/api/axios" 
import { useAuthStore } from "@/store/authStore"
import { Eye, EyeOff, AlertCircle } from "lucide-react"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"

// 1. REGEX ESTRICTA (Mantenida para bloquear gml.com, mail.com, etc.)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@((gmail|outlook|hotmail|yahoo|icloud|live|msn|me|zoho)\.com|(yahoo)\.es|sudamericano\.edu\.ec|.*\.(edu\.ec|gob\.ec|org\.ec|edu|gob|gov))$/i;

const LoginPage = () => {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  
  // Estados de error independientes (Solo aparecerán debajo de los inputs)
  const [emailError, setEmailError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [generalError, setGeneralError] = useState("")

  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    // Limpiar errores previos
    setEmailError("")
    setPasswordError("")
    setGeneralError("")
    
    // 2. VALIDACIONES LOCALES
    if (!email.trim()) {
        setEmailError("El correo es obligatorio");
        return;
    } 
    
    // Si el formato está mal (ej: gml.com), sale abajo del correo
    if (!EMAIL_REGEX.test(email)) {
        setEmailError("correo incorrecto");
        return;
    }

    if (!password.trim()) {
        setPasswordError("La contraseña es obligatoria");
        return;
    }

    setLoading(true)
    
    try {
      const res = await api.post("/api/auth/login", { email, password })
      
      // === CAMBIO AQUÍ: Capturamos needsPasswordChange del backend ===
      const { accessToken, refreshToken, userId, userRole, needsPasswordChange } = res.data

      saveTokens(accessToken, refreshToken)
      localStorage.setItem("id", userId)
      localStorage.setItem("role", userRole)
      localStorage.setItem("needsPasswordChange", String(needsPasswordChange)) // Guardamos la bandera
      
      login(accessToken, userId, userRole)
      
      // === CAMBIO AQUÍ: Redirección condicional de seguridad ===
      if (needsPasswordChange && userRole === 'TEACHER') {
        // Obligamos al docente a cambiar su contraseña
        navigate("/profile?forcePasswordChange=true")
      } else {
        // Alumnos y administradores pasan directo
        navigate("/dashboard")
      }
      
    } catch (err: any) {
      console.log(err)
      let backendMsg = "";
      
      if (err.response && err.response.data && err.response.data.message) {
        const rawMsg = err.response.data.message;
        backendMsg = Array.isArray(rawMsg) ? rawMsg[0] : rawMsg;
      } else {
        backendMsg = "Error de conexión";
      }

      const lowerMsg = backendMsg.toLowerCase();

      if (err.response?.status === 429) {
        setGeneralError("Demasiados intentos. Espera un minuto e inténtalo de nuevo.")
        setLoading(false)
        return
      }

      // 3. CLASIFICACIÓN DE ERRORES (Solo se muestran debajo del input respectivo)
      if (lowerMsg.includes("no registrado")) {
          setEmailError("correo no registrado"); // SALE AQUÍ DEBAJO
      } 
      else if (lowerMsg.includes("contraseña incorrecta") || lowerMsg.includes("password") || lowerMsg.includes("credential")) {
          setPasswordError("contraseña incorrecta"); // SALE AQUÍ DEBAJO
      } 
      else {
          setGeneralError(backendMsg);
      }
      
      setLoading(false) 
    } 
  }, [email, password, login, navigate])

  return (
    <AuthLayout>
      <div className="w-full space-y-6 text-slate-900">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Iniciar sesión</h1>
          <p className="mt-1 text-sm text-slate-500">Ingresa con tu cuenta institucional.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          
          {/* EMAIL */}
          <div>
            <Label className="mb-1.5 text-slate-700">Email</Label>
            <Input
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (emailError) setEmailError(""); // Limpiar al escribir
              }}
              disabled={loading}
              // Borde ROJO si hay error
              className={`bg-slate-100 text-slate-900 placeholder-slate-400 focus:ring-brand-600 ${
                  emailError ? "border-red-500 focus:border-red-500 ring-1 ring-red-500" : "border-slate-300 focus:border-brand-600"
              }`}
            />
            {/* MENSAJE DEBAJO DEL CORREO */}
            {emailError && (
                <p className="mt-1 text-red-600 font-bold text-[11px] ml-1 animate-in fade-in">
                  {emailError}
                </p>
            )}
          </div>

          {/* PASSWORD */}
          <div>
            <Label className="mb-1.5 text-slate-700">Contraseña</Label>
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                value={password}
                onChange={(e) => {
                    setPassword(e.target.value);
                    if (passwordError) setPasswordError(""); // Limpiar al escribir
                }}
                className={`placeholder-slate-400 focus:ring-brand-600 ${
                    passwordError ? "border-red-500 focus:border-red-500 ring-1 ring-red-500" : "border-slate-300 focus:border-brand-600"
                }`}
              />
              
              <button
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-400"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {/* MENSAJE DEBAJO DE LA CONTRASEÑA */}
            {passwordError && (
                <p className="mt-1 text-red-600 font-bold text-[11px] ml-1 animate-in fade-in">
                  {passwordError}
                </p>
            )}
          </div>

          <div className="flex justify-end">
            <Link 
              to="/forgot-password" 
              className="text-xs font-medium text-brand-700 hover:text-brand-800 hover:underline"
            >
              ¿Olvidaste tu contraseña?
            </Link>
          </div>

          <Button
            type="submit" 
            disabled={loading} 
            className="mt-2 h-10 w-full"
          >
            {loading ? "Cargando..." : "Iniciar Sesión"}
          </Button>
        </form>
        
        {/* Error General (Solo si no es de correo o clave) */}
        {generalError && (
             <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded mt-2">
               <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
               <p className="text-red-600 text-xs font-medium">{generalError}</p>
             </div>
        )}

        <p className="text-center text-sm text-slate-500">
          ¿No tienes cuenta?{" "}
          <Link to="/register" className="text-brand-700 hover:underline">
            Regístrate
          </Link>
        </p>

      </div>
      <LoadingOverlay isVisible={loading} message="Iniciando sesión..." />
    </AuthLayout>
  )
}

export default LoginPage;