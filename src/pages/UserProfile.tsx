import api, { saveTokens } from "@/api/axios"
import { useEffect, useState, useRef } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import avatarPlaceholder from "../assets/avatar.png"
import { 
  Loader2, Mail, GraduationCap, Shield, Pencil, Camera, 
  KeyRound, Eye, EyeOff, Lock, Check, AlertCircle, Layers, UserCheck 
} from "lucide-react"
import { DialogTrigger, Dialog, DialogTitle, DialogContent, DialogHeader, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/store/authStore"
import { useLogout } from "@/lib/useLogout"

type UserData = {
  id: string
  name: string
  email: string
  careerId: string
  roleId: string
  image?: string
  level?: number | null
}

type Career = { id: string; name: string }
type Role = { id: string; name: string }

// Componente visual para los requisitos de contraseña
const PasswordRequirement = ({ met, text }: { met: boolean, text: string }) => (
  <div className={`flex items-center space-x-2 text-xs ${met ? "text-green-600 font-medium" : "text-slate-500"}`}>
    {met ? <Check size={14} /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
    <span>{text}</span>
  </div>
);

const UserProfile = () => {
  const navigate = useNavigate()
  const logout = useLogout()

  // === MAGIA: DETECTAR ORDEN DE CAMBIO FORZADO DESDE LA URL ===
  const [searchParams, setSearchParams] = useSearchParams()
  const forceChange = searchParams.get('forcePasswordChange') === 'true' || localStorage.getItem('needsPasswordChange') === 'true'

  const fileInputRef = useRef<HTMLInputElement>(null)
  const accessToken = localStorage.getItem('token')
  const userId = localStorage.getItem('id')

  const updateUserStore = useAuthStore((state) => state.updateUser)

  const [loading, setLoading] = useState(true)
  const [passwordChanged, setPasswordChanged] = useState(false)
  const [teacher, setTeacher] = useState<{ name: string; email: string } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [user, setUser] = useState<UserData | null>(null)
  const [careerName, setCareerName] = useState("Cargando...")
  const [roleName, setRoleName] = useState("Cargando...")
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [name, setName] = useState('') 

  // --- ESTADOS PARA CAMBIAR CONTRASEÑA ---
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false)
  const [oldPassword, setOldPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")
  const [showOldPass, setShowOldPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [showConfirmNewPass, setShowConfirmNewPass] = useState(false)
  
  const [errors, setErrors] = useState({
    oldPassword: "",
    newPassword: "",
    general: ""
  })

  // === ESTADO PARA EL MENSAJE VERDE DE ÉXITO ===
  const [successMessage, setSuccessMessage] = useState("")

  const baseUrl = api.defaults.baseURL?.replace(/\/$/, '') || '';

  // Validaciones de contraseña en tiempo real
  const hasMinLength = newPassword.length >= 6;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasLowerCase = /[a-z]/.test(newPassword);
  const hasNumber = /\d/.test(newPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(newPassword);
  const passwordsMatch = newPassword !== "" && newPassword === confirmNewPassword;
  const isPasswordValid = hasMinLength && hasUpperCase && hasLowerCase && hasNumber && hasSymbol && passwordsMatch;

  const loadProfile = async () => {
    if (!userId || !accessToken) return
    setLoading(true)
    try {
      const userRes = await api.get(`/api/users/${userId}`)
      const userData = userRes.data
      
      setUser(userData)
      updateUserStore(userData)

      const [careersRes, rolesRes] = await Promise.all([
        api.get("/api/careers?limit=1000"),
        api.get("/api/roles?limit=1000")
      ])

      const careersList = Array.isArray(careersRes.data) ? careersRes.data : (careersRes.data.data || []);
      const rolesList = Array.isArray(rolesRes.data) ? rolesRes.data : (rolesRes.data.data || []);

      const foundCareer = careersList.find((c: Career) => c.id === userData.careerId)
      const foundRole = rolesList.find((r: Role) => r.id === userData.roleId)

      setCareerName(foundCareer ? foundCareer.name : "Sin asignar")

      const rawRole = foundRole ? foundRole.name : "USER";
      let translatedRole = rawRole;

      if (rawRole === 'ADMIN') translatedRole = 'ADMINISTRADOR';
      if (rawRole === 'TEACHER') translatedRole = 'DOCENTE'; 
      if (rawRole === 'USER') translatedRole = 'ESTUDIANTE';

      setRoleName(translatedRole);
      if (rawRole === 'USER') {
        api.get('/api/assignments/my-teacher').then((r) => setTeacher(r.data?.teacher || null)).catch(() => setTeacher(null))
      }

    } catch (error) {
      console.error("Error cargando perfil:", error)
    } finally {
      setLoading(false)
    }
  }

  // === EFECTO PARA ABRIR AUTOMÁTICAMENTE EL MODAL SI ES OBLIGATORIO ===
  useEffect(() => {
    if (forceChange && !passwordChanged) {
      setIsPasswordDialogOpen(true);
    }
  }, [forceChange]);

  const handleEditUser = async (e?: React.FormEvent) => {
    if (e) e.preventDefault() 
    if (!name.trim()) return

    try {
      setLoading(true)
      const res = await api.patch(`/api/users/${userId}`, { name })
      
      updateUserStore(res.data)
      if (user) setUser({ ...user, name })
      
      setIsDialogOpen(false)
      setName('')

    } catch (error) {
      console.error('Error al editar el usuario', error)
    } finally {
      setLoading(false)
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setUploading(true)
    try {
      const response = await api.patch(`/api/users/${userId}/image`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (response.data) {
          updateUserStore(response.data); 
          setUser(response.data);         
      }

    } catch (error) {
      console.error("Error al subir imagen:", error)
    } finally {
      setUploading(false)
    }
  }

  // Función para guardar el cambio de contraseña
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({ oldPassword: "", newPassword: "", general: "" }) 

    if (oldPassword === newPassword) {
      setErrors(prev => ({ ...prev, newPassword: "La nueva contraseña debe ser diferente a la actual." }))
      return
    }

    if (!isPasswordValid) return
    
    setLoading(true)
    try {
      const pwRes = await api.patch(`/api/users/${userId}/change-password`, { 
        oldPassword,
        newPassword
      })
      // El servidor revoca las sesiones anteriores y devuelve tokens nuevos
      if (pwRes.data?.accessToken) saveTokens(pwRes.data.accessToken, pwRes.data.refreshToken)
      
      setIsPasswordDialogOpen(false)
      setOldPassword("")
      setNewPassword("")
      setConfirmNewPassword("")

      // === LIBERAR AL DOCENTE DE LA RESTRICCIÓN ===
      if (forceChange) {
        localStorage.setItem("needsPasswordChange", "false"); 
        searchParams.delete('forcePasswordChange'); 
        setSearchParams(searchParams);
        setPasswordChanged(true);
      }
      
      // Muestra el mensaje de éxito
      setSuccessMessage("Contraseña cambiada con éxito")
      setTimeout(() => {
        setSuccessMessage("")
      }, 3000) // Se oculta a los 3 segundos

    } catch (err: any) {
      const statusCode = err.response?.status;
      const backendMessage = err.response?.data?.message || "Error al verificar la contraseña.";
      
      if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
        setErrors(prev => ({ ...prev, oldPassword: Array.isArray(backendMessage) ? backendMessage[0] : "Contraseña antigua incorrecta." }))
      } else {
        setErrors(prev => ({ ...prev, general: "Ocurrió un error inesperado al intentar cambiar la contraseña." }))
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!accessToken || !userId) {
      navigate("/login")
      return
    }
    loadProfile()
  }, [userId, accessToken])

  return (
    <div className="w-full text-slate-900">

      <main className="flex items-center justify-center py-4">
        {loading && !user ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
            <span className="text-slate-500 text-sm">Cargando perfil...</span>
          </div>
        ) : (
          <Card className="w-full max-w-sm bg-white border-slate-200 shadow-xl overflow-hidden">
            <CardHeader className="flex flex-col items-center pb-2 relative pt-8">
              
              <div className="relative"> 
                <div 
                  className="group relative w-28 h-28 rounded-full overflow-hidden border-4 border-slate-200 mb-4 bg-slate-50 cursor-pointer shadow-2xl"
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
                      <Loader2 className="w-8 h-8 text-brand-600 animate-spin" />
                    </div>
                  ) : (
                    <>
                      <img 
                        src={user?.image ? (user.image.startsWith('http') ? user.image : `${baseUrl}${user.image}`) : avatarPlaceholder} 
                        alt="Avatar" 
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110 group-hover:opacity-40" 
                        onError={(e) => { e.currentTarget.src = avatarPlaceholder }}
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Camera className="w-8 h-8 text-white mb-1" />
                        <span className="text-[10px] text-white font-bold uppercase tracking-tighter">Cambiar foto</span>
                      </div>
                    </>
                  )}
                </div>
                
                <div 
                  className="absolute bottom-4 right-0 bg-brand-700 p-1.5 rounded-full border-2 border-slate-200 text-white cursor-pointer hover:bg-brand-600 transition-colors z-20 shadow-md"
                  onClick={(e) => {
                    e.stopPropagation(); 
                    fileInputRef.current?.click();
                  }}
                  title="Subir foto"
                >
                  <Camera size={14} />
                </div>
              </div>

              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*" 
                onChange={handleImageUpload} 
              />

              <div className="flex flex-row items-center gap-2 mt-2">
                <h2 className="text-2xl font-bold text-slate-900">{user?.name}</h2>
                
                <Dialog open={isDialogOpen} onOpenChange={(open) => {
                  setIsDialogOpen(open)
                  if(open) setName('') 
                }}>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-50 text-slate-500 hover:text-brand-700 transition-colors">
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  
                  <DialogContent className="bg-white border-slate-200 text-slate-900">
                    <DialogHeader>
                      <DialogTitle>Editar Nombre</DialogTitle>
                    </DialogHeader>
                    
                    <form onSubmit={handleEditUser}>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="userName">Nuevo Nombre</Label>
                          <Input 
                            id="userName"
                            value={name} 
                            placeholder={user?.name}
                            onChange={(e) => setName(e.target.value)} 
                            className="bg-slate-50 border-slate-200 focus:border-brand-600 placeholder:text-slate-500"
                            autoFocus 
                          />
                        </div>
                      </div>
                      
                      <DialogFooter>
                        <Button type="button" variant="ghost" className="hover:bg-slate-50" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                        <Button type="submit" className="bg-brand-700 hover:bg-brand-800" disabled={!name.trim() || loading}>
                          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Guardar Cambios"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              <span className="mt-3 text-brand-700 font-bold text-[10px] uppercase tracking-widest bg-brand-50 px-4 py-1 rounded-full border border-brand-200">
                {roleName}
              </span>

              {/* === BOTÓN Y MODAL PARA CAMBIAR CONTRASEÑA === */}
              <Dialog open={isPasswordDialogOpen} onOpenChange={(open) => {
                // MAGIA: Bloquea que el usuario lo cierre haciendo clic fuera o en la "X"
                if (forceChange && !open) return; 

                setIsPasswordDialogOpen(open);
                if (!open) {
                  setOldPassword(""); setNewPassword(""); setConfirmNewPassword(""); 
                  setErrors({ oldPassword: "", newPassword: "", general: "" });
                }
              }}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="mt-4 border-brand-200 text-brand-700 hover:bg-brand-50 text-xs h-8 gap-2 transition-colors cursor-pointer">
                    <KeyRound className="w-3.5 h-3.5" /> Cambiar Contraseña
                  </Button>
                </DialogTrigger>
                
                <DialogContent 
                  className="bg-white border-slate-200 text-slate-900 sm:max-w-md"
                  // MAGIA: Evita que presionen Escape o cliquen afuera para cerrar
                  onInteractOutside={(e) => { if (forceChange) e.preventDefault() }}
                  onEscapeKeyDown={(e) => { if (forceChange) e.preventDefault() }}
                >
                  <DialogHeader>
                    <DialogTitle className="text-brand-700">Cambiar Contraseña</DialogTitle>
                  </DialogHeader>

                  {/* MENSAJE ROJO OBLIGATORIO */}
                  {forceChange && (
                    <div className="bg-red-50 border border-red-500/50 p-3 rounded-md mt-2 mb-2 text-center animate-in fade-in zoom-in duration-300">
                      <AlertCircle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                      <p className="text-red-600 text-sm font-bold leading-tight">
                        Por seguridad, debes cambiar tu contraseña predeterminada para continuar usando la plataforma.
                      </p>
                    </div>
                  )}
                  
                  <form onSubmit={handleChangePassword}>
                    <div className="space-y-4 py-2">
                      
                      {/* Contraseña Antigua */}
                      <div className="space-y-1">
                        <Label className={errors.oldPassword ? "text-red-600" : ""}>Contraseña Antigua</Label>
                        <div className="relative group">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${errors.oldPassword ? 'text-red-600' : 'text-slate-500 group-focus-within:text-brand-600'}`} />
                          <Input 
                            type={showOldPass ? "text" : "password"} 
                            className={`pl-9 pr-10 bg-slate-50 text-slate-900 ${errors.oldPassword ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'}`}
                            value={oldPassword}
                            onChange={(e) => {
                              setOldPassword(e.target.value)
                              if (errors.oldPassword) setErrors(prev => ({ ...prev, oldPassword: "" }))
                            }}
                            required
                          />
                          <button type="button" onClick={() => setShowOldPass(!showOldPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" tabIndex={-1}>
                            {showOldPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.oldPassword && <p className="text-red-600 text-xs font-medium mt-1 animate-in fade-in">{errors.oldPassword}</p>}
                      </div>

                      {/* Nueva Contraseña */}
                      <div className="space-y-1">
                        <Label className={errors.newPassword ? "text-red-600" : ""}>Nueva Contraseña</Label>
                        <div className="relative group">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${errors.newPassword ? 'text-red-600' : 'text-slate-500 group-focus-within:text-brand-600'}`} />
                          <Input 
                            type={showNewPass ? "text" : "password"} 
                            className={`pl-9 pr-10 bg-slate-50 text-slate-900 ${errors.newPassword ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'}`}
                            value={newPassword}
                            onChange={(e) => {
                              setNewPassword(e.target.value)
                              if (errors.newPassword) setErrors(prev => ({ ...prev, newPassword: "" }))
                            }}
                            required
                          />
                          <button type="button" onClick={() => setShowNewPass(!showNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" tabIndex={-1}>
                            {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {errors.newPassword && <p className="text-red-600 text-xs font-medium mt-1 animate-in fade-in">{errors.newPassword}</p>}
                      </div>

                      {/* Confirmar Nueva Contraseña */}
                      <div className="space-y-1">
                        <Label className={confirmNewPassword && !passwordsMatch ? "text-red-600" : ""}>Confirmar Nueva Contraseña</Label>
                        <div className="relative group">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${confirmNewPassword && !passwordsMatch ? 'text-red-600' : 'text-slate-500 group-focus-within:text-brand-600'}`} />
                          <Input 
                            type={showConfirmNewPass ? "text" : "password"} 
                            className={`pl-9 pr-10 bg-slate-50 text-slate-900 ${confirmNewPassword && !passwordsMatch ? 'border-red-500 ring-1 ring-red-500 focus:ring-red-500 focus:border-red-500' : 'border-slate-200 focus:border-brand-600'}`}
                            value={confirmNewPassword}
                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                            required
                          />
                          <button type="button" onClick={() => setShowConfirmNewPass(!showConfirmNewPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900" tabIndex={-1}>
                            {showConfirmNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                        {confirmNewPassword && !passwordsMatch && (
                          <p className="text-red-600 text-xs font-medium mt-1 animate-in fade-in">Las contraseñas no coinciden</p>
                        )}
                      </div>

                      {/* Validaciones en vivo */}
                      <div className="bg-slate-50 p-3 rounded-md border border-slate-200 space-y-2 mt-2">
                        <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-2">
                          <AlertCircle className="w-3 h-3 text-brand-600" /> Requisitos de seguridad:
                        </p>
                        <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                          <PasswordRequirement met={hasMinLength} text="Mín. 6 caracteres" />
                          <PasswordRequirement met={hasUpperCase} text="Mayúscula" />
                          <PasswordRequirement met={hasLowerCase} text="Minúscula" />
                          <PasswordRequirement met={hasNumber} text="Número" />
                          <PasswordRequirement met={hasSymbol} text="Símbolo" />
                          <PasswordRequirement met={passwordsMatch} text="Coinciden" />
                        </div>
                      </div>

                      {errors.general && <p className="text-red-600 text-sm font-bold text-center mt-2 bg-red-50 py-2 rounded-md border border-red-500/20">{errors.general}</p>}
                    </div>
                    
                    <DialogFooter className="mt-4">
                      {/* MAGIA: Ocultamos el botón "Cancelar" si el cambio es obligatorio; en su lugar se puede salir */}
                      {!forceChange && (
                        <Button type="button" variant="ghost" className="hover:bg-slate-50" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
                      )}
                      {forceChange && (
                        <Button type="button" variant="ghost" className="text-slate-600 hover:bg-slate-50" onClick={logout}>Cerrar sesión</Button>
                      )}
                      <Button type="submit" className="bg-brand-700 hover:bg-brand-800" disabled={loading || !isPasswordValid || oldPassword === newPassword}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (forceChange ? "Actualizar Contraseña" : "Actualizar")}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              {/* === FIN NUEVO === */}

            </CardHeader>

            <CardContent className="space-y-3 mt-6 px-6 pb-8">
              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                <div className="bg-slate-50 p-2 rounded-lg text-brand-600"><Mail className="w-5 h-5" /></div>
                <div className="overflow-hidden">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Correo</p>
                  <p className="text-sm text-slate-800 truncate font-medium">{user?.email}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                <div className="bg-slate-50 p-2 rounded-lg text-violet-600"><GraduationCap className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Carrera</p>
                  <p className="text-sm text-slate-800 font-medium">{careerName}</p>
                </div>
              </div>

              {roleName === 'ESTUDIANTE' && (
                <>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                    <div className="bg-slate-50 p-2 rounded-lg text-brand-600"><Layers className="w-5 h-5" /></div>
                    <div>
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Nivel</p>
                      <p className="text-sm text-slate-800 font-medium">{user?.level ? `Nivel ${user.level}` : 'Sin asignar'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                    <div className="bg-slate-50 p-2 rounded-lg text-brand-600"><UserCheck className="w-5 h-5" /></div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">Docente asignado</p>
                      <p className="text-sm text-slate-800 font-medium truncate">{teacher ? teacher.name : 'Aún sin docente asignado'}</p>
                      {teacher && <p className="text-xs text-slate-500 truncate">{teacher.email}</p>}
                    </div>
                  </div>
                </>
              )}

              <div className="flex items-center gap-4 p-3 rounded-xl bg-slate-50 border border-slate-200/50">
                <div className="bg-slate-50 p-2 rounded-lg text-orange-600"><Shield className="w-5 h-5" /></div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">ROL</p>
                  <p className="text-sm text-slate-800 font-medium">{roleName}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* === NOTIFICACIÓN FLOTANTE (ESQUINITA VERDE SUPERIOR DERECHA) === */}
      {successMessage && (
        <div className="fixed top-6 right-6 z-50 flex items-center gap-3 bg-green-600 border border-green-500 text-white px-5 py-4 rounded-lg shadow-2xl animate-in slide-in-from-right-8 fade-in duration-300">
          <Check className="w-5 h-5 shrink-0" />
          <span className="text-sm font-bold tracking-wide">{successMessage}</span>
        </div>
      )}

    </div>
  )
}

export default UserProfile