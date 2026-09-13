import React from 'react';
import { createPortal } from 'react-dom';
import { FiAlertTriangle, FiInfo, FiAlertCircle, FiCheckCircle, FiX, FiCheck, FiLoader } from 'react-icons/fi';

export type ConfirmModalType = 'danger' | 'warning' | 'info' | 'success' | 'primary';

export interface ConfirmModalProps {
  isOpen: boolean;
  title: React.ReactNode;
  message?: React.ReactNode;
  children?: React.ReactNode;
  type?: ConfirmModalType;
  confirmText?: string;
  cancelText?: string | null;
  confirmButtonVariant?: string;
  cancelButtonVariant?: string;
  icon?: React.ReactNode;
  iconBgClass?: string;
  iconColorClass?: string;
  modalSize?: 'sm' | 'md' | 'lg' | 'xl';
  showCloseButton?: boolean;
  isLoading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title,
  message,
  children,
  type = 'warning',
  confirmText = 'Đồng ý',
  cancelText = 'Hủy bỏ',
  confirmButtonVariant,
  cancelButtonVariant,
  icon,
  iconBgClass,
  iconColorClass,
  modalSize = 'md',
  showCloseButton = true,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const defaultIcons: Record<ConfirmModalType, React.ReactNode> = {
    danger: <FiAlertTriangle className="w-5 h-5" />,
    warning: <FiAlertCircle className="w-5 h-5" />,
    info: <FiInfo className="w-5 h-5" />,
    success: <FiCheckCircle className="w-5 h-5" />,
    primary: <FiInfo className="w-5 h-5" />,
  };

  const defaultIconBgMap: Record<ConfirmModalType, string> = {
    danger: 'bg-rose-500/10 border-rose-500/20 text-rose-500',
    warning: 'bg-amber-500/10 border-amber-500/20 text-amber-500',
    info: 'bg-blue-500/10 border-blue-500/20 text-blue-500',
    success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500',
    primary: 'bg-indigo-500/10 border-indigo-500/20 text-indigo-500',
  };

  const defaultConfirmBtnMap: Record<ConfirmModalType, string> = {
    danger: 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/30',
    warning: 'bg-amber-600 hover:bg-amber-700 text-white shadow-amber-600/30',
    info: 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30',
    success: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/30',
  };

  const sizeClassMap = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const activeIcon = icon || defaultIcons[type];
  const activeIconBg = iconBgClass || defaultIconBgMap[type];
  const activeConfirmBtn = confirmButtonVariant || defaultConfirmBtnMap[type];
  const activeCancelBtn =
    cancelButtonVariant ||
    'app-bg-main border app-border app-text-muted hover:app-text-main text-xs font-bold transition-all cursor-pointer';

  const modalContent = (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className={`w-full ${sizeClassMap[modalSize]} app-bg-card border app-border rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150`}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b app-border bg-slate-500/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-2xl border flex items-center justify-center font-bold shrink-0 ${activeIconBg} ${
                iconColorClass || ''
              }`}
            >
              {activeIcon}
            </div>
            <h3 className="text-base font-black app-text-main truncate">{title}</h3>
          </div>
          {showCloseButton && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className="w-9 h-9 rounded-xl flex items-center justify-center app-text-muted hover:app-text-main hover:bg-slate-500/10 transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiX className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        {(message || children) && (
          <div className="p-6 space-y-4">
            {message && (
              <p className="text-xs font-semibold app-text-main leading-relaxed whitespace-pre-line">
                {message}
              </p>
            )}
            {children}
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-500/5 border-t app-border flex items-center justify-end gap-3">
          {cancelText && (
            <button
              type="button"
              onClick={onCancel}
              disabled={isLoading}
              className={`px-5 py-2.5 rounded-xl ${activeCancelBtn} disabled:opacity-50`}
            >
              {cancelText}
            </button>
          )}
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`inline-flex items-center gap-2 px-6 py-2.5 text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-60 ${activeConfirmBtn}`}
          >
            {isLoading ? (
              <FiLoader className="w-4 h-4 animate-spin" />
            ) : (
              <FiCheck className="w-4 h-4" />
            )}
            <span>{confirmText}</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmModal;
