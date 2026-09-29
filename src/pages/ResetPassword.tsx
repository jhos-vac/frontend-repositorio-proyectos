import { useState, useEffect } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout"
import { useParams, Link } from "react-router-dom";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Lock, Loader2, Eye, EyeOff, CheckCircle, XCircle, ArrowRight, Check, AlertCircle } from "lucide-react";

// Componente visual para los ítems de la lista
const ValidationItem = ({ fulfilled, text }: { fulfilled: boolean; text: string }) => (
  <div className={`flex items-center space-x-2 text-xs transition-colors duration-200 ${fulfilled ? "text-green-600 font-medium" : "text-slate-500"}`}>
    {fulfilled ? <Check className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-300" />}
    <span>{text}</span>
  </div>
);

export default function ResetPassword() {
  const { token } = useParams();
  
  // Estados de los campos
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Estados de validación (Ahora incluye 'match' para coincidencia)
  const [validations, setValidations] = useState({
    length: false,
    upper: false,
    lower: false,
    number: false,
    symbol: false,
    match: false, // NUEVO: Verifica que coincidan
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // EFECTO: Actualiza las validaciones en tiempo real
  useEffect(() => {
    setValidations({
      length: password.length >= 6, 
      upper: /[A-Z]/.test(password),
      lower: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      symbol: /[$@$!%*?&._-]/.test(password),
      match: password !== "" && password === confirmPassword, // Verifica coincidencia
    });
  }, [password, confirmPassword]);

  // Verificar si TODO está cumplido
  const isPasswordValid = Object.values(validations).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); // Permite que el ENTER funcione
    
    // BLOQUEO ESTRICTO:
    // Si la lista de requisitos no está toda en verde, NO enviamos.
    if (!isPasswordValid) {
      if (!validations.match) {
        setError("Las contraseñas no coinciden.");
      } else {
        setError("La contraseña no cumple con todos los requisitos de seguridad.");
      }
      return;
    }

    setLoading(true);
    setError("");

    try {
      await api.post(`/api/auth/reset-password/${token}`, { password });
      setSuccess(true); 
    } catch (err: any) {
      setError(err.response?.data?.message || "El enlace ha expirado o es inválido.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full border-0 bg-transparent p-0 shadow-none text-slate-900">
        <CardHeader className="px-0">
          <CardTitle className="text-slate-900 text-2xl text-left">
            {success ? "¡Éxito!" : "Restablecer Contraseña"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            // --- PANTALLA DE ÉXITO ---
            <div className="text-center space-y-6 py-4 animate-in fade-in zoom-in duration-300">
              <div className="flex justify-center">
                <div className="bg-green-50 p-4 rounded-full border-2 border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]">
                    <CheckCircle className="h-16 w-16 text-green-600" />
                </div>
              </div>
              <div className="space-y-2">
                <h3 className="text-green-600 text-xl font-bold">Contraseña Restablecida</h3>
                <p className="text-slate-400">Tu contraseña ha sido actualizada correctamente.</p>
              </div>
              <Button asChild className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg font-bold shadow-lg shadow-green-900/20">
                <Link to="/login">
                  Ir a Iniciar Sesión <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          ) : (
            // --- FORMULARIO ---
            <form onSubmit={handleSubmit} className="space-y-5">
              
              <div className="space-y-4">
                
                {/* 1. INPUT NUEVA CONTRASEÑA */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-brand-600 transition-colors" />
                  <Input 
                    type={showPass ? "text" : "password"} 
                    placeholder="Nueva contraseña" 
                    className="pl-10 pr-10 bg-white border-slate-300 text-slate-900 focus:border-brand-600 transition-all h-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPass(!showPass)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 transition-colors"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 2. INPUT CONFIRMAR CONTRASEÑA */}
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500 group-focus-within:text-brand-600 transition-colors" />
                  <Input 
                    type={showConfirmPass ? "text" : "password"} 
                    placeholder="Confirmar contraseña" 
                    className={`pl-10 pr-10 bg-white border-slate-300 text-slate-900 focus:border-brand-600 transition-all h-11 ${
                      confirmPassword && !validations.match ? "border-red-500 focus:border-red-500" : ""
                    }`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowConfirmPass(!showConfirmPass)} 
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-900 p-1 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* 3. VERIFICADOR VISUAL (Ahora incluye "Coinciden") */}
                <div className="bg-white p-3 rounded-md border border-slate-200 space-y-2">
                   <p className="text-xs text-slate-500 font-semibold mb-1 flex items-center gap-2">
                     <AlertCircle className="w-3 h-3" /> Requisitos de seguridad:
                   </p>
                   <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                      <ValidationItem fulfilled={validations.length} text="Mín. 6 caracteres" />
                      <ValidationItem fulfilled={validations.upper} text="Mayúscula" />
                      <ValidationItem fulfilled={validations.lower} text="Minúscula" />
                      <ValidationItem fulfilled={validations.number} text="Número" />
                      <ValidationItem fulfilled={validations.symbol} text="Símbolo" />
                      {/* NUEVO ITEM: COINCIDENCIA */}
                      <ValidationItem fulfilled={validations.match} text="Las contraseñas coinciden" />
                   </div>
                </div>

              </div>

              {error && (
                <div className="bg-red-50 p-3 rounded-md border border-red-200 flex items-center gap-2 justify-center">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <p className="text-red-600 text-sm font-medium">{error}</p>
                </div>
              )}
              
              {/* BOTÓN: 
                  Ya NO se deshabilita por validación visual para permitir que el ENTER
                  intente enviar y muestre el error si falta algo. 
                  Solo se deshabilita si está cargando. 
              */}
              <Button 
                type="submit" 
                className="w-full bg-brand-700 hover:bg-brand-800 h-11 text-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed" 
                disabled={loading}
              >
                {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : "Cambiar Contraseña"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </AuthLayout>
  );
}