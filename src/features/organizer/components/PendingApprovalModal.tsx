import { useTranslation } from "react-i18next";
import React from "react";
import { FiRotateCcw } from "react-icons/fi";

interface PendingApprovalModalProps {
  onClose: () => void;
  onCancelApproval?: () => void;
}

export const PendingApprovalModal: React.FC<PendingApprovalModalProps> = ({ onClose, onCancelApproval }) => {
  const { t: translate } = useTranslation();
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="space-y-3">
          <h3 className="text-lg md:text-xl font-bold app-text-main tracking-tight">
            {translate("Sự Kiện Đang Chờ Duyệt")}
          </h3>
          <p className="text-xs md:text-sm app-text-muted leading-relaxed">
            {translate("Đối tác vui lòng liên hệ HaloTicket qua hotline:")} <strong className="app-text-main font-bold">19006408</strong> {translate("hoặc email:")} <strong className="app-text-main font-bold">{translate("tbox.bd@haloticket.vn")}</strong> {translate("để được hỗ trợ mở bán sự kiện.")}
          </p>
          <p className="text-xs app-text-muted font-medium pt-1">
            {translate("Nếu cần chỉnh sửa lại thông tin sự kiện, bạn có thể hoàn tác yêu cầu duyệt để chuyển sự kiện về bản nháp.")}
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 justify-center">
          {onCancelApproval && (
            <button
              type="button"
              onClick={onCancelApproval}
              className="w-full sm:w-auto px-4 py-2 border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 font-bold text-sm rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5"
            >
              <FiRotateCcw className="w-4 h-4" />
              <span>{translate("Hủy yêu cầu duyệt")}</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
          >
            {translate("Đã hiểu")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingApprovalModal;
