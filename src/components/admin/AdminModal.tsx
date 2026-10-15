import { useEffect, useId, useRef, type ReactNode } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";

export interface AdminModalProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl" | "4xl";
  dismissible?: boolean;
  pending?: boolean;
}

const widths = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  "3xl": "max-w-3xl",
  "4xl": "max-w-4xl",
};

export function AdminModal({ title, subtitle, icon, onClose, children, maxWidth = "lg", dismissible = true, pending = false }: AdminModalProps) {
  const { t } = useTranslation();
  const descriptionId = useId();
  const canClose = dismissible && !pending;
  const previousFocus = useRef<HTMLElement | null>(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  useEffect(() => () => {
    queueMicrotask(() => previousFocus.current?.focus());
  }, []);

  return (
    <Dialog.Root open onOpenChange={(open) => { if (!open && canClose) onClose(); }}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[9998] bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in duration-150 motion-reduce:animate-none" />
        <Dialog.Content
          onEscapeKeyDown={(event) => { if (!canClose) event.preventDefault(); }}
          onPointerDownOutside={(event) => { 
            if (!canClose) {
              event.preventDefault(); 
            } else if ((event.target as HTMLElement).closest('.floating-dropdown')) {
              event.preventDefault();
            }
          }}
          onCloseAutoFocus={(event) => { event.preventDefault(); previousFocus.current?.focus(); }}
          aria-describedby={subtitle ? descriptionId : undefined}
          className={`fixed left-1/2 top-1/2 z-[9999] w-[calc(100%-2rem)] ${widths[maxWidth]} max-h-[90dvh] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border app-border app-bg-card p-6 shadow-2xl focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in data-[state=open]:zoom-in-95 duration-150 motion-reduce:animate-none`}
        >
          <div className="mb-5 flex items-center justify-between gap-3 border-b app-border pb-4">
            <div className="flex min-w-0 items-center gap-3">
              {icon && <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-blue-500/20 bg-blue-500/10 app-text-brand">{icon}</span>}
              <div className="min-w-0">
                <Dialog.Title className="text-[17px] font-bold app-text-main">{title}</Dialog.Title>
                {subtitle && <Dialog.Description id={descriptionId} className="text-[13px] app-text-muted">{subtitle}</Dialog.Description>}
              </div>
            </div>
            {canClose && <Dialog.Close asChild><button type="button" aria-label={t("Đóng hộp thoại")} className="grid h-9 w-9 shrink-0 place-items-center rounded-md app-text-muted hover:app-text-main hover:app-bg-subnav focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"><FiX className="h-5 w-5" aria-hidden="true" /></button></Dialog.Close>}
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export default AdminModal;
