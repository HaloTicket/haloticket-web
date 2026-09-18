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

const actionStyles: Record<NotificationModalActionVariant, string> = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 shadow-xs",
  secondary:
    "app-bg-subnav app-text-main border app-border hover:bg-slate-100 dark:hover:bg-zinc-800",
  danger: "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
};

const defaultIcons: Record<NotificationModalVariant, ReactNode> = {
  info: <FiInfo className="h-5 w-5 text-blue-500 shrink-0" aria-hidden="true" />,
  success: <FiCheckCircle className="h-5 w-5 text-emerald-500 shrink-0" aria-hidden="true" />,
  warning: <FiAlertTriangle className="h-5 w-5 text-amber-500 shrink-0" aria-hidden="true" />,
  error: <FiAlertCircle className="h-5 w-5 text-rose-500 shrink-0" aria-hidden="true" />,
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
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/45 p-4"
      onMouseDown={(event) => {
        if (dismissible && event.target === event.currentTarget) onClose?.();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={messageId}
        className="app-bg-card app-border w-full max-w-[400px] rounded-2xl border p-6 shadow-xl animate-in zoom-in-95 duration-150"
      >
        {/* Header with inline icon */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {icon ?? defaultIcons[variant]}
            <h2 id={titleId} className="app-text-main text-base font-semibold truncate">
              {title}
            </h2>
          </div>
          {dismissible && onClose && (
            <button
              type="button"
              aria-label="Đóng"
              onClick={onClose}
              className="app-text-muted -mr-1.5 -mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-zinc-800 dark:hover:text-white cursor-pointer"
            >
              <FiX className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>

        {/* Description */}
        <div id={messageId} className="app-text-muted mt-3 text-sm leading-6">
          {message}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {actions.map((action, index) => (
            <button
              key={`${action.label}-${index}`}
              ref={index === 0 ? firstActionRef : undefined}
              type="button"
              disabled={action.disabled}
              onClick={action.onClick}
              className={`h-10 px-4 rounded-lg text-sm font-semibold transition-all active:scale-98 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer ${actionStyles[action.variant ?? "primary"]}`}
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
