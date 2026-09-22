import React from "react";
import { FiX, FiCheckCircle, FiClock, FiXCircle, FiUser, FiCreditCard, FiTag } from "react-icons/fi";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  ticketTypes: any[];
}

export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ isOpen, onClose, order, ticketTypes }) => {
  if (!isOpen || !order) return null;

  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PAID":
        return { label: "Thành công", icon: FiCheckCircle, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-100 dark:bg-emerald-500/20" };
      case "PENDING":
        return { label: "Chờ thanh toán", icon: FiClock, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-100 dark:bg-amber-500/20" };
      default:
        return { label: "Đã hủy", icon: FiXCircle, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-100 dark:bg-rose-500/20" };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  const getTicketName = (typeId: string) => {
    const t = ticketTypes?.find((x) => x.id === typeId);
    return t ? t.name : typeId;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in zoom-in-95 duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col app-bg-card border app-border rounded-2xl shadow-2xl">
        
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b app-border bg-slate-50/50 dark:bg-slate-800/50">
          <div>
            <h3 className="text-lg font-black text-blue-600 dark:text-blue-400 flex items-center gap-2">
              {order.bookingCode}
              <span className={`flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-full font-bold border app-border ${statusConfig.bg} ${statusConfig.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
            </h3>
            <p className="text-xs app-text-muted font-medium mt-1">
              Thời gian mua: {format(new Date(order.createdAt), "HH:mm, dd/MM/yyyy", { locale: vi })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 app-text-muted hover:app-text-main rounded-xl transition-colors cursor-pointer"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Body (Scrollable) */}
        <div className="p-5 overflow-y-auto no-scrollbar space-y-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Customer Info Card */}
            <div className="app-bg-subnav border app-border rounded-xl p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-blue-500" /> Khách hàng
              </h4>
              <div>
                <p className="font-bold app-text-main text-sm">{order.customerName || "Khách vô danh"}</p>
                <p className="text-xs app-text-muted mt-0.5">{order.customerEmail || "Không có email"}</p>
              </div>
            </div>

            {/* Payment Summary Card */}
            <div className="app-bg-subnav border app-border rounded-xl p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FiCreditCard className="w-4 h-4 text-emerald-500" /> Thanh toán
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between app-text-main">
                  <span className="app-text-muted">Tạm tính:</span>
                  <span className="font-bold">{order.subtotal?.toLocaleString("vi-VN") || 0} đ</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>Giảm giá:</span>
                    <span className="font-bold">- {order.discountAmount?.toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
                <div className="flex justify-between pt-1 mt-1 border-t app-border">
                  <span className="font-bold text-sm">Tổng thanh toán:</span>
                  <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                    {order.totalAmount?.toLocaleString("vi-VN") || 0} đ
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-[10px] app-text-muted">
                  <span>Phương thức:</span>
                  <span className="font-bold uppercase">{order.paymentMethod || "-"}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tickets Section */}
          <div className="space-y-3">
            <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <FiTag className="w-4 h-4 text-purple-500" /> Danh sách Vé
            </h4>
            
            {order.items && order.items.length > 0 ? (
              <div className="border app-border rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-800/80 border-b app-border">
                    <tr>
                      <th className="py-2.5 px-4 font-bold app-text-muted">Loại vé</th>
                      <th className="py-2.5 px-4 font-bold app-text-muted text-center">Số lượng</th>
                      <th className="py-2.5 px-4 font-bold app-text-muted text-right">Đơn giá</th>
                      <th className="py-2.5 px-4 font-bold app-text-muted text-right">Thành tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y app-border">
                    {order.items.map((item: any) => (
                      <tr key={item.id} className="app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-bold app-text-main">
                          {getTicketName(item.ticketTypeId)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold app-text-main">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right app-text-muted">
                          {item.unitPrice?.toLocaleString("vi-VN")} đ
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400">
                          {item.subTotal?.toLocaleString("vi-VN")} đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs app-text-muted p-4 border app-border rounded-xl bg-slate-50/50 dark:bg-slate-800/30 text-center font-medium shadow-xs">
                Không có dữ liệu vé
              </div>
            )}
          </div>

          {/* Seat Reservations Section */}
          {order.seatReservations && order.seatReservations.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <svg className="w-4 h-4 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                Ghế đã đặt
              </h4>
              <div className="flex flex-wrap gap-2">
                {order.seatReservations.map((seat: any) => (
                  <span 
                    key={seat.id} 
                    className="px-3 py-1.5 text-xs font-black text-amber-700 bg-amber-100 border border-amber-200 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 rounded-lg shadow-xs"
                  >
                    Ghế: {seat.seatId}
                  </span>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
