import { useState } from "react";
import { FiTag, FiTrendingUp, FiShield, FiAlertOctagon, FiSearch, FiSliders, FiClock } from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";

export function ResaleManagement() {
  const [ticketSearch, setTicketSearch] = useState('');
  
  const stats = [
    { title: "Vé Đang Bán Lại", value: "3,250", subtext: "15% tổng vé sự kiện", icon: <FiTag className="w-4 h-4 text-blue-500" />, iconBgColor: "bg-blue-500/10", valueColor: "text-blue-600 dark:text-blue-400" },
    { title: "Giao Dịch Resale", value: "1,420", subtext: "Trong 24h qua", icon: <FiTrendingUp className="w-4 h-4 text-emerald-500" />, iconBgColor: "bg-emerald-500/10", valueColor: "text-emerald-600 dark:text-emerald-400" },
    { title: "Doanh Thu Resale", value: "125,000,000đ", subtext: "Phí giao dịch thu về (5%)", icon: <FiShield className="w-4 h-4 text-purple-500" />, iconBgColor: "bg-purple-500/10", valueColor: "text-purple-600 dark:text-purple-400" },
    { title: "Cảnh Báo Đầu Cơ", value: "12", subtext: "Tài khoản có rủi ro cao", icon: <FiAlertOctagon className="w-4 h-4 text-rose-500" />, iconBgColor: "bg-rose-500/10", valueColor: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản Lý Vé Bán Lại & Giá Trần (Resale Market)"
        description="Theo dõi thị trường thứ cấp, thiết lập luật giá trần chống vé chợ đen (Scalping) và tra cứu lịch sử vòng đời của từng chiếc vé."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <AdminStatCard key={idx} {...s} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Rule Engine & Scalper Radar */}
        <div className="space-y-6">
          {/* Rule Engine */}
          <div className="app-bg-card border app-border rounded-xl shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
                <FiSliders className="w-4 h-4 text-blue-500" />
                Bản Đồ Giá Trần (Dynamic Pricing Rules)
              </h3>
              <button className="text-[11px] font-bold text-blue-600 hover:underline">Thêm luật mới</button>
            </div>
            
            <div className="space-y-3">
              <div className="p-3 border app-border rounded-lg bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold rounded">Luật Mặc Định</span>
                    <span className="text-xs font-bold app-text-main">Toàn Hệ Thống</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Giá bán lại tối đa = <strong className="text-emerald-500">Giá gốc + 20%</strong></p>
                </div>
                <div className="w-10 h-5 rounded-full bg-blue-500 relative cursor-pointer"><div className="w-3.5 h-3.5 bg-white rounded-full absolute right-1 top-0.5"></div></div>
              </div>

              <div className="p-3 border app-border rounded-lg bg-slate-50 dark:bg-slate-800/30 flex items-center justify-between opacity-80">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2 py-0.5 bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 text-[10px] font-bold rounded">Luật Sát Ngày</span>
                    <span className="text-xs font-bold app-text-main">Trước giờ G (24h)</span>
                  </div>
                  <p className="text-[11px] text-slate-500">Giá bán lại tối đa = <strong className="text-rose-500">Bằng Giá Gốc (0% Lời)</strong></p>
                </div>
                <div className="w-10 h-5 rounded-full bg-slate-300 dark:bg-slate-600 relative cursor-pointer"><div className="w-3.5 h-3.5 bg-white rounded-full absolute left-1 top-0.5"></div></div>
              </div>
            </div>
          </div>

          {/* Scalper Radar */}
          <div className="app-bg-card border border-rose-200 dark:border-rose-900/50 rounded-xl shadow-xs p-5 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-rose-500"></div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-sm text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <FiAlertOctagon className="w-4 h-4" />
                Giám sát Đầu Cơ (Scalper Radar)
              </h3>
            </div>
            
            <p className="text-xs app-text-muted mb-4">Thuật toán phát hiện các tài khoản có hành vi gom vé và xả vé số lượng lớn.</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
                <div>
                  <p className="text-xs font-bold app-text-main">truong***@gmail.com</p>
                  <p className="text-[10px] text-rose-500 font-medium mt-0.5">Mua 8 vé VIP, list bán lại cả 8 vé sau 1 giờ.</p>
                </div>
                <button className="px-2.5 py-1 bg-rose-600 text-white text-[10px] font-bold rounded hover:bg-rose-700">Khóa tính năng mua</button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Ticket Provenance */}
        <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 h-full flex flex-col">
          <h3 className="font-bold text-sm app-text-main flex items-center gap-2 mb-4">
            <FiClock className="w-4 h-4 text-purple-500" />
            Lịch sử Vòng đời Vé (Provenance)
          </h3>
          
          <div className="relative mb-6">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Nhập mã vé (Ví dụ: TKT-A8F29X)..." 
              className="w-full pl-9 pr-3 py-2 text-sm rounded-md border app-border app-bg-card focus:border-purple-500 outline-none transition-colors font-mono" 
              value={ticketSearch}
              onChange={(e) => setTicketSearch(e.target.value)}
            />
          </div>

          <div className="flex-1 rounded-lg app-bg-subnav border app-border p-5 flex flex-col justify-center relative">
            {!ticketSearch ? (
              <div className="text-center">
                <div className="w-12 h-12 bg-slate-200 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-3">
                  <FiSearch className="w-5 h-5 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">Tra cứu ID vé để xem dòng đời giao dịch</p>
              </div>
            ) : (
              <div className="relative pl-6 space-y-6 before:absolute before:inset-y-2 before:left-[11px] before:w-0.5 before:bg-slate-200 dark:before:bg-slate-700">
                {/* Timeline Node 1 */}
                <div className="relative">
                  <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-emerald-500 border-4 app-border z-10 shadow-sm"></div>
                  <div className="app-bg-card border app-border p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Mua gốc (Primary Market)</span>
                      <span className="text-[10px] text-slate-500">20/10/2026 09:00</span>
                    </div>
                    <p className="text-[11px] app-text-main">Tài khoản <strong>david.nguyen@email.com</strong> thanh toán 1,500,000đ.</p>
                  </div>
                </div>

                {/* Timeline Node 2 */}
                <div className="relative">
                  <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-blue-500 border-4 app-border z-10 shadow-sm"></div>
                  <div className="app-bg-card border app-border p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-blue-600 dark:text-blue-400">Niêm yết bán lại (Resale Listed)</span>
                      <span className="text-[10px] text-slate-500">22/10/2026 14:30</span>
                    </div>
                    <p className="text-[11px] app-text-main">Niêm yết giá <strong>1,800,000đ</strong> (Hợp lệ, nằm trong khung +20% trần).</p>
                  </div>
                </div>

                {/* Timeline Node 3 */}
                <div className="relative">
                  <div className="absolute -left-[30px] w-4 h-4 rounded-full bg-purple-500 border-4 app-border z-10 shadow-sm"></div>
                  <div className="app-bg-card border app-border p-3 rounded-lg shadow-sm">
                    <div className="flex justify-between items-start mb-1">
                      <span className="text-xs font-bold text-purple-600 dark:text-purple-400">Đã bán lại thành công</span>
                      <span className="text-[10px] text-slate-500">24/10/2026 20:15</span>
                    </div>
                    <p className="text-[11px] app-text-main">Người mua mới: <strong>anna.tran@email.com</strong>. Cập nhật QR Code mới.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}

export default ResaleManagement;