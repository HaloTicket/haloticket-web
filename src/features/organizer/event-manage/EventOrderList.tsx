import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import {
  FiSearch,
  FiDownload,
  FiCheckCircle,
  FiInbox,
} from "react-icons/fi";
import { TablePagination } from "@/components/common/TablePagination";
import { eventApi } from "@/services/eventApi";
import * as XLSX from "xlsx";
import { spreadsheetValue } from "@/features/organizer/finance/organizerFinanceExport";

import OrderDetailsModal from "./components/OrderDetailsModal";

/** Trang danh sách đơn hàng của sự kiện: tìm theo từ khóa, lọc theo suất diễn, phân trang, xem chi tiết đơn và xuất Excel. */
export const EventOrderList: React.FC = () => {
  const { t } = useTranslation();
  const { eventId } = useParams<{ eventId: string }>();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [showtimeId, setShowtimeId] = useState("");
  const [isShowtimeDropdownOpen, setIsShowtimeDropdownOpen] = useState(false);

  const [toast, setToast] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const [orders, setOrders] = useState<any[]>([]);
  const [eventDetails, setEventDetails] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [pageSize, setPageSize] = useState(10);

  /** Hiện thông báo nổi trong 3 giây. */
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
          setTotalItems(typeof res.totalElements === "number" ? res.totalElements : res.content.length);
        }
      })
      .catch((err) => {
        console.error("Failed to load bookings", err);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
      
    // lấy chi tiết sự kiện để có danh sách suất diễn
    eventApi.getEventById(eventId).then((res: any) => {
      if (isMounted && res) {
        setEventDetails(res);
      }
    }).catch(console.error);
      
    return () => { isMounted = false; };
  }, [eventId, searchQuery, showtimeId, currentPage, pageSize]);

  /** Nhãn hiển thị của trạng thái đơn; trạng thái lạ giữ nguyên mã để không đánh lừa thành "Đã hủy". */
  const orderStatusLabel = (status?: string): string => {
    switch (status) {
      case "PAID": return t("Thành công");
      case "CONFIRMED": return t("Đã xác nhận");
      case "PENDING": return t("Chờ thanh toán");
      case "CANCELLED": return t("Đã hủy");
      case "EXPIRED": return t("Hết hạn");
      case "REFUNDED": return t("Đã hoàn tiền");
      case "FAILED": return t("Thất bại");
      default: return status || "-";
    }
  };

  /** Xuất danh sách đơn hàng theo bộ lọc hiện tại ra tệp Excel (tối đa 1000 đơn). */
  const handleExportExcel = async () => {
    if (!eventId) return;
    try {
      showToastMsg(t("Đang chuẩn bị dữ liệu xuất..."));
      // lấy toàn bộ để xuất thay vì chỉ trang hiện tại, tối đa 1000 đơn
      const res = await eventApi.getEventBookings(eventId, searchQuery, showtimeId, 0, 1000);
      const allOrders = res.content || [];
      
      // văn bản do người mua nhập (tên, email) đi qua spreadsheetValue để không bị Excel hiểu là công thức
      const exportData = allOrders.map((o: any) => ({
        [t("Mã Đơn")]: spreadsheetValue(o.bookingCode),
        [t("Thời Gian Mua")]: new Date(o.createdAt).toLocaleString("vi-VN"),
        [t("Người Mua")]: spreadsheetValue(o.customerName),
        "Email": spreadsheetValue(o.customerEmail),
        [t("Tổng Tiền (VNĐ)")]: Number(o.totalAmount) || 0,
        [t("Số Lượng Vé")]: o.items?.reduce((acc: number, item: any) => acc + item.quantity, 0) || 0,
        [t("Trạng Thái")]: orderStatusLabel(o.status)
      }));
      
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DanhSachDonHang");
      
      XLSX.writeFile(workbook, `DonHang_${eventId}_${new Date().getTime()}.xlsx`);
      showToastMsg(t("Xuất Excel thành công!"));
    } catch (err) {
      console.error(err);
      showToastMsg(t("Lỗi khi xuất dữ liệu!"));
    }
  };

  /** Áp dụng từ khóa tìm kiếm đã nhập và quay về trang 1. */
  const handleSearch = () => {
    setSearchQuery(searchInput);
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Thông báo nổi */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-[9999] bg-blue-600 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xl flex items-center gap-2 animate-in slide-in-from-bottom-3">
          <FiCheckCircle className="w-4 h-4" />
          <span>{toast}</span>
        </div>
      )}

      {/* Thanh điều khiển */}
      <div className="app-bg-card border app-border rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b app-border pb-3">
          <p className="text-xs app-text-muted">
            {t("Quản lý chi tiết đơn hàng đã mua vé và tìm kiếm người xem.")}
          </p>

          {/* Các nút hành động */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleExportExcel}
              className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
            >
              <FiDownload className="w-3.5 h-3.5" />
              <span>{t("Xuất báo cáo")}</span>
            </button>
          </div>
        </div>

        {/* Bộ lọc và thanh tìm kiếm chung */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Ô tìm kiếm, cùng kiểu với MyEvents */}
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
                placeholder={t("Tìm mã đơn, tên, email người mua...")}
                className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-zinc-400 font-medium"
              />
            </div>
            <button
              type="button"
              onClick={handleSearch}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer shrink-0"
            >
              {t("Tìm kiếm")}
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative w-full sm:w-56">
              <div 
                className="px-4 py-2.5 text-xs font-bold app-bg-card border-2 border-blue-100 dark:border-blue-900/50 hover:border-blue-300 dark:hover:border-blue-700 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 app-text-main cursor-pointer flex justify-between items-center transition-all duration-200"
                onClick={() => setIsShowtimeDropdownOpen(!isShowtimeDropdownOpen)}
              >
                <span className="truncate">
                  {showtimeId === "" 
                    ? t("Tất cả suất diễn") 
                    : (eventDetails?.showtimes?.find((s: any) => s.id === showtimeId)?.name || 
                       new Date(eventDetails?.showtimes?.find((s: any) => s.id === showtimeId)?.startTime).toLocaleString("vi-VN", {
                         day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                       }))
                  }
                </span>
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`shrink-0 transition-transform duration-200 ${isShowtimeDropdownOpen ? 'rotate-180' : ''}`}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
              
              {isShowtimeDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsShowtimeDropdownOpen(false)}></div>
                  <div className="absolute top-full right-0 mt-2 w-full min-w-[200px] app-bg-card border app-border rounded-xl shadow-xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div
                      className={`px-4 py-3 text-xs cursor-pointer transition-colors ${showtimeId === "" ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                      onClick={() => {
                        setShowtimeId("");
                        setCurrentPage(1);
                        setIsShowtimeDropdownOpen(false);
                      }}
                    >
                      {t("Tất cả suất diễn")}
                    </div>
                    {eventDetails?.showtimes?.map((st: any, idx: number) => {
                      const displayStr = new Date(st.startTime).toLocaleString("vi-VN", {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit"
                      });
                      return (
                        <div
                          key={st.id}
                          className={`px-4 py-3 text-xs cursor-pointer transition-colors ${showtimeId === st.id ? 'bg-blue-500/10 text-blue-500 font-bold' : 'app-text-main hover:bg-slate-500/10'}`}
                          onClick={() => {
                            setShowtimeId(st.id);
                            setCurrentPage(1);
                            setIsShowtimeDropdownOpen(false);
                          }}
                        >
                          {t("Suất")} {idx + 1}: {st.name || displayStr}
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thẻ bảng đơn hàng, không có viền giữa các dòng */}
      <div className="app-bg-card border app-border rounded-2xl p-4 shadow-xs space-y-4">
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs table-fixed min-w-[950px] border-collapse">
            <thead>
              <tr className="border-b app-border app-text-muted font-bold text-[11px] uppercase tracking-wider bg-slate-50/50 dark:bg-slate-800/30">
                <th className="py-3.5 px-4 w-[15%] rounded-l-xl">{t("Mã đơn hàng")}</th>
                <th className="py-3.5 px-4 w-[18%]">{t("Thời gian mua")}</th>
                <th className="py-3.5 px-4 w-[20%]">{t("Người mua")}</th>
                <th className="py-3.5 px-4 w-[15%]">{t("Giá trị đơn")}</th>
                <th className="py-3.5 px-4 w-[14%]">{t("Thanh toán")}</th>
                <th className="py-3.5 px-4 w-[18%] text-center rounded-r-xl">{t("Trạng thái")}</th>
              </tr>
            </thead>
            <tbody className="text-xs app-text-main">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <p className="font-bold">{t("Đang tải dữ liệu...")}</p>
                  </td>
                </tr>
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center app-text-muted">
                    <FiInbox className="w-8 h-8 mx-auto text-slate-400 mb-2 opacity-50" />
                    <p className="font-bold">{t("Chưa có đơn hàng nào.")}</p>
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
                      <div className="font-bold app-text-main">{ord.customerName || t("Khách vô danh")}</div>
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
                        ord.status === "PAID" || ord.status === "CONFIRMED"
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                          : ord.status === "PENDING"
                          ? "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400"
                          : ord.status === "REFUNDED"
                          ? "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400"
                          : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                      }`}>
                        {orderStatusLabel(ord.status)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Phân trang */}
        <div className="pt-2 border-t app-border">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>

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
