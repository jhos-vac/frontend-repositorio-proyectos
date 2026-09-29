import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import api from '@/api/axios';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

const periodSchema = z.object({
  name: z.string().min(3, "El nombre es muy corto"),
});

interface Props {
  onSuccess: () => void;
}

export function CreatePeriodModal({ onSuccess }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm({ 
    resolver: zodResolver(periodSchema) 
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await api.post('/api/period', data);
      reset();
      setOpen(false);
      onSuccess(); 
    } catch (error) {
      console.error(error);
      alert("Error al crear. Verifica que eres ADMIN.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          type="button" 
          variant="outline" 
          size="sm" 
          className="h-8 px-3 text-brand-700 border-brand-200 bg-brand-50 hover:bg-brand-50 hover:text-brand-700 text-xs font-bold flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> Nuevo Periodo
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px] bg-slate-50 text-slate-900 border-slate-200">
        <DialogHeader>
          <DialogTitle className="text-brand-700">Nuevo Periodo Académico</DialogTitle>
          <DialogDescription className="text-slate-500 text-sm">
            Ingresa el nombre del periodo para registrarlo en el sistema.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label className="text-slate-600">Nombre del Periodo</Label>
            <Input 
              {...register('name')} 
              placeholder="Ej: Nov 2025 - Mar 2026" 
              className="bg-white border-slate-300 text-slate-900 placeholder:text-slate-500" 
            />
            {errors.name && <p className="text-red-600 text-xs">{String(errors.name.message)}</p>}
          </div>
          <div className="flex justify-end pt-2">
             <Button type="submit" className="bg-brand-700 hover:bg-brand-800 text-white" disabled={loading}>
               {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
               {loading ? "Guardando..." : "Crear Periodo"}
             </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}