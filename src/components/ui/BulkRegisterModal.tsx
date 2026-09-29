import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, 
  DialogTrigger, DialogDescription 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { UploadCloud, FileSpreadsheet, CheckCircle2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LoadingOverlay } from "@/components/ui/LoadingOverlay";
import * as XLSX from "xlsx"; 
import api from "@/api/axios";

export function BulkRegisterModal() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorAlert, setErrorAlert] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [teacherRoleId, setTeacherRoleId] = useState<string | null>(null);
  const [careersList, setCareersList] = useState<{id: string, name: string}[]>([]);

  useEffect(() => {
    if (open) {
      // 1. Obtener Rol
      api.get('/api/roles').then(res => {
        const roles = Array.isArray(res.data) ? res.data : (res.data.data || []);
        const role = roles.find((r: any) => r.name === 'TEACHER');
        if (role) setTeacherRoleId(role.id);
      });

      // 2. Obtener Carreras para traducir Nombres -> IDs
      api.get('/api/careers?limit=100').then(res => {
        const data = Array.isArray(res.data) ? res.data : (res.data.data || []);
        setCareersList(data);
      });
    }
  }, [open]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !teacherRoleId) return;

    setLoading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        let rawData: any[] = [];
        // Leer Excel o JSON
        if (file.name.endsWith(".xlsx") || file.name.endsWith(".xls")) {
          const bstr = evt.target?.result;
          const wb = XLSX.read(bstr, { type: "binary" });
          rawData = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
        } else {
          rawData = JSON.parse(evt.target?.result as string);
        }

        if (rawData.length === 0) throw new Error("El archivo está vacío");

        // Procesar fila por fila
        for (let i = 0; i < rawData.length; i++) {
          const item = rawData[i];
          
          // Lógica: Buscar ID usando el nombre de la carrera
          const nombreCarrera = (item.carrera || item.career || "").trim();
          const carreraEncontrada = careersList.find(
            c => c.name.toLowerCase() === nombreCarrera.toLowerCase()
          );

          if (!carreraEncontrada) {
            throw new Error(`Fila ${i + 1}: La carrera "${nombreCarrera}" no existe en el sistema. Revisa la ortografía.`);
          }

          const payload = {
            name: String(item.nombre || item.name || "").trim(),
            email: String(item.correo || item.email || "").trim(),
            password: String(item.password || item.contraseña || "").trim(),
            careerId: carreraEncontrada.id, // ¡Aquí usamos el ID encontrado!
            roleId: teacherRoleId
          };

          try {
            await api.post('/api/users/create-teacher', payload);
          } catch (apiErr: any) {
            const serverMsg = apiErr.response?.data?.message || "Error desconocido";
            const detail = Array.isArray(serverMsg) ? serverMsg.join(", ") : serverMsg;
            throw new Error(`Fila ${i + 1} (${payload.name}): ${detail}`);
          }
        }

        setOpen(false);
        setSuccess(true);
        setTimeout(() => setSuccess(false), 5000);

      } catch (error: any) {
        setErrorMessage(error.message || "Error al procesar archivo.");
        setErrorAlert(true);
        setTimeout(() => setErrorAlert(false), 8000);
      } finally {
        setLoading(false);
        e.target.value = ""; 
      }
    };

    file.name.endsWith(".json") ? reader.readAsText(file) : reader.readAsBinaryString(file);
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
                  <AlertDescription className="text-white font-medium text-base">Carga completada.</AlertDescription>
                </div>
              </Alert>
            </div>
          )}

          {errorAlert && (
            <div className="fixed top-5 right-5 z-[10002] animate-in slide-in-from-right fade-in duration-300">
              <Alert className="w-auto bg-red-600 border-red-500 text-white shadow-2xl flex items-center gap-3 pr-6 py-2">
                <AlertCircle className="h-4 w-4 text-slate-900" />
                <div>
                  <AlertTitle className="text-white font-bold text-xs">Error en Carga</AlertTitle>
                  <AlertDescription className="text-white text-[10px] max-w-xs">{errorMessage}</AlertDescription>
                </div>
              </Alert>
            </div>
          )}
          <LoadingOverlay isVisible={loading} message="Procesando registros..." />
        </>,
        document.body
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" className="w-full justify-start h-10 rounded-lg font-normal text-blue-100 hover:bg-white/10 hover:text-white gap-3 cursor-pointer">
            <UploadCloud className="w-5 h-5" />
            <span className="font-medium">Carga de Docentes  (Archivo)</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="bg-slate-50 border-slate-200 text-slate-900 sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-emerald-600 flex items-center gap-2 text-xl font-bold">
               <FileSpreadsheet className="w-6 h-6" /> Registro de Docentes
            </DialogTitle>
            <DialogDescription className="text-slate-500 text-xs">
              Sube un archivo con columnas: <b>nombre, correo, password, carrera</b> (nombre exacto).
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-10 hover:border-emerald-500 transition-colors bg-white group mt-4">
            <input type="file" accept=".xlsx, .xls, .json" onChange={handleFileUpload} className="hidden" id="bulk-file-name" />
            <label htmlFor="bulk-file-name" className="flex flex-col items-center cursor-pointer w-full text-center">
              <UploadCloud className="w-14 h-14 text-slate-500 group-hover:text-emerald-600 mb-3 transition-colors" />
              <p className="text-sm font-semibold text-slate-800">Subir Archivo</p>
            </label>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}