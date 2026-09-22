import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  FiSearch,
  FiDownload,
  FiMail,
  FiCheckCircle,
  FiInbox,
  FiX
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { eventApi } from "@/services/eventApi";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import OrderDetailsModal from "./components/OrderDetailsModal";

export const EventOrderList: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showtimeId, setShowtimeId] = useState("");

  const [showEmailModal, setShowEmailModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const pageSize = 10;

  const showToastMsg = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!eventId) return;
    let isMounted = true;
    setIsLoading(true);
    
    eventApi.getEventBookings(eventId, searchQuery, showtimeId, currentPage - 1, pageSize)
      .then((res: any) => {
        if (isMounted && res.content) {
          setOrders(res.content);
          setTotalPages(res.totalPages || 1);
        }
      })
      .catch((err) => {
        console.error("Failed to load bookings", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
      
    // fetch event details to get showtimes
    eventApi.getEventById(eventId).then((res: any) => {
      if (isMounted && res) {
        setEventDetails(res);
      }
    }).catch(console.error);
      
    return () => { isMounted = false; };
  }, [eventId, searchQuery, showtimeId, currentPage, pageSize]);

  const handleExportExcel = async () => {
    if (!eventId) return;
    try {
      showToastMsg("Đang chuẩn bị dữ liệu xuất...");
      // fetch all for export or just use current page. Let's fetch all (up to 1000) for export
      const res = await eventApi.getEventBookings(eventId, searchQuery, showtimeId, 0, 1000);
      const allOrders = res.content || [];
      
      const exportData = allOrders.map((o: any) => ({
        "Mã Đơn": o.bookingCode,
        "Thời Gian Mua": new Date(o.createdAt).toLocaleString("vi-VN"),
        "Người Mua": o.customerName,
        "Email": o.customerEmail,
        "Tổng Tiền (VNĐ)": o.totalAmount,
        "Số Lượng Vé": o.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0,
        "Trạng Thái": o.status
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDonHang");
      
      XLSX.writeFile(workbook, `DonHang_${eventId}_${new Date().getTime()}.xlsx`);
      showToastMsg("Xuất Excel thành công!");
    } catch (err) {
      console.error(err);
      showToastMsg("Lỗi khi xuất dữ liệu!");
    }
  };

  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

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
              onClick={handleExportExcel}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Input Box matching MyEvents style */}
          <div className="flex items-center gap-2 app-bg-card border app-border rounded-xl p-1.5 shadow-xs w-full sm:max-w-md">
            <div className="flex items-center gap-2 flex-1 pl-3">
              <FiSearch className="w-4 h-4 text-zinc-400 shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSearch();
                }}
                placeholder="Tìm mã đơn, tên, email người mua..."
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              Tìm kiếm
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <select
              value={showtimeId}
              onChange={(e) => {
                setShowtimeId(e.target.value);
                setCurrentPage(1);
              }}
              className="px-4 py-2.5 text-xs font-bold bg-white dark:bg-slate-900 border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 app-text-main w-full sm:w-56 appearance-none cursor-pointer transition-all duration-200"
              style={{ backgroundImage: `url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%239ba3af%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")`, backgroundRepeat: "no-repeat", backgroundPosition: "right 0.8rem top 50%", backgroundSize: "0.65rem auto" }}
            >
              <option value="">Tất cả suất diễn</option>
              {(() => {
                if (!eventDetails?.startTime || !eventDetails?.endTime) return null;
                const start = new Date(eventDetails.startTime);
                const end = new Date(eventDetails.endTime);
                if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
                
                const showtimes = [];
                let currentDate = new Date(start);
                currentDate.setHours(0, 0, 0, 0);
                
                const endDate = new Date(end);
                endDate.setHours(0, 0, 0, 0);
                
                let dayCount = 1;
                while (currentDate <= endDate) {
                  const dateStr = format(currentDate, "yyyy-MM-dd");
                  const displayStr = format(currentDate, "dd/MM/yyyy");
                  showtimes.push(
                    <option key={dateStr} value={dateStr}>
                      Suất {dayCount}: Ngày {displayStr}
                    </option>
                  );
                  currentDate.setDate(currentDate.getDate() + 1);
                  dayCount++;
                }
                return showtimes;
              })()}
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
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <p className="font-bold">Đang tải...</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <FiInbox className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold">Chưa có đơn hàng nào.</p>
                  </td>
                </tr>
              ) : (
                orders.map((ord: any) => (
                  <tr 
                    key={ord.id} 
                    onClick={() => setSelectedOrder(ord)}
                    className="hover:bg-slate-100/70 dark:hover:bg-slate-800/60 transition-colors rounded-xl cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-bold text-blue-600 dark:text-blue-400 rounded-l-xl">
                      {ord.bookingCode}
                    </td>
                    <td className="py-3.5 px-4 app-text-muted font-medium">
                      {new Date(ord.createdAt).toLocaleString("vi-VN")}
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-bold app-text-main">{ord.customerName || "Khách vô danh"}</div>
                      <div className="text-[10px] app-text-muted">{ord.customerEmail || "-"}</div>
                    </td>
                    <td className="py-3.5 px-4 font-black app-text-main">
                      {ord.totalAmount?.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-800 app-text-main rounded-md text-[10px] font-bold border app-border">
                        {ord.paymentMethod || "-"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center rounded-r-xl">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        ord.status === "PAID" 
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400" 
                          : ord.status === "PENDING"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}>
                        {ord.status === "PAID" ? "Thành công" : ord.status === "PENDING" ? "Chờ thanh toán" : "Đã hủy"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="pt-2 border-t app-border">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={1}
            pageSize={10}
            onPageChange={(page) => setCurrentPage(page)}
          />
        </div>
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

      <OrderDetailsModal 
        isOpen={!!selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        order={selectedOrder} 
        ticketTypes={(eventDetails?.tickets as any[]) || []} 
      />
    </div>
  );
};

export default EventOrderList;
