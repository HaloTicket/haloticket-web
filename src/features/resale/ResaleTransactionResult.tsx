import { Fragment } from "react";
import { Link, useParams } from "react-router-dom";
import { FiAlertCircle, FiCheck, FiLoader } from "react-icons/fi";
import { useMarketplaceSaga } from "./hooks/useMarketplaceSaga";

export function ResaleTransactionResult() {
  const { sagaId = "" } = useParams<{ sagaId: string }>();
  const { saga, loading } = useMarketplaceSaga(sagaId || undefined);

  const completed = saga?.state === "COMPLETED";
  const failed = Boolean(saga && ["FAILED", "COMPENSATED"].includes(saga.state));
  const inProgress = !completed && !failed;

  return (
    <main className="mx-auto max-w-lg px-4 py-20 text-center">
      {(loading || inProgress) && (
        <Fragment>
          <FiLoader className="mx-auto h-10 w-10 animate-spin text-brand-primary" />
          <h1 className="mt-6 text-xl font-bold app-text-main">Đang xử lý giao dịch…</h1>
          <p className="mt-2 text-sm app-text-muted">Vui lòng đợi trong giây lát. Không tắt trang này.</p>
        </Fragment>
      )}
      {completed && (
        <Fragment>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
            <FiCheck className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold app-text-main">Mua vé thành công!</h1>
          <p className="mt-2 text-sm app-text-muted">
            Vé đã về tài khoản với mã QR mới. Mã QR của người bán đã bị vô hiệu hóa.
          </p>
          <Link
            to="/profile?tab=tickets"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-brand-primary px-6 py-3 font-bold text-white hover:brightness-110"
          >
            Xem vé của tôi
          </Link>
        </Fragment>
      )}
      {failed && (
        <Fragment>
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-950/40">
            <FiAlertCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="mt-5 text-2xl font-bold app-text-main">Giao dịch không thành công</h1>
          <p className="mt-2 text-sm app-text-muted">
            {saga?.lastError || "Tiền sẽ được hoàn lại trong vòng 3–5 ngày làm việc nếu đã thanh toán."}
          </p>
          <Link
            to="/resale-ticket"
            className="mt-6 inline-flex text-sm font-semibold text-brand-primary hover:underline"
          >
            ← Quay lại sàn vé
          </Link>
        </Fragment>
      )}
    </main>
  );
}

export default ResaleTransactionResult;
