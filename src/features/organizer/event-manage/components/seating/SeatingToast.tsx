import React from 'react';
import { FiAlertCircle, FiCheckCircle, FiInfo, FiAlertTriangle, FiX } from 'react-icons/fi';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const isSuccess = toast.type === 'success';
        const isError = toast.type === 'error';
        const isWarning = toast.type === 'warning';

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-2xl border text-xs font-bold transition-all animate-in slide-in-from-bottom-3 duration-200 ${
              isSuccess
                ? 'bg-emerald-950/90 text-emerald-200 border-emerald-500/40 backdrop-blur-md'
                : isError
                ? 'bg-rose-950/90 text-rose-200 border-rose-500/40 backdrop-blur-md'
                : isWarning
                ? 'bg-amber-950/90 text-amber-200 border-amber-500/40 backdrop-blur-md'
                : 'bg-slate-900/90 text-slate-100 border-slate-700/80 backdrop-blur-md'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isSuccess && <FiCheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />}
              {isError && <FiAlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
              {isWarning && <FiAlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              {!isSuccess && !isError && !isWarning && <FiInfo className="w-4 h-4 text-blue-400 flex-shrink-0" />}
              <span>{toast.text}</span>
            </div>
            <button
              type="button"
              onClick={() => onDismiss(toast.id)}
              className="ml-3 p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
            >
              <FiX className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
