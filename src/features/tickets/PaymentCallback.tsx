import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { FiCheckCircle, FiXCircle, FiRefreshCw } from "react-icons/fi";
import { paymentApi } from "@/services/paymentApi";
import { bookingApi } from "@/services/bookingApi";
import { marketplaceApi } from "@/services/marketplaceApi";
import { PATHS } from "@/routes/paths";

export default function PaymentCallback() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const vnpResponseCode = searchParams.get("vnp_ResponseCode");
  const vnpTxnRef = searchParams.get("vnp_TxnRef");
  const bookingIdParam = searchParams.get("bookingId") || vnpTxnRef;

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [message, setMessage] = useState(t("Hệ thống đang xác thực giao dịch thanh toán..."));

  useEffect(() => {
    let isMounted = true;

    async function processCallback() {
      try {
        let isResale = false;
        try {
          isResale = JSON.parse(localStorage.getItem("haloticket_pending_order") || "{}").kind === "RESALE";
        } catch {
          isResale = false;
        }

        if (vnpResponseCode) {
          if (vnpResponseCode !== "00") {
            if (isMounted) {
              setStatus("error");
              setMessage(t("Thanh toán không thành công. Mã lỗi từ VNPay: {{code}}", { code: vnpResponseCode }));
            }
            return;
          }
          const confirmation = await paymentApi.confirmVnPayReturn(searchParams);
          if (confirmation.RspCode !== "00") {
            throw new Error(confirmation.Message || t("VNPay không xác nhận giao dịch"));
          }
        }

        if (!bookingIdParam) throw new Error(t("Thiếu mã giao dịch thanh toán"));

        let paymentCompleted = false;
        for (let attempt = 0; attempt < 10 && !paymentCompleted; attempt += 1) {
          const verification = await paymentApi.verifyPaymentStatus(bookingIdParam);
          paymentCompleted = Boolean(verification && ["COMPLETED", "PAID", "SUCCESS"].includes(verification.status));
          if (!paymentCompleted) await new Promise((resolve) => window.setTimeout(resolve, 1000));
        }
        if (!paymentCompleted) throw new Error(t("Thanh toán chưa được payment-service xác nhận"));

        if (isResale) {
          if (isMounted) setMessage(t("Thanh toán thành công. Đang chuyển quyền sở hữu vé..."));
          let transferCompleted = false;
          for (let attempt = 0; attempt < 20 && !transferCompleted; attempt += 1) {
            const purchase = await marketplaceApi.getResalePurchaseStatus(bookingIdParam);
            if (["REFUND_PENDING", "REFUNDED", "CANCELLED", "EXPIRED"].includes(purchase.status)) {
              throw new Error(t("Giao dịch chuyển vé không hoàn tất và đang được xử lý hoàn tiền"));
            }
            transferCompleted = purchase.status === "COMPLETED";
            if (!transferCompleted) await new Promise((resolve) => window.setTimeout(resolve, 1000));
          }
          if (!transferCompleted) throw new Error(t("Vé đang được chuyển quyền. Vui lòng kiểm tra lại sau."));
        }

        let targetCode = bookingIdParam;
        try {
          const bookingResp = await bookingApi.getBookingById(bookingIdParam);
          if (bookingResp?.bookingCode) {
            targetCode = bookingResp.bookingCode;
          }
        } catch {
          // fallback to bookingIdParam
        }

        if (isMounted) {
          setStatus("success");
          setMessage(isResale ? t("Vé mới đã được cấp vào Vé của tôi.") : t("Xác thực thanh toán thành công!"));
          localStorage.removeItem("haloticket_pending_order");
        }
        setTimeout(() => {
          if (isMounted) navigate(PATHS.ORDER_DETAIL(targetCode));
        }, 1200);

      } catch (err) {
        console.error("Payment callback verification error:", err);
        if (isMounted) {
          setStatus("error");
          setMessage(err instanceof Error ? err.message : t("Không thể xác thực giao dịch. Vui lòng thử lại."));
        }
      }
    }

    processCallback();
    return () => {
      isMounted = false;
    };
  }, [searchParams, vnpResponseCode, bookingIdParam, navigate, t]);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-6 app-bg-page app-text-main font-sans">
      <div className="w-full max-w-md app-bg-card border app-border rounded-3xl p-8 shadow-2xl text-center space-y-6">
        {status === "verifying" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-blue-500/10 text-blue-600 mx-auto flex items-center justify-center">
              <FiRefreshCw className="w-8 h-8 animate-spin text-blue-600" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider app-text-main">{t("Xử lý thanh toán")}</h2>
            <p className="text-xs app-text-sub leading-relaxed">{message}</p>
          </div>
        )}

        {status === "success" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-500 mx-auto flex items-center justify-center animate-bounce">
              <FiCheckCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-emerald-500">{t("Thanh toán thành công!")}</h2>
            <p className="text-xs app-text-sub leading-relaxed">{message}</p>
          </div>
        )}

        {status === "error" && (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-rose-500/10 text-rose-500 mx-auto flex items-center justify-center">
              <FiXCircle className="w-8 h-8" />
            </div>
            <h2 className="text-lg font-black uppercase tracking-wider text-rose-500">{t("Thanh toán thất bại")}</h2>
            <p className="text-xs app-text-sub leading-relaxed">{message}</p>

            <button
              type="button"
              onClick={() => navigate("/checkout")}
              className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs shadow-md transition-all cursor-pointer"
            >
              {t("Thử lại thanh toán")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
