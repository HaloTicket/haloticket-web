import { useTranslation } from "react-i18next";
import React from "react";
import { useNavigate } from "react-router-dom";

/** Props của hộp thoại gửi duyệt thành công: tiêu đề sự kiện (chưa dùng trong giao diện) và hàm đóng tùy chọn. */
interface SuccessSubmittedModalProps {
  title?: string;
  onClose?: () => void;
}

/** Hộp thoại báo sự kiện đã gửi và đang chờ duyệt, kèm thông tin liên hệ HaloTicket. */
export const SuccessSubmittedModal: React.FC<SuccessSubmittedModalProps> = ({ onClose }) => {
  const { t: translate } = useTranslation();
  const navigate = useNavigate();

  /** Đóng hộp thoại: gọi {@code onClose} nếu có, nếu không thì chuyển về trang {@code /organizer/my-events}. */
  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate("/organizer/my-events");
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 max-w-lg w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-200">
        <div className="space-y-3">
          <h3 className="text-lg md:text-xl font-bold app-text-main tracking-tight">
            {translate("Sự Kiện Đang Chờ Duyệt")} </h3>
          <p className="text-xs md:text-sm app-text-muted leading-relaxed">
            {translate("Đối tác vui lòng liên hệ HaloTicket qua hotline:")} <strong className="app-text-main font-bold">19006408</strong> {translate("hoặc email:")} <strong className="app-text-main font-bold">{translate("tbox.bd@haloticket.vn")}</strong> {translate("để được hỗ trợ mở bán sự kiện.")} </p>
          <p className="text-xs app-text-muted font-medium pt-1">
            {translate("Trân trọng cảm ơn!")} </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={handleClose}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
          >
            {translate("Đã hiểu")} </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessSubmittedModal;
