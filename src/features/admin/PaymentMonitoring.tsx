import React, { useState } from "react";
import {
  FiDollarSign,
  FiSearch,
  FiRefreshCw,
  FiArrowUpRight,
  FiArrowDownLeft,
  FiShield,
  FiChevronLeft,
  FiChevronRight
} from "react-icons/fi";

interface TransactionLog {
  id: string;
  txCode: string;
  eventName: string;
  buyerName: string;
  amount: number;
  gateway: "VNPAY" | "ZALOPAY" | "MOMO" | "BANK_TRANSFER";
  type: "PRIMARY_BOOKING" | "RESALE_ESCROW" | "ORGANIZER_PAYOUT";
  status: "SUCCESS" | "PENDING" | "FAILED";
  timestamp: string;
}

export const PaymentMonitoring: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "RESALE_ESCROW" | "ORGANIZER_PAYOUT">("ALL");

  // pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const gatewayHealth = [
    { name: "VNPAY Gateway", status: "HEALTHY", uptime: "100%", latency: "140ms" },
    { name: "ZaloPay Wallet", status: "HEALTHY", uptime: "99.8%", latency: "165ms" },
    { name: "MoMo Wallet", status: "HEALTHY", uptime: "99.9%", latency: "180ms" },
    { name: "VietQR / Bank", status: "HEALTHY", uptime: "100%", latency: "95ms" }
  ];

  const [transactions, setTransactions] = useState<TransactionLog[]>([
    {
      id: "TX_8801",
      txCode: "HALO-VNP-99201",
      eventName: "Sơn Tùng M-TP Sky Tour 2026",
      buyerName: "Trần Long Vũ",
      amount: 1750000,
      gateway: "VNPAY",
      type: "RESALE_ESCROW",
      status: "SUCCESS",
      timestamp: "21:10 - 04/09/2026"
    },
    {
      id: "TX_8802",
      txCode: "HALO-ZAL-40291",
      eventName: "Saigon Night Run 2026",
      buyerName: "Nguyễn Văn Nam",
      amount: 650000,
      gateway: "ZALOPAY",
      type: "PRIMARY_BOOKING",
      status: "SUCCESS",
      timestamp: "20:45 - 04/09/2026"
    },
    {
      id: "TX_8803",
      txCode: "HALO-POUT-0012",
      eventName: "Kịch Nói Idecaf 2026",
      buyerName: "Nhà Hát Idecaf TP.HCM",
      amount: 45000000,
      gateway: "BANK_TRANSFER",
      type: "ORGANIZER_PAYOUT",
      status: "SUCCESS",
      timestamp: "18:00 - 04/09/2026"
    },
    {
      id: "TX_8804",
      txCode: "HALO-MOM-11029",
      eventName: "Sơn Tùng M-TP Sky Tour 2026",
      buyerName: "Phạm Quốc Anh",
      amount: 450000,
      gateway: "MOMO",
      type: "PRIMARY_BOOKING",
      status: "FAILED",
      timestamp: "17:30 - 04/09/2026"
    }
  ]);

  const handleRetryTx = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: "SUCCESS" } : t))
    );
  };

  const filteredTxs = transactions.filter((t) => {
    const matchesTab = activeTab === "ALL" ? true : t.type === activeTab;
    const matchesQuery =
      t.txCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.eventName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.buyerName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesQuery;
  });

  const totalPages = Math.ceil(filteredTxs.length / pageSize) || 1;
  const paginatedTxs = filteredTxs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Gateway Health Status Matrix */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {gatewayHealth.map((g, i) => (
          <div key={i} className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-md p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold app-text-main">{g.name}</span>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-bold text-emerald-500">{g.uptime}</span>
              <span className="text-[10px] font-mono app-text-muted">{g.latency}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Main Ledger Table */}
      <div className="app-bg-card border border-slate-200 dark:border-slate-800 rounded-lg p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold app-text-main flex items-center gap-2">
              <FiDollarSign className="w-4 h-4 text-blue-600" />
              <span>Nhật ký Giao dịch Escrow & Thanh toán ({filteredTxs.length})</span>
            </h3>
            <p className="text-xs app-text-muted mt-0.5">Giám sát dòng tiền đặt vé, tạm giữ trung gian Escrow và Payout cho Ban tổ chức</p>
          </div>

          <div className="flex items-center gap-2 app-bg-subnav border border-slate-200 dark:border-slate-800 rounded-md px-3 py-1.5 max-w-xs w-full">
            <FiSearch className="w-4 h-4 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Tìm theo Mã GD, Sự kiện..."
              className="w-full bg-transparent app-text-main text-xs focus:outline-none placeholder-slate-400 font-medium"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {[
            { id: "ALL", label: "Tất cả giao dịch" },
            { id: "RESALE_ESCROW", label: "Tạm giữ Vé Resale (Escrow)" },
            { id: "ORGANIZER_PAYOUT", label: "Giải ngân Payout BTC" }
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id as any);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer ${activeTab === tab.id
                  ? "bg-blue-600 text-white shadow-xs"
                  : "app-bg-subnav app-text-muted hover:app-text-main border border-slate-200 dark:border-slate-800"
                }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Transaction Table */}
        <div className="overflow-x-auto no-scrollbar">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 app-text-muted font-bold text-[11px] uppercase tracking-wider">
                <th className="py-2.5 px-3">Mã Giao Dịch</th>
                <th className="py-2.5 px-3">Loại Giao Dịch</th>
                <th className="py-2.5 px-3">Sự Kiện & Đối Tác</th>
                <th className="py-2.5 px-3 text-right">Số Tiền (VNĐ)</th>
                <th className="py-2.5 px-3 text-center">Cổng Thanh Toán</th>
                <th className="py-2.5 px-3 text-center">Trạng Thái</th>
                <th className="py-2.5 px-3 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {paginatedTxs.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-blue-600 dark:text-blue-400">
                    {t.txCode}
                  </td>
                  <td className="py-3 px-3 font-bold app-text-main">
                    {t.type === "RESALE_ESCROW" ? (
                      <span className="text-amber-500 flex items-center gap-1">
                        <FiShield className="w-3.5 h-3.5" /> Escrow Resale
                      </span>
                    ) : t.type === "ORGANIZER_PAYOUT" ? (
                      <span className="text-emerald-500 flex items-center gap-1">
                        <FiArrowUpRight className="w-3.5 h-3.5" /> Payout BTC
                      </span>
                    ) : (
                      <span className="text-blue-500 flex items-center gap-1">
                        <FiArrowDownLeft className="w-3.5 h-3.5" /> Mua vé gốc
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 app-text-main max-w-xs">
                    <span className="block font-bold truncate">{t.eventName}</span>
                    <span className="text-[11px] app-text-muted truncate">{t.buyerName}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-blue-600 dark:text-blue-400">
                    {t.amount.toLocaleString("vi-VN")} đ
                  </td>
                  <td className="py-3 px-3 text-center font-bold">
                    <span className="px-2 py-0.5 rounded-md app-bg-subnav border border-slate-200 dark:border-slate-800 text-[11px]">
                      {t.gateway}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${t.status === "SUCCESS"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                          : t.status === "PENDING"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                            : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
                        }`}
                    >
                      {t.status === "SUCCESS" ? "Thành công" : t.status === "PENDING" ? "Đang xử lý" : "Thất bại"}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right">
                    {t.status === "FAILED" && (
                      <button
                        type="button"
                        onClick={() => handleRetryTx(t.id)}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold rounded-md cursor-pointer transition-all flex items-center gap-1 ml-auto"
                      >
                        <FiRefreshCw className="w-3 h-3" />
                        <span>Thử lại</span>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {filteredTxs.length > 0 && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500">
            <span>
              Hiển thị <span className="font-bold text-slate-900 dark:text-slate-100">{paginatedTxs.length}</span> trên tổng số <span className="font-bold text-slate-900 dark:text-slate-100">{filteredTxs.length}</span> giao dịch
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

export default PaymentMonitoring;
