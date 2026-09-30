import { useEffect, useState } from "react"
import { AuthLayout } from "@/components/layout/AuthLayout"
import { createPortal } from "react-dom" // Añadido para las alertas flotantes
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import api from "@/api/axios"
import { useNavigate } from "react-router-dom"
import { Eye, EyeOff, Check, AlertCircleIcon, CheckCircle2 } from "lucide-react" // Añadido CheckCircle2
import { Link } from "react-router-dom"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { LoadingOverlay } from "@/components/ui/LoadingOverlay"

type Career = {
  id: string
  name: string
}

// 1. VALIDACIÓN ESTRICTA DE DOMINIOS (MANTENIDA)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@((gmail|outlook|hotmail|yahoo|icloud|live|msn|me|zoho)\.com|(yahoo)\.es|sudamericano\.edu\.ec|.*\.(edu\.ec|gob\.ec|org\.ec|ec|edu|gob|gov))$/i;

const RegisterPage = () => {
  const navigate = useNavigate()
  
  // Estados del formulario
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [careerId, setCareerId] = useState('')
  const [level, setLevel] = useState('')
  
  // Estados de interfaz
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false) // Nuevo estado para éxito
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  // Estados de errores específicos
  const [errorAlert, setErrorAlert] = useState(false)
  const [errorMessage, setErrorMessage] = useState("") 
  const [emailError, setEmailError] = useState(false) 
  const [validationError, setValidationError] = useState(false)
  const [matchError, setMatchError] = useState(false)
  
  const [careers, setCareers] = useState<Career[]>([])
  
  // Requisitos de seguridad
  const hasMinLength = password.length >= 6;
  const hasNumber = /\d/.test(password);
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasSymbol = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const passwordsMatch = password === confirmPassword && password !== '';

  const isPasswordValid = hasMinLength && hasNumber && hasUpperCase && hasLowerCase && hasSymbol;

  useEffect(() => {
    const fetchCareers = async () => {
      try {
        const res = await api.get('/api/careers?limit=100')
        setCareers(res.data.data || res.data) 
      } catch (error) {
        console.error('Error al obtener las carreras', error)
      }
    }
    fetchCareers()
  }, [])

  const handleRegister = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 

    // Resetear estados de error antes de intentar
    setEmailError(false);
    setErrorAlert(false);

    // 2. VALIDAR FORMATO DE CORREO ANTES DE ENVIAR (Frontend)
    if (!EMAIL_REGEX.test(email)) {
        setErrorMessage("Correo incorrecto"); 
        setEmailError(true);
        setErrorAlert(true);
        setTimeout(() => setErrorAlert(false), 4000);
        return;
    }

    if (!isPasswordValid) {
      setValidationError(true);
      setTimeout(() => setValidationError(false), 3000);
      return; 
    }

    if (password !== confirmPassword) {
        setMatchError(true);
        setTimeout(() => setMatchError(false), 3000);
        return;
    }

    if (!careerId) {
      alert("Por favor, selecciona una carrera académica.");
      return;
    }
    if (!level) {
      alert("Por favor, selecciona tu nivel (1 a 4).");
      return;
    }

    setLoading(true) 
    
    try {
      await api.post('/api/auth/register', {
        name,
        email,
        password,
        careerId,
        level: Number(level)
      })
      
      // MOSTRAR MENSAJE DE ÉXITO
      setSuccess(true);
      
      // Esperar 2 segundos para redirigir
      setTimeout(() => {
        navigate("/login")
      }, 2000);

    } catch (error: any) {
      const backendMessage = error.response?.data?.message || "";
      console.error('Error en el registro:', backendMessage);

      // --- 3. LÓGICA DE DETECCIÓN DE ERRORES (VISUAL) ---
      const msgLower = backendMessage.toLowerCase();

      // Caso A: Correo duplicado
      if (msgLower.includes("ya se encuentra registrado") || msgLower.includes("already exists") || msgLower.includes("duplicado")) {
        setErrorMessage("Correo ya registrado");
        setEmailError(true);
      } 
      // Caso B: Errores de validación de dominio o inexistente (Backend reject)
      else if (
          msgLower.includes("no es válido") || 
          msgLower.includes("no existe") || 
          msgLower.includes("inválido") || 
          msgLower.includes("dominio") || 
          msgLower.includes("permitido")
      ) {
        setErrorMessage("Correo incorrecto");
        setEmailError(true);
      } 
      else {
        setErrorMessage("Ocurrió un error inesperado. Inténtalo de nuevo.");
      }

      setErrorAlert(true);
      setLoading(false);
      
      setTimeout(() => setErrorAlert(false), 4000);
    }
  }

  const PasswordRequirement = ({ met, text }: { met: boolean, text: string }) => (
    <div className={`flex items-center space-x-2 text-xs ${met ? "text-green-600 font-medium" : "text-slate-500"}`}>
      {met ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
      <span>{text}</span>
    </div>
  );

  return (
    <>
      {/* ALERTAS DINÁMICAS EN PORTAL (Para que siempre floten arriba) */}
      {createPortal(
        <>
          {/* MENSAJE DE ÉXITO */}
          {success && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-green-600 border-green-500 text-white shadow-2xl flex items-center gap-3 pr-6">
                <CheckCircle2 className="h-6 w-6 text-slate-900" />
                <div>
                  <AlertTitle className="text-white font-bold text-lg">Éxito</AlertTitle>
                  <AlertDescription className="text-white font-medium text-base">Registrado correctamente</AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {errorAlert && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-red-700 text-white border-none shadow-2xl flex items-center gap-3 pr-6 py-2">
                <AlertCircleIcon className="h-4 w-4 text-slate-900" />
                <div>
                  <AlertTitle className="text-white font-bold text-xs">Error</AlertTitle>
                  <AlertDescription className="text-white text-[10px]">{errorMessage}</AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {validationError && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-orange-600 text-white border-none shadow-2xl z-[100] py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">Seguridad Insuficiente</AlertTitle>
                <AlertDescription className="text-[10px]">La contraseña no cumple con los requisitos.</AlertDescription>
              </Alert>
            </div>
          )}

          {matchError && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-red-600 text-white border-none shadow-2xl z-[100] py-2">
                <AlertCircleIcon className="h-4 w-4" />
                <AlertTitle className="text-xs font-bold">Error de Contraseña</AlertTitle>
                <AlertDescription className="text-[10px]">Las contraseñas no coinciden.</AlertDescription>
              </Alert>
            </div>
          )}
        </>,
        document.body
      )}

      <AuthLayout>
        <form onSubmit={handleRegister} className="w-full space-y-5 text-slate-900">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Crear cuenta</h1>
            <p className="text-sm text-slate-500">Regístrate con tu correo institucional.</p>
          </div>

          {/* NOMBRE */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre Completo</Label>
            <Input
              required
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="bg-slate-100 border-slate-300 text-slate-900 placeholder-slate-400 focus:border-brand-600"
            />
          </div>

          {/* EMAIL */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              required
              type="email"
              placeholder="usuario@sudamericano.edu.ec"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if(emailError) setEmailError(false); 
              }}
              className={`bg-white text-slate-900 placeholder-slate-400 focus:border-brand-600 ${
                emailError ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"
              }`}
            />
            {emailError && <p className="text-[11px] text-red-600 font-bold ml-1">{errorMessage}</p>}
          </div>

          {/* CARRERA */}
          <div className="space-y-2">
            <Label>Carrera Académica</Label>
            <select 
              required
              className="w-full p-2 rounded-md bg-slate-100 text-slate-900 border border-slate-300 focus:border-brand-600 focus:outline-none text-sm" 
              value={careerId} 
              onChange={(e) => setCareerId(e.target.value)}
            >
              <option value="">Selecciona tu carrera...</option> 
              {careers.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* NIVEL */}
          <div className="space-y-2">
            <Label>Nivel</Label>
            <select
              required
              className="w-full p-2 rounded-md bg-slate-100 text-slate-900 border border-slate-300 focus:border-brand-600 focus:outline-none text-sm"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              <option value="">Selecciona tu nivel...</option>
              {[1, 2, 3, 4].map(n => (
                <option key={n} value={n}>Nivel {n}</option>
              ))}
            </select>
          </div>

          {/* CONTRASEÑA */}
          <div className="space-y-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input
                required
                type={showPassword ? "text" : "password"}
                placeholder="Mínimo 6 caracteres"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`bg-slate-100 border-slate-300 text-slate-900 pr-10 focus:border-brand-600 ${validationError ? "border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-brand-700"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* CONFIRMAR CONTRASEÑA */}
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Contraseña</Label>
            <div className="relative">
              <Input
                required
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repite la contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`bg-white border-slate-300 text-slate-900 pr-10 focus:border-brand-600 ${
                    matchError || (confirmPassword && !passwordsMatch) ? "border-red-500 focus:border-red-500" : ""
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-brand-700"
                tabIndex={-1}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <div className="mt-3 space-y-1.5 bg-white p-3 rounded-lg border border-slate-200">
              <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                <PasswordRequirement met={hasMinLength} text="Mín. 6 caracteres" />
                <PasswordRequirement met={hasUpperCase} text="Mayúscula" />
                <PasswordRequirement met={hasLowerCase} text="Minúscula" />
                <PasswordRequirement met={hasNumber} text="Número" />
                <PasswordRequirement met={hasSymbol} text="Símbolo" />
                <PasswordRequirement met={passwordsMatch} text="Coincidencia" />
              </div>
            </div>
          </div>

          <Button type="submit" className="w-full bg-brand-700 hover:bg-brand-600 text-white py-6 mt-4" disabled={loading || success}>
            {loading ? "Procesando registro..." : success ? "¡Registrado!" : "Registrarse"}
          </Button>
          
          <p className="text-center text-sm text-slate-500">
            ¿Ya tienes cuenta?{" "}
            <Link to="/login" className="text-brand-700 hover:underline font-medium">
              Inicia Sesión
            </Link>
          </p>
        </form>
      </AuthLayout>

      <LoadingOverlay isVisible={loading} message="Creando cuenta..." />
    </>
  )
}

export default RegisterPage;