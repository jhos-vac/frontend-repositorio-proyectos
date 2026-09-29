import { useState, useEffect } from "react";
import { createPortal } from "react-dom"; 
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { UserPlus, Eye, EyeOff, CheckCircle2, AlertCircle, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage 
} from "@/components/ui/form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import api from "@/api/axios";

// 1. REGEX ESTRICTA
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@((gmail|outlook|hotmail|yahoo|icloud|live|msn|me|zoho)\.com|(yahoo)\.es|sudamericano\.edu\.ec|.*\.(edu\.ec|gob\.ec|org\.ec|ec|edu|gob|gov))$/i;

const teacherSchema = z.object({
  name: z.string().min(3, "El nombre es muy corto"),
  email: z.string()
    .email("Formato de correo inválido")
    .regex(EMAIL_REGEX, "Correo incorrecto. (Dominio no permitido)"),
  password: z.string()
    .min(6, "Mínimo 6 caracteres")
    .regex(/[A-Z]/, "Falta mayúscula")
    .regex(/[a-z]/, "Falta minúscula")
    .regex(/[0-9]/, "Falta número")
    .regex(/[^A-Za-z0-9]/, "Falta símbolo"),
  confirmPassword: z.string().min(1, "Confirma tu contraseña"),
  careerId: z.string().min(1, "Selecciona una carrera"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export function CreateTeacherModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [careers, setCareers] = useState<{id: string, name: string}[]>([]);
  const [teacherRoleId, setTeacherRoleId] = useState<string | null>(null);

  const [success, setSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "", careerId: "" },
  });

  const watchPassword = form.watch("password") || "";
  const watchConfirm = form.watch("confirmPassword") || "";

  const hasMinLength = watchPassword.length >= 6;
  const hasUppercase = /[A-Z]/.test(watchPassword);
  const hasLowercase = /[a-z]/.test(watchPassword);
  const hasNumber = /[0-9]/.test(watchPassword);
  const hasSymbol = /[^A-Za-z0-9]/.test(watchPassword);
  const passwordsMatch = watchPassword !== "" && watchPassword === watchConfirm;
  const showMatchError = watchConfirm !== "" && watchPassword !== watchConfirm;

  useEffect(() => {
    if (open) {
      api.get('/api/careers?limit=100').then(res => {
         const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
         setCareers(data);
      }).catch(err => console.error(err));

      api.get('/api/roles').then(res => {
        const roles = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const role = roles.find((r: any) => r.name === 'TEACHER');
        if (role) setTeacherRoleId(role.id);
      });
    }
  }, [open]);

  // 2. FUNCIÓN PARA MOSTRAR ALERTA CUANDO FALLA LA VALIDACIÓN LOCAL (REGEX)
  const onInvalid = (errors: any) => {
    if (errors.email) {
      setErrorMessage("Correo incorrecto"); // Mensaje para la alerta de arriba
      setErrorAlert(true);
      setTimeout(() => setErrorAlert(false), 4000);
    }
  };

  const onSubmit = async (values: z.infer<typeof teacherSchema>) => {
    if (!teacherRoleId) return;
    setLoading(true);
    try {
      await api.post('/api/users/create-teacher', { ...values, roleId: teacherRoleId });
      setOpen(false);
      form.reset();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (error: any) {
      const msg = error.response?.data?.message || "Error al registrar";
      const msgLower = msg.toLowerCase();
      
      // 3. MANEJO DE ERRORES DEL BACKEND (Duplicado o inválido)
      if (msgLower.includes("ya se encuentra registrado") || msgLower.includes("already exists")) {
        form.setError("email", { type: "manual", message: "Correo ya registrado" });
        setErrorMessage("Correo ya registrado"); // Alerta de arriba
      } 
      else if (
        msgLower.includes("inválido") || 
        msgLower.includes("dominio") || 
        msgLower.includes("permitido") || 
        msgLower.includes("no existe")
      ) {
        form.setError("email", { type: "manual", message: "Correo incorrecto" });
        setErrorMessage("Correo incorrecto"); // Alerta de arriba
      }
      else {
        setErrorMessage(msg);
      }
      
      setErrorAlert(true);
      setTimeout(() => setErrorAlert(false), 4000);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (!loading) {
        // Pasamos onInvalid aquí también
        form.handleSubmit(onSubmit, onInvalid)();
      }
    }
  };

  return (
    <>
      {createPortal(
        <>
          {success && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-green-600 border-green-500 text-white shadow-2xl flex items-center gap-3 pr-6">
                <CheckCircle2 className="h-6 w-6 text-slate-900" />
                <div>
                  <AlertTitle className="text-white font-bold text-lg">Éxito</AlertTitle>
                  <AlertDescription className="text-white font-medium text-base">Docente registrado correctamente</AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {/* ALERTA ROJA EN LA ESQUINA */}
          {errorAlert && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-red-600 border-red-500 text-white shadow-2xl flex items-center gap-3 pr-6 py-2">
                <AlertCircle className="h-4 w-4 text-slate-900" />
                <div>
                  <AlertTitle className="text-white font-bold text-xs">Error</AlertTitle>
                  <AlertDescription className="text-white text-[10px]">{errorMessage}</AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          <LoadingOverlay isVisible={loading} message="Registrando docente..." />
        </>,
        document.body
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-10 rounded-lg font-normal text-blue-100 hover:bg-white/10 hover:text-white gap-3 cursor-pointer">
            <UserPlus className="w-5 h-5" />
            <span className="font-medium">Registrar Docente</span>
          </Button>
        </DialogTrigger>
        
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-brand-700 flex items-center gap-2">
              <UserPlus className="w-6 h-6" /> Nuevo Docente
            </DialogTitle>
          </DialogHeader>
          
          <Form {...form}>
            {/* AQUI ESTÁ LA CLAVE: Pasamos onInvalid como segundo argumento */}
            <form onSubmit={form.handleSubmit(onSubmit, onInvalid)} onKeyDown={handleKeyDown} className="space-y-4 py-2">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Nombre Completo</FormLabel>
                  <FormControl><Input placeholder="Nombre" className="bg-white border-slate-300 h-9 text-sm" {...field} /></FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />

              <FormField control={form.control} name="email" render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel className="text-xs">Correo Institucional</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="docente@sudamericano.edu.ec" 
                      type="email" 
                      // Borde ROJO si hay error
                      className={`bg-white h-9 text-sm ${fieldState.error ? "border-red-500 ring-1 ring-red-500" : "border-slate-300"}`} 
                      {...field} 
                    />
                  </FormControl>
                  {/* Mensaje ROJO abajo */}
                  <FormMessage className="text-[10px] text-red-600 font-bold" />
                </FormItem>
              )} />

              <div className="space-y-3">
                <FormField control={form.control} name="password" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          className="bg-white border-slate-300 pr-10 h-9 text-sm" 
                          {...field} 
                        />
                      </FormControl>
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                        {showPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormItem>
                )} />

                <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Confirmar Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          className="bg-white border-slate-300 pr-10 h-9 text-sm" 
                          {...field} 
                        />
                      </FormControl>
                      <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900">
                        {showConfirmPassword ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    </div>
                  </FormItem>
                )} />

                <div className="bg-white p-2 rounded border border-slate-200 grid grid-cols-2 gap-x-2 gap-y-1">
                   <p className="col-span-2 text-[9px] font-bold text-slate-500 uppercase mb-1 tracking-wider">Requisitos:</p>
                   <RequirementItem label="Mín. 6 caracteres" met={hasMinLength} />
                   <RequirementItem label="Mayúscula" met={hasUppercase} />
                   <RequirementItem label="Minúscula" met={hasLowercase} />
                   <RequirementItem label="Número" met={hasNumber} />
                   <RequirementItem label="Símbolo" met={hasSymbol} />
                   <RequirementItem label="Las contraseñas coinciden" met={passwordsMatch} error={showMatchError} />
                </div>
              </div>

              <FormField control={form.control} name="careerId" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs">Carrera Asignada</FormLabel>
                  <FormControl>
                    <select className="w-full p-2 rounded-md bg-white border border-slate-300 text-sm text-slate-900 h-9 outline-none focus:ring-1 focus:ring-brand-600" {...field}>
                      <option value="">Seleccionar carrera...</option>
                      {careers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </FormControl>
                  <FormMessage className="text-[10px]" />
                </FormItem>
              )} />

              <DialogFooter className="pt-4 gap-2">
                 <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="hover:bg-slate-100 text-slate-400 text-xs h-9">
                   Cancelar
                 </Button>
                 <Button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white min-w-[100px] text-xs h-9">
                   Registrar
                 </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function RequirementItem({ label, met, error }: { label: string; met: boolean; error?: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className={`w-2.5 h-2.5 rounded-full flex items-center justify-center transition-colors 
        ${met ? 'bg-green-500' : error ? 'bg-red-600' : 'bg-slate-100'}`}>
        {error ? <X className="w-2 h-2 text-slate-900" strokeWidth={4} /> : <Check className="w-2 h-2 text-slate-900" strokeWidth={4} />}
      </div>
      <span className={`text-[10px] transition-colors ${met ? 'text-green-600 font-medium' : error ? 'text-red-500 font-bold' : 'text-slate-500'}`}>
        {label}
      </span>
    </div>
  );
}