import { useEffect, useRef, type ReactNode } from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { FiAlertTriangle } from "react-icons/fi";

export interface AdminConfirmModalProps {
  title: string;
  subtitle?: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
  pending?: boolean;
  dismissible?: boolean;
}

export function AdminConfirmModal({ title, subtitle, confirmText = "Xác nhận", cancelText = "Hủy bỏ", isDanger = true, onClose, onConfirm, children, pending = false, dismissible = true }: AdminConfirmModalProps) {
  const canClose = dismissible && !pending;
  const cancelRef = useRef<HTMLButtonElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => () => {
    queueMicrotask(() => previousFocus.current?.focus());
  }, []);
  return (
    <AlertDialog.Root open onOpenChange={(open) => { if (!open && canClose) onClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-150 motion-reduce:animate-none" />
        <AlertDialog.Content
          ref={contentRef}
          tabIndex={-1}
          onEscapeKeyDown={(event) => { if (!canClose) event.preventDefault(); }}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            if (canClose) cancelRef.current?.focus();
            else contentRef.current?.focus();
          }}
          onCloseAutoFocus={(event) => { event.preventDefault(); previousFocus.current?.focus(); }}
          className="fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl border app-border app-bg-card p-6 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 duration-150 motion-reduce:animate-none"
        >
          <div className="mb-5 flex items-center gap-3 border-b app-border pb-4">
            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl border ${isDanger ? "border-red-500/20 bg-red-500/10 text-red-600 dark:text-red-400" : "border-blue-500/20 bg-blue-500/10 app-text-brand"}`}><FiAlertTriangle className="h-5 w-5" aria-hidden="true" /></span>
            <div>
              <AlertDialog.Title className="text-[17px] font-bold app-text-main">{title}</AlertDialog.Title>
              <AlertDialog.Description className="text-[13px] app-text-muted">{subtitle || title}</AlertDialog.Description>
            </div>
          </div>
          {children}
          <div className="mt-6 flex flex-wrap justify-end gap-3">
            <AlertDialog.Cancel asChild><button ref={cancelRef} type="button" disabled={!canClose} className="min-h-11 rounded-xl border app-border app-bg-subnav px-4 text-sm font-semibold app-text-main disabled:opacity-50">{cancelText}</button></AlertDialog.Cancel>
            <button type="button" disabled={pending} onClick={onConfirm} className={`min-h-11 rounded-xl px-4 text-sm font-semibold text-white disabled:opacity-50 ${isDanger ? "bg-red-600 hover:bg-red-700" : "app-bg-brand"}`}>{confirmText}</button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export default AdminConfirmModal;
