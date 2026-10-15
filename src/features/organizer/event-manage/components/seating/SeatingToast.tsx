import React, { useEffect } from 'react';
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

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const isSuccess = toast.type === 'success';
  const isError = toast.type === 'error';
  const isWarning = toast.type === 'warning';

  return (
    <div
      className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl shadow-xl border text-xs font-bold transition-all animate-in slide-in-from-bottom-3 duration-200 backdrop-blur-md ${
        isSuccess
          ? 'bg-emerald-50 dark:bg-emerald-950/90 text-emerald-800 dark:text-emerald-200 border-emerald-300 dark:border-emerald-500/40'
          : isError
          ? 'bg-rose-50 dark:bg-rose-950/90 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-500/40'
          : isWarning
          ? 'bg-amber-50 dark:bg-amber-950/90 text-amber-800 dark:text-amber-200 border-amber-300 dark:border-amber-500/40'
          : 'app-bg-card app-text-main app-border'
      }`}
    >
      <div className="flex items-center gap-2.5">
        {isSuccess && <FiCheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />}
        {isError && <FiAlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 flex-shrink-0" />}
        {isWarning && <FiAlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0" />}
        {!isSuccess && !isError && !isWarning && <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />}
        <span>{toast.text}</span>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        className="ml-3 p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts, onDismiss }) => {
  if (!toasts.length) return null;

  // Deduplicate by text
  const uniqueToasts = toasts.filter((toast, index, self) =>
    index === self.findIndex((t) => t.text === toast.text)
  );

  return (
    <div className="fixed bottom-5 right-5 z-[999999] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {uniqueToasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};
