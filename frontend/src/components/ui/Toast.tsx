import React from 'react';
import { CheckCircle2, XCircle, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { clsx } from 'clsx';

const iconMap = {
  success: <CheckCircle2 className="w-5 h-5 text-emerald-400" />,
  error: <XCircle className="w-5 h-5 text-rose-400" />,
  info: <Info className="w-5 h-5 text-blue-400" />,
};

const bgMap = {
  success: 'border-emerald-500/20 bg-emerald-500/10',
  error: 'border-rose-500/20 bg-rose-500/10',
  info: 'border-blue-500/20 bg-blue-500/10',
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 items-end">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={clsx(
            'flex items-center gap-3 px-4 py-3 rounded-2xl border glass-card shadow-xl min-w-[280px] max-w-sm',
            bgMap[toast.type]
          )}
        >
          {iconMap[toast.type]}
          <span className="text-sm text-slate-200 font-medium flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
