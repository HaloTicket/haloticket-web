import { FiBell } from "react-icons/fi";

export interface TicketHoldTimeoutModalProps {
  open: boolean;
  onReset: () => void;
  title?: string;
  message?: string;
  buttonText?: string;
}

export const TicketHoldTimeoutModal = ({
  open,
  onReset,
  title = "Hết thời gian giữ vé!",
  message = "Đã hết thời gian giữ vé. Vui lòng đặt lại vé mới.",
  buttonText = "Đặt vé mới",
}: TicketHoldTimeoutModalProps) => {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-timeout-title"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-7 text-center shadow-2xl dark:bg-zinc-900 border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150">
        <h3
          id="ticket-timeout-title"
          className="text-xl font-bold text-slate-900 dark:text-white"
        >
          {title}
        </h3>

        <div className="my-2 flex justify-center" aria-hidden="true">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 dark:bg-zinc-800/80">
            <FiBell className="h-9 w-9 text-slate-800 dark:text-slate-100" strokeWidth={1.75} />
          </div>
        </div>

        <p className="mx-auto max-w-[260px] text-sm font-medium leading-relaxed text-slate-600 dark:text-slate-300">
          {message}
        </p>

        <button
          type="button"
          onClick={onReset}
          className="mt-4 w-full cursor-pointer rounded-full bg-blue-500 py-3.5 px-6 text-base font-bold text-white shadow-md transition-colors hover:bg-blue-600 active:scale-[0.99]"
        >
          {buttonText}
        </button>
      </div>
    </div>
  );
};

export default TicketHoldTimeoutModal;
