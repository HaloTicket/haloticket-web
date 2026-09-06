import React from "react";
import { FiAlertTriangle } from "react-icons/fi";

interface AdminConfirmModalProps {
  title: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: React.ReactNode;
}

export const AdminConfirmModal: React.FC<AdminConfirmModalProps> = ({
  title,
  subtitle,
  confirmText = "Xác nhận",
  cancelText = "Hủy bỏ",
  isDanger = true,
  onClose,
  onConfirm,
  children
}) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="app-bg-card border app-border rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className={`flex items-center gap-3 ${isDanger ? "text-rose-500" : "text-blue-500"}`}>
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center font-bold shrink-0 ${
              isDanger ? "bg-rose-500/10 text-rose-500" : "bg-blue-500/10 text-blue-500"
            }`}
          >
            <FiAlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold app-text-main">{title}</h3>
            {subtitle && <p className="text-xs app-text-muted">{subtitle}</p>}
          </div>
        </div>

        {children}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 app-bg-subnav app-text-main text-xs font-bold rounded-xl border app-border cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-zinc-800"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-6 py-2.5 text-xs font-extrabold text-white rounded-xl shadow-md cursor-pointer transition-all active:scale-95 ${
              isDanger ? "bg-rose-600 hover:bg-rose-700" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConfirmModal;
