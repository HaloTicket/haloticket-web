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

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  type = 'warning',
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const isDanger = type === 'danger';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl app-bg-card border app-border p-6 shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
              isDanger
                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/20'
                : 'bg-amber-500/10 text-amber-500 border border-amber-500/20'
            }`}
          >
            {isDanger ? <FiAlertCircle className="w-5 h-5" /> : <FiAlertTriangle className="w-5 h-5" />}
          </div>
          <div>
            <h3 className="text-base font-extrabold app-text-main">{title}</h3>
            <p className="text-xs app-text-muted mt-0.5">{message}</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t app-border">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-xl app-bg-main border app-border text-xs font-bold app-text-main hover:bg-slate-500/10 transition-all cursor-pointer"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-4 py-2 rounded-xl text-xs font-bold text-white transition-all cursor-pointer shadow-md ${
              isDanger
                ? 'bg-rose-600 hover:bg-rose-700'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
