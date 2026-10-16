import React, { useState, useEffect } from "react";
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

interface SslStatusData {
  has_ssl: boolean;
  domain: string;
  protocol: string;
  port: number;
  status: string;
  issuer: string;
  remaining_days: number;
  expire_date: string;
  message: string;
}

export const SslCertificateCard: React.FC = () => {
  const [checking, setChecking] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [customDomain, setCustomDomain] = useState("");
  const [sslData, setSslData] = useState<SslStatusData | null>(null);

  // check client connection protocol directly
  const isClientHttps = typeof window !== "undefined" && window.location.protocol === "https:";
  const clientHost = typeof window !== "undefined" ? window.location.host : "localhost";

  const fetchSslStatus = async (domainToCheck?: string) => {
    setChecking(true);
    let clean = domainToCheck ? domainToCheck.trim() : "";
    if (clean) {
      clean = clean.replace(/^https?:\/\//i, "").split("/")[0].split(":")[0].trim();
    }
    try {
      const data = await aiApi.getSslStatus(clean || undefined);
      if (data && typeof data === "object") {
        setSslData(data);
      }
    } catch {
      // fallback to real client browser protocol detection
      setSslData({
        has_ssl: isClientHttps,
        domain: clientHost,
        protocol: isClientHttps ? "HTTPS (TLS 1.3)" : "HTTP (Không mã hóa)",
        port: isClientHttps ? 443 : Number(window.location.port) || 80,
        status: isClientHttps ? "ACTIVE_VALID" : "DEV_HTTP_NO_SSL",
        issuer: isClientHttps ? "Trình duyệt (Browser Trusted CA)" : "Chưa có SSL (Localhost / HTTP)",
        remaining_days: 0,
        expire_date: isClientHttps ? "Xem qua biểu tượng khóa trên thanh URL" : "N/A",
        message: isClientHttps
          ? "Đang kết nối qua giao thức HTTPS bảo mật."
          : "Hệ thống đang chạy trên Localhost HTTP không có chứng chỉ SSL/TLS.",
      });
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    fetchSslStatus();
  }, []);

  const handleRecheckSsl = () => {
    fetchSslStatus(customDomain || undefined);
    toast.info("Đang kiểm tra chứng chỉ SSL/TLS thực tế...");
  };

  const hasSsl = sslData ? sslData.has_ssl : isClientHttps;

  return (
    <>
      <div className="app-bg-card border app-border rounded-lg p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b app-border pb-4">
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                hasSsl
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              }`}
            >
              {hasSsl ? <FiLock className="w-5 h-5" /> : <FiAlertTriangle className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm font-bold app-text-main">
                  Giám sát Chứng chỉ Bảo mật SSL/TLS
                </h3>
                {hasSsl ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                    <FiCheckCircle className="w-3 h-3" />
                    HỢP LỆ (SECURE HTTPS)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                    <FiAlertTriangle className="w-3 h-3" />
                    CHƯA BẬT SSL (HTTP LOCALHOST)
                  </span>
                )}
              </div>
              <p className="text-xs app-text-muted mt-0.5">
                {sslData?.message ||
                  (hasSsl
                    ? "Đường truyền kết nối được mã hóa bằng giao thức HTTPS an toàn."
                    : "Môi trường hiện tại đang chạy qua HTTP. Cần gắn tên miền và cài đặt SSL khi triển khai Production.")}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="inline-flex items-center min-h-9 gap-1.5 px-3 rounded-md border app-border bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-xs font-semibold app-text-main transition-colors cursor-pointer"
            >
              <FiFileText className="w-3.5 h-3.5 text-blue-500" />
              <span>Hướng dẫn kiểm tra SSL</span>
            </button>
            <button
              type="button"
              onClick={handleRecheckSsl}
              disabled={checking}
              className="inline-flex items-center min-h-9 gap-1.5 px-3 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
              <span>Kiểm tra lại</span>
            </button>
          </div>
        </div>

        {/* Certificate Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiShield className="w-3.5 h-3.5 text-blue-500" /> Tên miền / Địa chỉ
            </span>
            <div className="text-xs font-mono font-bold app-text-main truncate">
              {sslData?.domain || clientHost}
            </div>
            <div className="text-[11px] app-text-muted">
              Cổng: {sslData?.port || (isClientHttps ? 443 : 80)}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiKey className="w-3.5 h-3.5 text-purple-500" /> Đơn vị cấp (Issuer)
            </span>
            <div className="text-xs font-bold app-text-main truncate">
              {sslData?.issuer || (hasSsl ? "Trusted CA" : "Chưa cấu hình")}
            </div>
            <div className="text-[11px] app-text-muted">
              Giao thức: {sslData?.protocol || (hasSsl ? "HTTPS" : "HTTP/1.1")}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiClock className="w-3.5 h-3.5 text-emerald-500" /> Hạn chứng chỉ
            </span>
            <div
              className={`text-sm font-black ${
                hasSsl
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              }`}
            >
              {hasSsl ? `${sslData?.remaining_days || 0} ngày còn lại` : "Chưa kích hoạt (0 ngày)"}
            </div>
            <div className="text-[11px] app-text-muted">
              Hết hạn: {sslData?.expire_date || "N/A"}
            </div>
          </div>

          <div className="p-3 rounded-lg border app-border app-bg-subnav space-y-1">
            <span className="text-[11px] font-bold app-text-muted uppercase tracking-wider flex items-center gap-1">
              <FiGlobe className="w-3.5 h-3.5 text-blue-500" /> Kiểm tra tên miền khác
            </span>
            <div className="flex items-center gap-1 mt-0.5">
              <input
                type="text"
                value={customDomain}
                onChange={(e) => setCustomDomain(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    fetchSslStatus(customDomain);
                  }
                }}
                placeholder="vd: haloticket.duckdns.org"
                className="w-full px-2 py-1 text-xs rounded border app-border app-bg-card text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => fetchSslStatus(customDomain)}
                className="px-2 py-1 text-[11px] font-bold rounded bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 app-text-main cursor-pointer"
              >
                Quét
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
                <h3 className="text-base font-bold">Làm Sao Để Biết Hệ Thống Có SSL/TLS Hay Chưa?</h3>
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
                  1. Dấu hiệu nhận biết nhanh qua Trình duyệt
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Có biểu tượng ổ khóa (Lock icon):</strong> Trên thanh địa chỉ URL của trình duyệt hiển thị <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono">https://</code> thay vì <code className="font-mono">http://</code>.</li>
                  <li><strong>Nếu hiển thị "Không bảo mật" (Not Secure):</strong> Nghĩa là hệ thống đang chạy qua HTTP cổng 80/8080/8888 và chưa có chứng chỉ SSL/TLS.</li>
                  <li><strong>Nhấn vào biểu tượng ổ khóa:</strong> Chọn <em>"Kết nối an toàn" (Connection is secure)</em> &gt; <em>"Chứng chỉ hợp lệ"</em> để xem trực tiếp Tổ chức cấp (Issuer) và Ngày hết hạn.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                  2. Kiểm tra bằng lệnh Terminal (OpenSSL / cURL)
                </h4>
                <p>Mở terminal trên máy hoặc server để kiểm tra bắt tay TLS:</p>
                <div className="p-3 rounded-md bg-slate-900 text-slate-100 font-mono text-[11px] mt-1 space-y-1.5">
                  <div className="text-slate-400"># Kiểm tra qua cURL (nếu có SSL sẽ trả về 200/301 an toàn):</div>
                  <div>curl -Iv https://haloticket.vn</div>
                  <div className="text-slate-400 mt-2"># Kiểm tra chi tiết hạn ngày bằng OpenSSL:</div>
                  <div>openssl s_client -connect haloticket.vn:443 -servername haloticket.vn</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-sm text-blue-600 dark:text-blue-400 mb-1">
                  3. Khi nào cần cài đặt SSL/TLS?
                </h4>
                <ul className="list-disc list-inside space-y-1 text-slate-600 dark:text-slate-400">
                  <li><strong>Môi trường Localhost (Máy dev):</strong> Chạy `http://localhost:5173` và `http://localhost:8888` là bình thường, không bắt buộc cần SSL.</li>
                  <li><strong>Môi trường Production (Server có domain):</strong> Bắt buộc cài đặt SSL (miễn phí qua Let's Encrypt / Certbot hoặc Cloudflare) để:
                    <ul className="list-circle list-inside ml-4 mt-1 space-y-0.5">
                      <li>Bảo mật thông tin đăng nhập Keycloak và mật khẩu người dùng.</li>
                      <li>Cho phép các cổng thanh toán (VNPay, ZaloPay, MoMo) gửi Webhook xác nhận thanh toán (hầu hết cổng thanh toán yêu cầu URL nhận IPN phải là HTTPS).</li>
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
                Đã hiểu
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
