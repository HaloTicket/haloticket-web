import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  FiShield,
  FiCheckCircle,
  FiClock,
  FiRefreshCw,
  FiLock,
  FiKey,
  FiFileText,
  FiAlertTriangle,
  FiGlobe,
} from "react-icons/fi";
import { aiApi } from "@/services/aiApi";
import { toast } from "sonner";
import { resolveAiError, aiErrorMessage } from "@/utils/aiErrors";
import type { SslStatusResponse } from "@/types/ai";

type SslStatusData = SslStatusResponse;

export const SslCertificateCard: React.FC = () => {
  const { t, i18n } = useTranslation();
  const label = (vi: string, en: string) => t(vi, { defaultValue: i18n.language.startsWith("en") ? en : vi });
  const [checking, setChecking] = useState(true);
  const labelRef = useRef(label);
  useEffect(() => {
    labelRef.current = label;
  });
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [sslData, setSslData] = useState<SslStatusData | null>(null);
  const [sslError, setSslError] = useState<string | null>(null);
  const [lastDomain, setLastDomain] = useState<string | undefined>(undefined);

  const clientHost = typeof window !== "undefined" ? window.location.host : "localhost";

  const fetchSslStatus = useCallback(async (domainToCheck?: string): Promise<boolean> => {
    let clean = domainToCheck ? domainToCheck.trim() : "";
    if (!clean && typeof window !== "undefined" && window.location.hostname && window.location.hostname !== "localhost" && !window.location.hostname.startsWith("192.") && !window.location.hostname.startsWith("127.")) {
      clean = window.location.hostname;
    }
    if (!clean) {
      clean = "haloticket.duckdns.org";
    }
    if (clean) {
      clean = clean.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].trim();
    }
    try {
      const data = await aiApi.getSslStatus(clean || undefined);
      setSslData(data);
      setSslError(null);
      return true;
    } catch (err) {
      // no made-up certificate: show the real failure and let the admin retry.
      setSslData(null);
      const info = resolveAiError(err);
      setSslError(
        info.kind === "rate_limited"
          ? aiErrorMessage(info)
          : labelRef.current("Không lấy được trạng thái chứng chỉ SSL/TLS từ máy chủ.", "Could not get the SSL/TLS certificate status from the server.")
      );
      return false;
    } finally {
      setLastDomain(clean || undefined);
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // initial load; state updates happen after the async work, not in the effect body
    void Promise.resolve().then(() => fetchSslStatus());
  }, [fetchSslStatus]);

  const startCheck = (domain?: string) => {
    setChecking(true);
    return fetchSslStatus(domain);
  };

  const handleRecheckSsl = () => {
    toast.info(label("Đang kiểm tra chứng chỉ SSL/TLS thực tế...", "Checking the live SSL/TLS certificate..."));
    void startCheck(customDomain || undefined);
  };

  const noData = label("Không có dữ liệu", "No data");
  const hasSsl = sslData ? sslData.has_ssl === true : false;
  const expired = sslData?.status === "EXPIRED";
  const expiring = sslData?.status === "EXPIRING_SOON";

  return (
    <>
      <div className="app-bg-card border app-border rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b app-border pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                hasSsl && !expired && !expiring
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : expired
                    ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                    : !sslData && !checking
                      ? "bg-slate-500/10 text-slate-600 dark:text-slate-300"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {hasSsl && !expired ? <FiLock className="w-5 h-5" aria-hidden="true" /> : <FiAlertTriangle className="w-5 h-5" aria-hidden="true" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold app-text-main">
                  {label("Giám sát Chứng chỉ Bảo mật SSL/TLS", "SSL/TLS Security Certificate Monitoring")}
                </h3>
                {sslError ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30">
                    <FiAlertTriangle className="w-3 h-3" />
                    {label("KHÔNG KIỂM TRA ĐƯỢC", "CHECK FAILED")}
                  </span>
                ) : !sslData ? (
                  <span role="status" className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-slate-500/10 text-slate-600 dark:text-slate-300 border border-slate-500/30">
                    {label("ĐANG KIỂM TRA...", "CHECKING...")}
                  </span>
                ) : expired ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/30">
                    <FiAlertTriangle className="w-3 h-3" />
                    {label("ĐÃ HẾT HẠN", "EXPIRED")}
                  </span>
                ) : hasSsl && expiring ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <FiAlertTriangle className="w-3 h-3" />
                    {label("SẮP HẾT HẠN", "EXPIRING SOON")}
                  </span>
                ) : hasSsl ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <FiCheckCircle className="w-3 h-3" />
                    {label("HỢP LỆ (SECURE HTTPS)", "VALID (SECURE HTTPS)")}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <FiAlertTriangle className="w-3 h-3" />
                    {sslData?.status === "NO_SSL_OR_UNREACHABLE"
                      ? label("KHÔNG CÓ SSL HOẶC KHÔNG KẾT NỐI ĐƯỢC", "NO SSL OR UNREACHABLE")
                      : label("CHƯA BẬT SSL (HTTP LOCALHOST)", "SSL NOT ENABLED (HTTP LOCALHOST)")}
                  </span>
                )}
              </div>
              <p className="text-xs app-text-muted mt-0.5">
                {sslError ?? sslData?.message ?? noData}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center min-h-9.5 gap-2 px-3 text-xs font-semibold rounded-md border app-border app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer shadow-xs disabled:opacity-60"
            >
              <FiFileText className="w-3.5 h-3.5 text-blue-500" />
              <span>{label("Hướng dẫn kiểm tra SSL", "SSL Guide")}</span>
            </button>
            <button
              type="button"
              onClick={handleRecheckSsl}
              disabled={checking}
              className="inline-flex items-center min-h-9 gap-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${checking ? "motion-safe:animate-spin" : ""}`} aria-hidden="true" />
              <span>{label("Kiểm tra lại", "Re-check")}</span>
            </button>
          </div>
        </div>

        {sslError && (
          <div role="alert" className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-md border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 px-3 py-2 text-xs text-rose-700 dark:text-rose-300">
            <span>{sslError}</span>
            <button
              type="button"
              onClick={() => { void startCheck(lastDomain); }}
              disabled={checking}
              className="px-2.5 py-1 rounded border border-rose-300 dark:border-rose-800 font-semibold cursor-pointer disabled:opacity-50"
            >
              {label("Thử lại", "Retry")}
            </button>
          </div>
        )}

        {/* Certificate Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-blue-500" /> {label("Tên miền / Địa chỉ", "Domain / Address")}
            </span>
            <div className="text-xs font-mono font-bold app-text-main truncate">
              {sslData?.domain || lastDomain || clientHost}
            </div>
            <div className="text-[11px] app-text-muted">
              {label("Cổng:", "Port:")} {sslData?.port ?? noData}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiKey className="w-3.5 h-3.5 text-purple-500" /> {label("Đơn vị cấp (Issuer)", "Issuer")}
            </span>
            <div className="text-xs font-bold app-text-main truncate">
              {sslData?.issuer || (sslData ? label("Chưa cấu hình", "Not configured") : noData)}
            </div>
            <div className="text-[11px] app-text-muted">
              {label("Giao thức:", "Protocol:")} {sslData?.protocol || noData}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiClock className="w-3.5 h-3.5 text-emerald-500" /> {label("Hạn chứng chỉ", "Certificate Expiry")}
            </span>
            <div
              className={`text-sm font-black ${
                !sslData
                  ? "app-text-muted"
                  : hasSsl && !expired && !expiring
                    ? "text-emerald-600 dark:text-emerald-400"
                    : expired
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {!sslData
                ? noData
                : hasSsl && typeof sslData.remaining_days === "number"
                  ? expired
                    ? label("Đã hết hạn", "Expired")
                    : `${sslData.remaining_days} ${label("ngày còn lại", "days left")}`
                  : label("Chưa kích hoạt", "Not activated")}
            </div>
            <div className="text-[11px] app-text-muted">
              {label("Hết hạn:", "Expires:")} {sslData?.expire_date || noData}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiGlobe className="w-3.5 h-3.5 text-blue-500" /> {label("Kiểm tra tên miền khác", "Scan Custom Domain")}
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    startCheck(customDomain);
                  }
                }}
                placeholder={label("vd: haloticket.duckdns.org", "e.g. haloticket.duckdns.org")}
                className="w-full px-2 py-1 text-xs rounded border app-border app-bg-card text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => startCheck(customDomain)}
                className="inline-flex items-center min-h-6.5 gap-2 px-3 text-xs font-semibold rounded-md border app-border app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer shadow-xs disabled:opacity-60"
              >
                {label("Quét", "Scan")}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Guide Modal */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto app-bg-card border app-border rounded-lg shadow-2xl p-6 text-[var(--text-main)] space-y-4">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-md bg-blue-500/10 text-blue-500">
                  <FiLock className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold">{label("Làm Sao Để Biết Hệ Thống Có SSL/TLS Hay Chưa?", "How to Verify SSL/TLS Security Status")}</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="p-1 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs space-y-4 leading-relaxed text-slate-700 dark:text-slate-300">
              <div>
                <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                  {label("1. Dấu hiệu nhận biết nhanh qua Trình duyệt", "1. Quick Browser Indicators")}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>{label("Có biểu tượng ổ khóa (Lock icon):", "Lock Icon Displayed:")}</strong> {label("Trên thanh địa chỉ URL hiển thị", "Browser URL address bar shows")} <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">https://</code> {label("thay vì", "instead of")} <code className="font-mono">http://</code>.</li>
                  <li><strong>{label("Nếu hiển thị 'Không bảo mật' (Not Secure):", "If showing 'Not Secure':")}</strong> {label("Hệ thống đang chạy qua HTTP cổng 80/8080/8888 và chưa kích hoạt chứng chỉ SSL/TLS.", "System is served via plain HTTP (port 80/8080/8888) without active TLS certificates.")}</li>
                  <li><strong>{label("Nhấn vào biểu tượng ổ khóa:", "Clicking the lock icon:")}</strong> {label("Chọn 'Kết nối an toàn' > 'Chứng chỉ hợp lệ' để xem Tổ chức cấp (Issuer) và Ngày hết hạn.", "Select 'Connection is secure' > 'Certificate is valid' to view Issuer and expiration date.")}</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                  {label("2. Kiểm tra bằng lệnh Terminal (OpenSSL / cURL)", "2. Verification via Terminal (cURL / OpenSSL)")}
                </h4>
                <p>{label("Mở terminal trên máy hoặc server để kiểm tra bắt tay TLS:", "Run these commands to test TLS handshake:")}</p>
                <div className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-[11px] mt-1 space-y-1.5">
                  <div className="text-slate-400">{label("# Kiểm tra qua cURL (trả về 200/301 an toàn):", "# Verify with cURL (returns secure 200/301):")}</div>
                  <div>curl -Iv https://haloticket.duckdns.org</div>
                  <div className="text-slate-400 mt-2">{label("# Kiểm tra chi tiết hạn ngày bằng OpenSSL:", "# Inspect certificate expiration with OpenSSL:")}</div>
                  <div>openssl s_client -connect haloticket.duckdns.org:443 -servername haloticket.duckdns.org</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                  {label("3. Khi nào cần cài đặt SSL/TLS?", "3. When is SSL/TLS Required?")}
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>{label("Môi trường Localhost (Máy dev):", "Localhost (Dev environment):")}</strong> {label("Chạy http://localhost là bình thường, không bắt buộc cần SSL.", "Localhost runs on HTTP by default, SSL is optional.")}</li>
                  <li><strong>{label("Môi trường Production (Server có domain):", "Production (Live server with domain):")}</strong> {label("Bắt buộc cài đặt SSL (miễn phí qua Let's Encrypt / Certbot hoặc Cloudflare) để:", "SSL is mandatory (free via Let's Encrypt / Cloudflare) to:")}
                    <ul className="list-circle list-inside ml-4 mt-1 space-y-0.5">
                      <li>{label("Bảo mật thông tin đăng nhập Keycloak và mật khẩu người dùng.", "Protect Keycloak authentication tokens and credentials.")}</li>
                      <li>{label("Cho phép các cổng thanh toán (VNPay, ZaloPay, MoMo) gửi Webhook IPN an toàn.", "Enable payment gateways (VNPay, ZaloPay, MoMo) to send secure IPN webhooks.")}</li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t app-border">
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 text-xs font-bold rounded-md bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
              >
                {label("Đã hiểu", "Got it")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
