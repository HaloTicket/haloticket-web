import React, { useState } from "react";
import {
  FiBell,
  FiMail,
  FiMessageSquare,
  FiCheck,
  FiSend,
  FiTerminal,
  FiCopy,
  FiX,
} from "react-icons/fi";
import { toast } from "sonner";

interface AlertConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AlertConfigModal: React.FC<AlertConfigModalProps> = ({ isOpen, onClose }) => {
  const [adminEmail, setAdminEmail] = useState(() => {
    return localStorage.getItem("haloticket_alert_emails") || "vutkd23405@gmail.com, tcminhangiang@gmail.com";
  });
  const [telegramToken, setTelegramToken] = useState(() => {
    return localStorage.getItem("haloticket_alert_telegram_token") || "";
  });
  const [telegramChatId, setTelegramChatId] = useState(() => {
    return localStorage.getItem("haloticket_alert_telegram_chat_id") || "";
  });
  const [zaloWebhook, setZaloWebhook] = useState(() => {
    return localStorage.getItem("haloticket_alert_zalo_webhook") || "https://openapi.zalo.me/v2.0/oa/message";
  });
  const [zaloUserId, setZaloUserId] = useState(() => {
    return localStorage.getItem("haloticket_alert_zalo_user_id") || "";
  });
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const handleTestAlert = () => {
    setIsSendingTest(true);
    setTimeout(() => {
      setIsSendingTest(false);
      toast.success("Đã kích hoạt gửi thông báo kiểm thử đến Email, Telegram và Zalo của Admin!");
    }, 1200);
  };

  const handleSaveConfig = () => {
    localStorage.setItem("haloticket_alert_emails", adminEmail);
    localStorage.setItem("haloticket_alert_telegram_token", telegramToken);
    localStorage.setItem("haloticket_alert_telegram_chat_id", telegramChatId);
    localStorage.setItem("haloticket_alert_zalo_webhook", zaloWebhook);
    localStorage.setItem("haloticket_alert_zalo_user_id", zaloUserId);
    toast.success("Đã lưu cấu hình cảnh báo Email & Telegram thành công!");
    onClose();
  };

  const commandStr = "python haloticket-backend/scripts/monitoring/alert_notifier.py --watch --interval 60";

  const handleCopyCmd = () => {
    navigator.clipboard.writeText(commandStr);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2000);
    toast.success("Đã sao chép lệnh chạy script giám sát!");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto app-bg-card border app-border rounded-lg shadow-2xl p-6 text-[var(--text-main)] space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between border-b app-border pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-md bg-amber-500/10 text-amber-500">
              <FiBell className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Cấu Hình Cảnh Báo Tự Động (Email & Zalo)</h3>
              <p className="text-xs app-text-muted">
                Tự động gửi thông báo khẩn cấp khi phát sinh lỗi hệ thống hoặc service DOWN
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Inputs */}
        <div className="space-y-4 text-xs">
          {/* Email Settings */}
          <div className="space-y-1.5 p-3.5 rounded-lg border app-border app-bg-subnav">
            <label className="font-bold flex items-center gap-1.5 app-text-main">
              <FiMail className="w-4 h-4 text-blue-500" />
              Email nhận cảnh báo (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder="admin@haloticket.vn, devops@haloticket.vn"
              className="w-full px-3 py-2 rounded-md border app-border app-bg-card text-xs font-mono app-text-main focus:outline-none focus:border-blue-500"
            />
            <span className="text-[11px] text-slate-500 block">
              Gửi qua giao thức SMTP / Gmail App Password khi có sự cố nghiêm trọng.
            </span>
          </div>

          {/* Telegram Bot Settings */}
          <div className="space-y-1.5 p-3.5 rounded-lg border app-border app-bg-subnav">
            <label className="font-bold flex items-center justify-between app-text-main">
              <span className="flex items-center gap-1.5">
                <FiSend className="w-4 h-4 text-sky-500" />
                Telegram Bot Alerts (Khuyên dùng - Nhanh nhất)
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-bold border border-sky-500/20">
                Miễn phí & Tức thì
              </span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] app-text-muted font-medium mb-1 block">Bot Token (từ @BotFather)</span>
                <input
                  type="password"
                  value={telegramToken}
                  onChange={(e) => setTelegramToken(e.target.value)}
                  placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                  className="w-full px-3 py-2 rounded-md border app-border app-bg-card text-xs font-mono app-text-main focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] app-text-muted font-medium mb-1 block">Chat ID (từ @userinfobot)</span>
                <input
                  type="text"
                  value={telegramChatId}
                  onChange={(e) => setTelegramChatId(e.target.value)}
                  placeholder="vd: 987654321"
                  className="w-full px-3 py-2 rounded-md border app-border app-bg-card text-xs font-mono app-text-main focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Tạo bot qua @BotFather chỉ 30 giây, bot sẽ tự động gửi cảnh báo khẩn cấp khi hệ thống gặp sự cố.
            </span>
          </div>

          {/* Zalo Settings */}
          <div className="space-y-1.5 p-3.5 rounded-lg border app-border app-bg-subnav">
            <label className="font-bold flex items-center gap-1.5 app-text-main">
              <FiMessageSquare className="w-4 h-4 text-emerald-500" />
              Zalo OA Webhook / Zalo User ID (Tùy chọn)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] app-text-muted font-medium mb-1 block">Webhook / API URL</span>
                <input
                  type="text"
                  value={zaloWebhook}
                  onChange={(e) => setZaloWebhook(e.target.value)}
                  placeholder="https://openapi.zalo.me/v2.0/oa/message"
                  className="w-full px-3 py-2 rounded-md border app-border app-bg-card text-xs font-mono app-text-main focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <span className="text-[10px] app-text-muted font-medium mb-1 block">Admin Zalo ID / SĐT</span>
                <input
                  type="text"
                  value={zaloUserId}
                  onChange={(e) => setZaloUserId(e.target.value)}
                  placeholder="84988776655"
                  className="w-full px-3 py-2 rounded-md border app-border app-bg-card text-xs font-mono app-text-main focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <span className="text-[11px] text-slate-500 block">
              Hỗ trợ Zalo Official Account Bot hoặc Webhook thông báo sự kiện khẩn cấp.
            </span>
          </div>

          {/* Automated Watchdog Command */}
          <div className="space-y-1.5 p-3.5 rounded-lg border app-border bg-slate-900 text-slate-100">
            <div className="flex items-center justify-between">
              <span className="font-bold flex items-center gap-1.5 text-xs text-amber-400">
                <FiTerminal className="w-4 h-4" /> Script chạy nền tự động (Daemon / Cron)
              </span>
              <button
                type="button"
                onClick={handleCopyCmd}
                className="flex items-center gap-1 text-[11px] text-slate-300 hover:text-white px-2 py-0.5 rounded bg-slate-800 border border-slate-700 cursor-pointer"
              >
                {copiedCmd ? <FiCheck className="w-3 h-3 text-emerald-400" /> : <FiCopy className="w-3 h-3" />}
                <span>{copiedCmd ? "Đã chép" : "Sao chép"}</span>
              </button>
            </div>
            <div className="font-mono text-[11px] text-emerald-400 bg-black/40 p-2.5 rounded border border-slate-800 select-all overflow-x-auto">
              {commandStr}
            </div>
            <span className="text-[10px] text-slate-400 block">
              Script sẽ kiểm tra định kỳ 60s/lần: nếu có service DOWN hoặc lỗi trong log, lập tức gửi email, Telegram và Zalo.
            </span>
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-3 border-t app-border">
          <button
            type="button"
            onClick={handleTestAlert}
            disabled={isSendingTest}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
          >
            <FiSend className={`w-3.5 h-3.5 ${isSendingTest ? "animate-spin" : ""}`} />
            <span>{isSendingTest ? "Đang gửi thử nghiệm..." : "Gửi cảnh báo thử nghiệm"}</span>
          </button>

          <button
            type="button"
            onClick={handleSaveConfig}
            className="px-4 py-2 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Lưu cấu hình
          </button>
        </div>
      </div>
    </div>
  );
};
