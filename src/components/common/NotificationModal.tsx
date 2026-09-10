import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  FiAlertCircle,
  FiAlertTriangle,
  FiCheckCircle,
  FiInfo,
  FiX,
} from "react-icons/fi";

export type NotificationModalVariant = "info" | "success" | "warning" | "error";
export type NotificationModalActionVariant = "primary" | "secondary" | "danger";

export interface NotificationModalAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: NotificationModalActionVariant;
  disabled?: boolean;
}

export interface NotificationModalProps {
  open: boolean;
  title: string;
  message: ReactNode;
  actions: NotificationModalAction[];
  variant?: NotificationModalVariant;
  icon?: ReactNode;
  dismissible?: boolean;
  onClose?: () => void;
}

const variantStyles: Record<NotificationModalVariant, string> = {
  info: "bg-blue-500/15 text-blue-500",
  success: "bg-emerald-500/15 text-emerald-500",
  warning: "bg-amber-500/15 text-amber-500",
  error: "bg-rose-500/15 text-rose-500",
};

const actionStyles: Record<NotificationModalActionVariant, string> = {
  primary: "bg-brand-600 text-white hover:bg-brand-500 shadow-brand-500/20",
  secondary:
    "app-bg-subnav app-text-main border app-border hover:bg-slate-100 dark:hover:bg-zinc-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-rose-500/20",
};

const defaultIcons: Record<NotificationModalVariant, ReactNode> = {
  info: <FiInfo className="h-6 w-6" aria-hidden="true" />,
  success: <FiCheckCircle className="h-6 w-6" aria-hidden="true" />,
  warning: <FiAlertTriangle className="h-6 w-6" aria-hidden="true" />,
  error: <FiAlertCircle className="h-6 w-6" aria-hidden="true" />,
};

export function NotificationModal({
  open,
  title,
  message,
  actions,
  variant = "info",
  icon,
  dismissible = true,
  onClose,
}: NotificationModalProps) {
  const titleId = useId();
  const messageId = useId();
  const firstActionRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstActionRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) onClose?.();
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [dismissible, onClose, open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="app-bg-card app-border w-full max-w-md rounded-3xl border p-6 shadow-2xl animate-in zoom-in-95 duration-200 md:p-8"
      >
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${variantStyles[variant]}`}
          >
            {icon ?? defaultIcons[variant]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-3">
              <h2 id={titleId} className="app-text-main text-lg font-extrabold leading-7">
                {title}
              </h2>
              {dismissible && onClose && (
                <button
                  type="button"
                  aria-label="Đóng"
                  onClick={onClose}
                  className="app-text-muted -mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white"
                >
                  <FiX className="h-5 w-5" aria-hidden="true" />
                </button>
              )}
            </div>
            <div id={messageId} className="app-text-muted mt-2 text-sm leading-6">
              {message}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              ref={index === 0 ? firstActionRef : undefined}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`min-h-11 rounded-xl px-5 py-2.5 text-sm font-bold shadow-md transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${actionStyles[action.variant ?? "primary"]}`}
            >
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export default NotificationModal;
