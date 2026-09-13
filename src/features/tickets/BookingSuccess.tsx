import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiCheckCircle, FiHome } from "react-icons/fi";
import { FaTicketAlt } from "react-icons/fa";
import { formatCurrency } from "@/utils/formatters";

export default function BookingSuccess() {
  const navigate = useNavigate();
  const [lastTicket, setLastTicket] = useState<any>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    try {
      const tickets = JSON.parse(localStorage.getItem("haloticket_my_tickets") || "[]");
      if (tickets.length > 0) {
        setLastTicket(tickets[0]);
      }
    } catch {
      // ignore
    }
  }, []);

  return (
    <div className="w-full flex-1 app-bg-page app-text-main flex flex-col items-center justify-center p-6 my-auto min-h-[500px]">
      <div className="max-w-lg w-full app-bg-card border app-border rounded-3xl p-8 text-center space-y-6 shadow-2xl animate-in fade-in zoom-in duration-300">
        <div className="w-20 h-20 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border-2 border-emerald-500/30">
          <FiCheckCircle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black app-text-brand tracking-tight">Đặt vé thành công!</h1>
          <p className="text-xs app-text-sub">
            Cảm ơn bạn đã mua vé trên HaloTicket. Vé điện tử đã được phát hành và lưu vào tài khoản của bạn.
          </p>
        </div>

        {lastTicket && (
          <div className="p-5 rounded-2xl app-bg-page border app-border text-left space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between border-b app-border pb-2">
              <span className="app-text-sub">Mã đơn hàng:</span>
              <span className="font-bold app-text-brand">{lastTicket.id}</span>
            </div>
            <div className="space-y-1">
              <span className="app-text-sub block text-[11px]">Sự kiện:</span>
              <span className="font-extrabold app-text-main text-sm block leading-snug">{lastTicket.eventTitle}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="app-text-sub">Loại vé:</span>
              <span className="font-bold app-text-main">{lastTicket.ticketTypeName} (x{lastTicket.quantity})</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="app-text-sub">Tổng thanh toán:</span>
              <span className="font-black app-text-brand text-sm">{formatCurrency(lastTicket.totalAmount)}</span>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            type="button"
            onClick={() => navigate("/my-tickets")}
            className="flex-1 py-3.5 rounded-xl gradient-btn text-white font-extrabold text-xs shadow-md hover:scale-105 transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FaTicketAlt className="w-4 h-4" />
            <span>Xem &quot;Vé của tôi&quot;</span>
          </button>
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex-1 py-3.5 rounded-xl app-bg-card hover:app-bg-page app-text-main font-extrabold text-xs border app-border hover:border-brand-primary transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <FiHome className="w-4 h-4" />
            <span>Trang chủ</span>
          </button>
        </div>
      </div>
    </div>
  );
}
