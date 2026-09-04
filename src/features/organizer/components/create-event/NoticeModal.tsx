import React from "react";
import { FiAlertCircle } from "react-icons/fi";

interface NoticeModalProps {
  onClose: () => void;
}

export const NoticeModal: React.FC<NoticeModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="app-bg-card border app-border rounded-2xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
        <div className="flex items-center gap-3 border-b app-border pb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-500 flex items-center justify-center shrink-0">
            <FiAlertCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base md:text-lg font-black app-text-main uppercase tracking-tight">
            LƯU Ý QUAN TRỌNG KHI ĐĂNG TẢI SỰ KIỆN
          </h3>
        </div>

        <div className="space-y-4 text-xs md:text-sm app-text-muted leading-relaxed">
          <p>
            <strong className="app-text-main">1.</strong> Vui lòng{" "}
            <strong className="text-rose-500">
              không hiển thị thông tin liên lạc của Ban Tổ Chức
            </strong>{" "}
            (ví dụ: Số điện thoại, Email, Website, Facebook, Instagram...) trên banner và trong nội dung bài đăng. Chỉ sử dụng duy nhất Hotline HaloTicket -{" "}
            <strong className="app-text-brand">1900.6408</strong>.
          </p>
          <p>
            <strong className="app-text-main">2.</strong> Trong trường hợp Ban tổ chức tạo mới hoặc cập nhật sự kiện không đúng theo quy định nêu trên, HaloTicket có{" "}
            <strong className="app-text-main">quyền từ chối phê duyệt sự kiện</strong>.
          </p>
          <p>
            <strong className="app-text-main">3.</strong> HaloTicket sẽ liên tục kiểm tra thông tin các sự kiện đang hiển thị. Nếu phát hiện sai phạm hình ảnh / nội dung, HaloTicket có quyền gỡ bỏ dịch vụ đối với sự kiện này.
          </p>
        </div>

        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-10 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            ĐÃ HIỂU & ĐỒNG Ý
          </button>
        </div>
      </div>
    </div>
  );
};

export default NoticeModal;
