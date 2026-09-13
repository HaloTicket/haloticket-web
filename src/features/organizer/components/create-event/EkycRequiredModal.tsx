import React from "react";
import { Link } from "react-router-dom";
import { PATHS } from "@/routes/paths";
import { FiShield, FiArrowRight, FiX } from "react-icons/fi";

interface EkycRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const EkycRequiredModal: React.FC<EkycRequiredModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl app-bg-card border app-border p-6 sm:p-7 shadow-2xl space-y-6">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <FiX className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center space-y-3 pt-2">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
            <FiShield className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold app-text-main">Yêu cầu xác thực danh tính (eKYC)</h3>
            <p className="text-xs app-text-muted mt-1 leading-relaxed">
              Để bảo vệ quyền lợi ban tổ chức và người mua vé, bạn cần xác thực CCCD trước khi tạo sự kiện mới.
            </p>
          </div>
        </div>

        {/* Benefits list */}
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border app-border space-y-2 text-xs">
          <div className="flex items-center gap-2.5 app-text-main font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Mở khóa quyền phát hành & tạo sự kiện</span>
          </div>
          <div className="flex items-center gap-2.5 app-text-main font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Thiết lập tài khoản nhận doanh thu bán vé chính chủ</span>
          </div>
          <div className="flex items-center gap-2.5 app-text-main font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
            <span>Tăng độ tin cậy và huy hiệu Ban tổ chức uy tín</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border app-border text-xs font-semibold app-text-main hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            Quay lại
          </button>
          <Link
            to={`${PATHS.PROFILE}?tab=ekyc`}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs shadow-md shadow-blue-500/20 transition-all cursor-pointer"
          >
            <span>Xác thực eKYC ngay</span>
            <FiArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default EkycRequiredModal;
