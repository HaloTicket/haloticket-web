import { useTranslation } from "react-i18next";

interface CancelOrderModalProps {
  open: boolean;
  onStay: () => void;
  onCancelOrder: () => void;
  cancelling?: boolean;
}

export function CancelOrderModal({
  open,
  onStay,
  onCancelOrder,
  cancelling = false,
}: CancelOrderModalProps) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in duration-150"
    >
      <div className="w-full max-w-[360px] rounded-3xl bg-white p-6 sm:p-7 text-slate-900 shadow-2xl dark:bg-zinc-900 dark:text-white border border-slate-100 dark:border-zinc-800 animate-in zoom-in-95 duration-150">
        <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white text-center">
          {t("Hủy đơn hàng?")}
        </h3>

        <div className="mt-4 space-y-2 text-sm text-slate-700 dark:text-slate-300">
          <p className="font-bold text-slate-900 dark:text-white text-sm">
            {t("Bạn có chắc chắn muốn tiếp tục?")}
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
            <li>{t("Bạn sẽ mất vị trí mình đã lựa chọn.")}</li>
            <li>{t("Đơn hàng đang trong quá trình thanh toán hoặc đã thanh toán thành công cũng có thể bị huỷ.")}</li>
          </ul>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            disabled={cancelling}
            onClick={onCancelOrder}
            className="flex-1 rounded-xl border border-red-500 bg-white dark:bg-transparent py-2.5 px-4 text-sm font-bold text-red-500 transition hover:bg-red-50 dark:hover:bg-red-950/20 active:scale-[0.99] cursor-pointer text-center disabled:opacity-50"
          >
            {cancelling ? t("Đang hủy…") : t("Hủy đơn")}
          </button>

          <button
            type="button"
            disabled={cancelling}
            onClick={onStay}
            className="flex-1 rounded-xl bg-blue-600 py-2.5 px-4 text-sm font-bold text-white transition hover:bg-blue-700 active:scale-[0.99] cursor-pointer text-center shadow-sm disabled:opacity-50"
          >
            {t("Ở lại")}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CancelOrderModal;
