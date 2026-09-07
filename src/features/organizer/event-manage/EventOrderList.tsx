import React, { useState } from "react";
import {
  FiSearch,
  FiDownload,
  FiMail,
  FiCalendar,
  FiCheckCircle,
  FiInbox,
  FiX
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import type { BookingItem } from "@/types";

export const EventOrderList: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedShowtime, setSelectedShowtime] = useState("ALL");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // sample order dataset for the event
  const ordersList: BookingItem[] = [
    {
      id: "ord-1",
      orderCode: "ORD-89210",
      purchaseTime: "20:15 - 06/09/2026",
      buyerName: "Nguyễn Văn An",
      buyerEmail: "nguyenvanan@gmail.com",
      amount: 1399000,
      paymentMethod: "VNPAY QR",
      status: "PAID",
      ticketQuantity: 2
    },
    {
      id: "ord-2",
      orderCode: "ORD-89211",
      purchaseTime: "18:40 - 06/09/2026",
      buyerName: "Trần Thị Mai",
      buyerEmail: "tranmai92@gmail.com",
      amount: 250000,
      paymentMethod: "MoMo Wallet",
      status: "PAID",
      ticketQuantity: 1
    },
    {
      id: "ord-3",
      orderCode: "ORD-89212",
      purchaseTime: "15:20 - 05/09/2026",
      buyerName: "Phạm Hoàng Dũng",
      buyerEmail: "hoangdung99@gmail.com",
      amount: 500000,
      paymentMethod: "ATM Card",
      status: "PAID",
      ticketQuantity: 2
    }
  ];

  const filteredOrders = ordersList.filter(
    (o) =>
      o.orderCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      o.buyerEmail.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <FiCheckCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Controls Bar */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <p className="text-xs app-text-muted">
            Quản lý chi tiết đơn hàng đã mua vé, tìm kiếm người xem và gửi thông báo email đến khán giả.
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => showToastMsg("Đã xuất báo cáo CSV danh sách đơn hàng thành công!")}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>Xuất báo cáo</span>
            </button>

            <button
              type="button"
              onClick={() => setShowEmailModal(true)}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiMail className="w-3.5 h-3.5" />
              <span>Gửi email</span>
            </button>
          </div>
        </div>

        {/* Filter Controls & Unified Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Box matching MyEvents style */}
          <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs max-w-md w-full">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <FiSearch className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Tìm mã đơn, tên, email người mua..."
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
              />
            </div>
            <button
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              Tìm kiếm
            </button>
          </div>

          {/* Showtime Filter Select */}
          <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs shrink-0">
            <FiCalendar className="w-4 h-4 text-blue-600 shrink-0 ml-2" />
            <select
              value={selectedShowtime}
              onChange={(e) => {
                setSelectedShowtime(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-1.5 bg-transparent app-text-main text-xs font-extrabold focus:outline-none cursor-pointer"
            >
              <option value="ALL">Tất cả suất diễn</option>
              <option value="st-1">Suất 20:00, 25/09/2026</option>
              <option value="st-2">Suất 19:00, 26/09/2026</option>
            </select>
          </div>
        </div>
      </div>

      {/* Orders Table Card with NO row borders */}
      <div className="app-bg-card border app-border rounded-2xl p-4 shadow-xs space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3.5 px-4 w-[15%] rounded-l-xl">Mã đơn hàng</th>
                <th className="py-3.5 px-4 w-[18%]">Thời gian mua</th>
                <th className="py-3.5 px-4 w-[20%]">Người mua</th>
                <th className="py-3.5 px-4 w-[15%]">Giá trị đơn</th>
                <th className="py-3.5 px-4 w-[14%]">Thanh toán</th>
                <th className="py-3.5 px-4 w-[18%] text-center rounded-r-xl">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <FiInbox className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold">Chưa có đơn hàng nào.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl">
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 rounded-l-xl">
                      {ord.orderCode}
                    </td>
                    <td className="py-3.5 px-4 font-medium app-text-main">
                      {ord.purchaseTime}
                    </td>
                    <td className="py-3.5 px-4">
                      <div>
                        <p className="font-bold app-text-main">{ord.buyerName}</p>
                        <p className="text-[11px] app-text-muted truncate">{ord.buyerEmail}</p>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-black app-text-main">
                      {ord.amount.toLocaleString("vi-VN")} đ
                      <span className="text-[10px] text-blue-600 block font-normal">({ord.ticketQuantity} vé)</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold app-text-muted">
                      {ord.paymentMethod}
                    </td>
                    <td className="py-3.5 px-4 text-center rounded-r-xl">
                      <span className="px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 text-[10px] font-black border border-blue-200 dark:border-blue-900 inline-flex items-center gap-1.5 whitespace-nowrap shadow-xs">
                        <FiCheckCircle className="w-3.5 h-3.5 shrink-0" /> ĐÃ THANH TOÁN
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={filteredOrders.length}
          pageSize={pageSize}
          onPageChange={(page) => setCurrentPage(page)}
        />
      </div>

      {/* Modal Send Email */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="app-bg-card border app-border rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b app-border pb-3">
              <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
                <FiMail className="w-4 h-4 text-blue-600" />
                <span>Gửi Email Khán Giả Mua Vé</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="p-1 rounded-lg app-text-muted hover:app-text-main cursor-pointer"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold app-text-main block mb-1">Tiêu đề Email</label>
                <input
                  type="text"
                  placeholder="Thông báo về sự kiện..."
                  className="w-full px-3 py-2 app-bg-subnav app-text-main border app-border rounded-xl focus:outline-none font-medium"
                />
              </div>

              <div>
                <label className="font-bold app-text-main block mb-1">Nội dung Email</label>
                <textarea
                  rows={4}
                  placeholder="Nhập nội dung cần thông báo..."
                  className="w-full px-3 py-2 app-bg-subnav app-text-main border app-border rounded-xl focus:outline-none font-medium"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t app-border">
              <button
                type="button"
                onClick={() => setShowEmailModal(false)}
                className="px-4 py-2 app-bg-subnav app-text-main font-bold text-xs rounded-xl border app-border cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowEmailModal(false);
                  showToastMsg("Đã gửi email thông báo thành công đến tất cả người mua vé!");
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Gửi ngay
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EventOrderList;
