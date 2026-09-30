import { useEffect, useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export interface AdminModalProps {
  title: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl";
  dismissible?: boolean;
  pending?: boolean;
}

const widths = { sm: "max-w-sm", md: "max-w-md", lg: "max-w-lg", xl: "max-w-xl", "2xl": "max-w-2xl" };

export function AdminModal({ title, icon, onClose, children, maxWidth = "lg", dismissible = true, pending = false }: AdminModalProps) {
  const { t } = useTranslation();
  const canClose = dismissible && !pending;
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => () => {
    queueMicrotask(() => previousFocus.current?.focus());
  }, []);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && canClose) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9998] bg-slate-950/70 data-[state=open]:animate-in data-[state=open]:fade-in duration-150 motion-reduce:animate-none" />
        <Dialog.Content
          onEscapeKeyDown={(event) => { if (!canClose) event.preventDefault(); }}
          onPointerDownOutside={(event) => { if (!canClose) event.preventDefault(); }}
          onCloseAutoFocus={(event) => { event.preventDefault(); previousFocus.current?.focus(); }}
          aria-describedby={undefined}
          className={`fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] ${widths[maxWidth]} max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border app-border app-bg-card p-5 shadow-xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 duration-150 motion-reduce:animate-none sm:p-6`}
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b app-border pb-4">
            <Dialog.Title className="flex items-center gap-2 text-lg font-bold app-text-main">{icon}{title}</Dialog.Title>
            {canClose && <Dialog.Close asChild><button type="button" aria-label={t("Đóng hộp thoại")} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg app-text-muted hover:app-text-main focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><FiX aria-hidden="true" /></button></Dialog.Close>}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AdminModal;
