import React, { useState } from "react";
import {
  FiTrendingUp,
  FiSliders,
  FiAlertTriangle,
  FiSearch,
  FiTag,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface ResaleTicketItem {
  id: string;
  ticketCode: string;
  eventName: string;
  sellerName: string;
  originalPrice: number;
  resalePrice: number;
  markupPercent: number;
  status: "ACTIVE" | "FLAGGED" | "LOCKED" | "SOLD";
  listedAt: string;
}

export const ResaleManagement: React.FC = () => {
  const [priceCapPercent, setPriceCapPercent] = useState<number>(20); // max +20% (120% of face value)
  const [allowResaleSystem, setAllowResaleSystem] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState("");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const [resaleListings, setResaleListings] = useState<ResaleTicketItem[]>([
    {
      id: "RSL_101",
      ticketCode: "TK-SNT-VIP-088",
      eventName: "Sơn Tùng M-TP Sky Tour 2026",
      sellerName: "Lê Văn Tùng",
      originalPrice: 1500000,
      resalePrice: 1750000,
      markupPercent: 16.6,
      status: "ACTIVE",
      listedAt: "10:30 - 04/09/2026"
    },
    {
      id: "RSL_102",
      ticketCode: "TK-SNT-GA-991",
      eventName: "Sơn Tùng M-TP Sky Tour 2026",
      sellerName: "Hoàng Đức Nam (Nghi vấn Scalper)",
      originalPrice: 450000,
      resalePrice: 650000,
      markupPercent: 44.4,
      status: "FLAGGED",
      listedAt: "09:12 - 04/09/2026"
    },
    {
      id: "RSL_103",
      ticketCode: "TK-SGN-BIB-402",
      eventName: "Saigon Night Run Half Marathon",
      sellerName: "Phạm Quốc Anh",
      originalPrice: 650000,
      resalePrice: 700000,
      markupPercent: 7.7,
      status: "ACTIVE",
      listedAt: "08:45 - 04/09/2026"
    },
    {
      id: "RSL_104",
      ticketCode: "TK-IDC-VIP-012",
      eventName: "Kịch Nói Cổ Tích Idecaf 2026",
      sellerName: "Trần Thị Mai",
      originalPrice: 200000,
      resalePrice: 200000,
      markupPercent: 0.0,
      status: "SOLD",
      listedAt: "01/09/2026"
    }
  ]);

  const handleUpdatePriceCap = () => {
    alert(`Đã cập nhật giá trần bán vé lại thành Max +${priceCapPercent}% (Tối đa ${100 + priceCapPercent}% giá gốc).`);
  };

  const handleToggleLockListing = (id: string) => {
    setResaleListings((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const nextStatus = item.status === "LOCKED" ? "ACTIVE" : "LOCKED";
          return { ...item, status: nextStatus };
        }
        return item;
      })
    );
  };

  const filteredListings = resaleListings.filter((item) => {
    return (
      item.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sellerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ticketCode.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const totalPages = Math.ceil(filteredListings.length / pageSize) || 1;
  const paginatedListings = filteredListings.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner Control Panel for Price Cap Config */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800 mb-1">
              <FiTrendingUp className="w-3.5 h-3.5" />
              <span>Chính sách Bảo vệ Người mua vé</span>
            </div>
            <h2 className="text-base font-bold app-text-main">
              Cấu hình Giá trần Niêm yết Bán vé lại (Resale Price Cap)
            </h2>
            <p className="text-xs app-text-muted mt-0.5">
              Kiểm soát mức chênh lệch giá tối đa so với giá gốc vé ban đầu nhằm ngăn chặn phe vé & đầu cơ.
            </p>
          </div>

          <button
            type="button"
            onClick={handleUpdatePriceCap}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-md shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
          >
            <FiSliders className="w-3.5 h-3.5" />
            <span>Lưu cấu hình giá trần</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Price Cap Percentage Slider & Input */}
          <div className="md:col-span-7 p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold app-text-main">
                Tỷ lệ giá trần bán lại tối đa (% chênh lệch)
              </label>
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-0.5 rounded-md border border-emerald-200 dark:border-emerald-800">
                Tối đa +{priceCapPercent}% (Bằng {100 + priceCapPercent}% giá gốc)
              </span>
            </div>

            <input
              type="range"
              min={0}
              max={50}
              step={5}
              value={priceCapPercent}
              onChange={(e) => setPriceCapPercent(Number(e.target.value))}
              className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-md appearance-none cursor-pointer accent-blue-600"
            />

            <div className="flex justify-between text-[10px] font-medium app-text-muted">
              <span>0% (Hòa vốn)</span>
              <span>+20% (Khuyên dùng)</span>
              <span>+50% (Tối đa)</span>
            </div>
          </div>

          {/* Toggle System Resale Feature */}
          <div className="md:col-span-5 p-4 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 space-y-2 flex items-center justify-between">
            <div className="space-y-0.5 pr-2">
              <span className="text-xs font-semibold app-text-main block">Thị trường Bán lại</span>
              <p className="text-[11px] app-text-muted">Tạm ngắt toàn bộ tính năng vé Resale khi cần bảo trì.</p>
            </div>
            <button
              type="button"
              onClick={() => setAllowResaleSystem(!allowResaleSystem)}
              className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer shrink-0 ${allowResaleSystem
                  ? "bg-emerald-600 text-white"
                  : "bg-slate-300 dark:bg-slate-700 text-slate-700 dark:text-slate-300"
                }`}
            >
              {allowResaleSystem ? "ĐANG MỞ" : "ĐÃ KHÓA"}
            </button>
          </div>
        </div>
      </div>

      {/* Scalping Alert Banner */}
      <div className="p-3 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300 text-xs font-medium flex items-center gap-2.5">
        <FiAlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
        <span>
          Cảnh báo thuật toán: Hệ thống phát hiện <span className="font-bold">1 niêm yết vé</span> nghi vấn phe vé (vượt giá trần +20%). Đã tự động giữ giao dịch.
        </span>
      </div>

      {/* Search & Listing Table */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
            <FiTag className="w-4 h-4 text-blue-600" />
            <span>Danh sách Vé đang niêm yết Resale ({filteredListings.length})</span>
          </h3>

          <div className="flex items-center gap-2 app-bg-subnav border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 max-w-xs w-full">
            <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo Mã vé, Người bán hoặc Sự kiện..."
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Resale Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Mã Vé</th>
                <th className="py-2.5 px-3">Tên Sự Kiện</th>
                <th className="py-2.5 px-3">Người Bán</th>
                <th className="py-2.5 px-3 text-right">Giá Gốc</th>
                <th className="py-2.5 px-3 text-right">Giá Niêm Yết</th>
                <th className="py-2.5 px-3 text-center">% Chênh Lệch</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedListings.map((item) => {
                const isOverCap = item.markupPercent > priceCapPercent;
                return (
                  <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                      {item.ticketCode}
                    </td>
                    <td className="py-3 px-3 font-bold app-text-main max-w-xs truncate">
                      {item.eventName}
                    </td>
                    <td className="py-3 px-3 app-text-main">{item.sellerName}</td>
                    <td className="py-3 px-3 text-right app-text-muted">
                      {item.originalPrice.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                      {item.resalePrice.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[11px] ${isOverCap
                            ? "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900"
                            : "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                          }`}
                      >
                        +{item.markupPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${item.status === "ACTIVE"
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            : item.status === "FLAGGED"
                              ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                              : item.status === "LOCKED"
                                ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500"
                          }`}
                      >
                        {item.status === "ACTIVE"
                          ? "Đang rao bán"
                          : item.status === "FLAGGED"
                            ? "Nghi vấn vi phạm"
                            : item.status === "LOCKED"
                              ? "Đã khóa vé"
                              : "Đã bán"}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleToggleLockListing(item.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer transition-all ${item.status === "LOCKED"
                            ? "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 border-emerald-200"
                            : "bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-900 hover:bg-rose-600 hover:text-white"
                          }`}
                      >
                        {item.status === "LOCKED" ? "Mở khóa vé" : "Khóa niêm yết"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredListings.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedListings.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{filteredListings.length}</span> niêm yết
            </span>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 font-semibold text-slate-700 dark:text-slate-300">
                Trang {currentPage} / {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-md border border-slate-200 dark:border-slate-800 app-bg-card disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <FiChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResaleManagement;
