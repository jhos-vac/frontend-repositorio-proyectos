import { Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
}

export const LoadingOverlay = ({ isVisible, message = "Cargando..." }: LoadingOverlayProps) => {
  if (!isVisible) return null;

  return (
    <div className={clsx(
      "fixed inset-0 z-[9999] flex items-center justify-center",
      "bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in"
    )}>
      <div className="bg-slate-50 p-8 rounded-2xl shadow-2xl flex flex-col items-center space-y-6 border border-slate-200">
        <div className="relative">
            <div className="absolute inset-0 bg-brand-600 blur-xl opacity-20 rounded-full"></div>
            <Loader2 className="h-16 w-16 animate-spin text-brand-600 relative z-10" />
        </div>
        
        <p className="text-slate-900 font-semibold text-xl animate-pulse tracking-wide">
          {message}
        </p>
      </div>
    </div>
  );
};