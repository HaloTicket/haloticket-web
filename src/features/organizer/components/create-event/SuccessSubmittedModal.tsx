import React from "react";
import { FiCheckCircle } from "react-icons/fi";
import { useNavigate } from "react-router-dom";

interface SuccessSubmittedModalProps {
  title: string;
}

export const SuccessSubmittedModal: React.FC<SuccessSubmittedModalProps> = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex items-center justify-center p-4">
      <div className="app-bg-card border app-border rounded-3xl p-8 max-w-lg w-full shadow-2xl text-center space-y-6 animate-in zoom-in-95 duration-300">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto shadow-lg">
          <FiCheckCircle className="w-10 h-10 animate-bounce" />
        </div>

        <div className="space-y-2">
          <h3 className="text-2xl font-black app-text-main tracking-tight">
            GỬI YÊU CẦU THÀNH CÔNG!
          </h3>
          <p className="text-xs md:text-sm app-text-muted leading-relaxed">
            Yêu cầu tạo sự kiện <strong className="app-text-main">"{title || "Sự kiện mới"}"</strong> đã được gửi tới Ban quản trị HaloTicket. Chúng tôi sẽ phê duyệt và phản hồi qua email trong vòng 24 giờ.
          </p>
        </div>

        <div className="pt-2">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm rounded-xl shadow-lg cursor-pointer transition-all active:scale-95"
          >
            Về Trang Chủ HaloTicket
          </button>
        </div>
      </div>
    </div>
  );
};

export default SuccessSubmittedModal;
