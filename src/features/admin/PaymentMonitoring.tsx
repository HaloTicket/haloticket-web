import { useState } from "react";
import { FiCheckCircle, FiDollarSign, FiClock, FiAlertTriangle, FiSearch, FiFilter, FiDownload, FiCheck } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

export function PaymentMonitoring() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED' | 'DISPUTE'>('PENDING');

  const stats = [
    { title: "Tổng Doanh Thu (Gross)", value: "14,500,000,000đ", subtext: "Tháng này: +12%", icon: <FiDollarSign className="w-4 h-4 text-emerald-500" />, iconBgColor: "bg-emerald-500/10", valueColor: "text-emerald-600 dark:text-emerald-400" },
    { title: "Tiền Tạm Giữ (Escrow)", value: "4,200,000,000đ", subtext: "Chưa đối soát cho BTC", icon: <FiClock className="w-4 h-4 text-amber-500" />, iconBgColor: "bg-amber-500/10", valueColor: "text-amber-600 dark:text-amber-400" },
    { title: "Hoa Hồng Hệ Thống", value: "850,000,000đ", subtext: "Lợi nhuận ròng", icon: <FiCheckCircle className="w-4 h-4 text-blue-500" />, iconBgColor: "bg-blue-500/10", valueColor: "text-blue-600 dark:text-blue-400" },
    { title: "Giao Dịch Cảnh Báo", value: "24", subtext: "Đang chờ hoàn tiền/tranh chấp", icon: <FiAlertTriangle className="w-4 h-4 text-rose-500" />, iconBgColor: "bg-rose-500/10", valueColor: "text-rose-600 dark:text-rose-400" },
  ];

  const pendingSettlements = [
    { id: "SET-1029", event: "The Eras Tour - Đêm 1", organizer: "TST Entertainment", ticketsSold: 4500, gross: "9,000,000,000đ", feeRate: "5%", platformFee: "450,000,000đ", netPayout: "8,550,000,000đ", date: "24/10/2026", status: "Chờ duyệt" },
    { id: "SET-1030", event: "Rap Việt All-Star Concert", organizer: "Vie Channel", ticketsSold: 2100, gross: "2,100,000,000đ", feeRate: "5%", platformFee: "105,000,000đ", netPayout: "1,995,000,000đ", date: "25/10/2026", status: "Chờ duyệt" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản Lý Tài Chính & Đối Soát"
        description="Giám sát dòng tiền vào (Gross), tiền ký quỹ (Escrow), doanh thu nền tảng và phê duyệt các lệnh thanh toán (Payout) cho Ban tổ chức."
        actions={
          <div className="flex items-center gap-3">
            <button className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md app-bg-card border app-border app-text-main hover:brightness-95 transition-colors">
              <FiDownload className="w-3.5 h-3.5" />
              <span>Xuất Báo Cáo BCTC</span>
            </button>
          </div>
        }
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <AdminStatCard key={idx} {...s} />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Tabs */}
        <div className="flex items-center border-b app-border px-2 pt-2">
          <button 
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Chờ Đối Soát (2)
          </button>
          <button 
            onClick={() => setActiveTab('COMPLETED')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors ${activeTab === 'COMPLETED' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Đã Thanh Toán
          </button>
          <button 
            onClick={() => setActiveTab('DISPUTE')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-1.5 ${activeTab === 'DISPUTE' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <FiAlertTriangle className="w-3.5 h-3.5" /> Tranh chấp / Hoàn tiền
          </button>
        </div>

        {/* Toolbar */}
        <div className="p-4 border-b app-border flex items-center justify-between gap-4 app-bg-subnav">
          <div className="relative w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Tìm tên sự kiện, mã đối soát..." className="w-full pl-9 pr-3 py-1.5 text-xs rounded-md border app-border app-bg-card focus:border-blue-500 outline-none transition-colors" />
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border app-border app-bg-card hover:brightness-95 transition-colors text-slate-600 dark:text-slate-300">
            <FiFilter className="w-3.5 h-3.5" /> Lọc
          </button>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b app-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">Mã đối soát</th>
                <th className="px-4 py-3">Sự kiện & BTC</th>
                <th className="px-4 py-3 text-right">Tổng thu (Gross)</th>
                <th className="px-4 py-3 text-right">Phí nền tảng</th>
                <th className="px-4 py-3 text-right">Thực nhận (Net Payout)</th>
                <th className="px-4 py-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y app-border text-xs app-text-main font-medium">
              {activeTab === 'PENDING' ? pendingSettlements.map(item => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-4 py-3 font-mono text-blue-600 dark:text-blue-400">{item.id}</td>
                  <td className="px-4 py-3">
                    <p className="font-bold">{item.event}</p>
                    <p className="text-[11px] text-slate-500">{item.organizer}</p>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <p>{item.gross}</p>
                    <p className="text-[11px] text-slate-500">{item.ticketsSold} vé</p>
                  </td>
                  <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400">
                    <p>-{item.platformFee}</p>
                    <p className="text-[11px]">Cắt {item.feeRate}</p>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{item.netPayout}</td>
                  <td className="px-4 py-3 text-center">
                    <button className="inline-flex items-center gap-1 px-3 py-1.5 gradient-btn text-white rounded font-bold shadow-sm hover:-translate-y-0.5 transition-all">
                      <FiCheck className="w-3.5 h-3.5" /> Duyệt Payout
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                    Chưa có dữ liệu cho mục này.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PaymentMonitoring;