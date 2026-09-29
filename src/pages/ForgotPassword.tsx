import { useState } from "react";
import { AuthLayout } from "@/components/layout/AuthLayout"
import { Link } from "react-router-dom";
import api from "@/api/axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2, CheckCircle, AlertCircle } from "lucide-react";

// 1. VALIDACIÓN ULTRA-ESTRICTA (Misma lógica que el Registro)
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@((gmail|outlook|hotmail|yahoo|icloud|live|msn|me|zoho)\.com|(yahoo)\.es|sudamericano\.edu\.ec|.*\.(edu\.ec|gob\.ec|org\.ec|edu|gob|gov))$/i;

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    if (!email.trim()) {
       setError("El correo es obligatorio.");
       setLoading(false);
       return;
    }

    if (!EMAIL_REGEX.test(email)) {
       setError("Correo incorrecto");
       setLoading(false);
       return;
    }

    try {
      await api.post("/api/auth/forgot-password", { email });
      // TEXTO EXACTO SOLICITADO
      setMessage("Se envió el enlace de recuperación a tu correo");
    } catch (err: any) {
      if (err.response?.status === 429) { setError("Demasiados intentos. Espera un minuto."); setLoading(false); return; }
      const backendMsg = err.response?.data?.message || "Ocurrió un error. Intenta de nuevo.";
      // Si el backend dice que no se encuentra, mostramos "Correo incorrecto" o el mensaje del server
      setError(backendMsg.toLowerCase().includes("encontrado") ? "Correo incorrecto" : backendMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout>
      <Card className="w-full border-0 bg-transparent p-0 shadow-none text-slate-900">
        
        {/* LÓGICA CONDICIONAL: Si NO hay mensaje, muestra el formulario */}
        {!message ? (
          <>
            <CardHeader className="space-y-2 px-0 text-left">
              <CardTitle className="text-2xl font-bold text-brand-700">Recuperar Contraseña</CardTitle>
              <p className="text-slate-500 text-sm leading-relaxed">
                Ingresa tu correo para recibir un enlace de restablecimiento.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <div className="relative group">
                    <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors ${error ? "text-red-600" : "text-slate-500 group-focus-within:text-brand-600"}`} />
                    
                    <Input
                      type="email"
                      placeholder="correo@sudamericano.edu.ec"
                      className={`pl-10 bg-white text-slate-900 h-12 text-base transition-all ${
                        error 
                          ? "border-red-500 ring-1 ring-red-500 focus:border-red-500" 
                          : "border-slate-300 focus:border-brand-600"
                      }`}
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(""); 
                      }}
                      required
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-center gap-2 bg-red-50 border border-red-200 p-3 rounded-md animate-in fade-in duration-300">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0" />
                    <p className="text-red-600 text-sm font-bold">{error}</p>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-brand-700 hover:bg-brand-800 h-12 text-lg font-bold transition-all cursor-pointer"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    "Enviar Enlace"
                  )}
                </Button>

                <div className="text-center">
                  <Link 
                    to="/login" 
                    className="inline-flex items-center text-sm text-slate-500 hover:text-brand-700 transition-colors font-medium hover:underline"
                  >
                    <ArrowLeft className="mr-2 h- w-4" />
                    Volver al Login
                  </Link>
                </div>
              </form>
            </CardContent>
          </>
        ) : (
          /* 2. VISTA DE ÉXITO: Se quita todo lo anterior y solo sale el mensaje y volver */
          <CardContent className="py-12 text-center space-y-8 animate-in zoom-in-95 duration-300">
            <div className="flex flex-col items-center gap-4">
              <div className="bg-green-50 p-4 rounded-full">
                <CheckCircle className="h-16 w-16 text-green-600" />
              </div>
              <p className="text-green-600 text-xl font-bold px-4 leading-tight">
                {message}
              </p>
            </div>
            
            <div className="pt-4">
              <Link 
                to="/login" 
                className="inline-flex items-center justify-center w-full bg-slate-100 hover:bg-slate-200 text-slate-900 h-12 rounded-md font-bold transition-all gap-2"
              >
                <ArrowLeft className="h-5 w-5" />
                Volver al Login
              </Link>
            </div>
          </CardContent>
        )}
      </Card>
    </AuthLayout>
  );
}