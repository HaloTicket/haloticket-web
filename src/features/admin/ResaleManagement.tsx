import { useState, useEffect } from "react";
import { FiTag, FiTrendingUp, FiShield, FiAlertOctagon, FiSliders, FiCpu, FiLoader, FiSave } from "react-icons/fi";
import { LuSearch } from "react-icons/lu";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CustomSelect } from "@/components/common/CustomSelect";
import { marketplaceApi } from "@/services/marketplaceApi";
import { aiApi } from "@/services/aiApi";
import type { ResaleEventSummary, TicketListing } from "@/types/marketplace";
import { toast } from "react-hot-toast";

export function ResaleManagement() {
  const [ticketSearch, setTicketSearch] = useState('');
  const [capPercentage, setCapPercentage] = useState(20);
  const [filterEvent, setFilterEvent] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<{ suggested_cap_percent: number, reason: string } | null>(null);

  const [resaleTickets, setResaleTickets] = useState<TicketListing[]>([]);
  const [events, setEvents] = useState<ResaleEventSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'LISTINGS' | 'SCALPERS'>('LISTINGS');

  // secondary market (Resale) fee configuration
  const [secondaryTotalFee, setSecondaryTotalFee] = useState<number>(9.0);
  const [secondarySellerFee, setSecondarySellerFee] = useState<number>(5.0);
  const [secondaryBuyerFee, setSecondaryBuyerFee] = useState<number>(4.0);
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Load resale fee config and cap from localStorage
  useEffect(() => {
    const savedCap = localStorage.getItem("haloticket_resale_cap_percentage");
    if (savedCap) {
      const numCap = Number(savedCap);
      if (!isNaN(numCap)) setCapPercentage(numCap);
    }
    const saved = localStorage.getItem("haloticket_resale_fee_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.secondaryTotalFee) setSecondaryTotalFee(parsed.secondaryTotalFee);
        if (parsed.secondarySellerFee) setSecondarySellerFee(parsed.secondarySellerFee);
        if (parsed.secondaryBuyerFee) setSecondaryBuyerFee(parsed.secondaryBuyerFee);
        if (parsed.capPercentage !== undefined && !savedCap) setCapPercentage(parsed.capPercentage);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const handleSaveResaleFeeConfig = () => {
    setIsSavingFee(true);
    try {
      const config = {
        secondaryTotalFee,
        secondarySellerFee,
        secondaryBuyerFee,
        capPercentage,
      };
      localStorage.setItem("haloticket_resale_fee_config", JSON.stringify(config));
      localStorage.setItem("haloticket_resale_cap_percentage", capPercentage.toString());
      toast.success("Đã cập nhật cấu hình % phí và giá trần bán lại thứ cấp thành công!");
    } catch (e) {
      toast.error("Không thể lưu cấu hình phí.");
    } finally {
      setIsSavingFee(false);
    }
  };

  const activeListings = resaleTickets.filter(t => t.status === 'ACTIVE').length;
  const totalListedValue = resaleTickets.reduce((sum, t) => sum + t.price, 0);
  const expectedFee = totalListedValue * (secondaryTotalFee / 100);

  const stats = [
    { title: "Vé Đang Bán Lại", value: activeListings.toString(), subtext: "Cho sự kiện đang chọn", icon: <FiTag className="w-4 h-4 text-blue-500" />, iconBgColor: "bg-blue-500/10", valueColor: "text-blue-600 dark:text-blue-400" },
    { title: "Giá Trị Đang Niêm Yết", value: `${totalListedValue.toLocaleString('vi-VN')}đ`, subtext: "Tổng giá trị vé", icon: <FiTrendingUp className="w-4 h-4 text-emerald-500" />, iconBgColor: "bg-emerald-500/10", valueColor: "text-emerald-600 dark:text-emerald-400" },
    { title: "Phí Giao Dịch Dự Kiến", value: `${expectedFee.toLocaleString('vi-VN')}đ`, subtext: `Tạm tính (${secondaryTotalFee}%)`, icon: <FiShield className="w-4 h-4 text-purple-500" />, iconBgColor: "bg-purple-500/10", valueColor: "text-purple-600 dark:text-purple-400" },
    { title: "Cảnh Báo Đầu Cơ", value: "0", subtext: "Đang cập nhật", icon: <FiAlertOctagon className="w-4 h-4 text-rose-500" />, iconBgColor: "bg-rose-500/10", valueColor: "text-rose-600 dark:text-rose-400" },
  ];

  // fetch Events
  useEffect(() => {
    marketplaceApi.getResaleEvents()
      .then(data => {
        setEvents(data || []);
      })
      .catch(console.error);
  }, []);

  // fetch Listings based on event
  useEffect(() => {
    if (filterEvent && filterEvent !== 'ALL') {
      setIsLoading(true);
      marketplaceApi.getEventListings(filterEvent, 0, 100)
        .then(data => {
          setResaleTickets(data?.content || []);
        })
        .catch(console.error)
        .finally(() => setIsLoading(false));
    } else {
      setResaleTickets([]);
    }
  }, [filterEvent]);

  const [aiTargetEvent, setAiTargetEvent] = useState('ALL');
  const [aiTargetDemand, setAiTargetDemand] = useState('HIGH');

  const handleAnalyzeAI = async () => {
    if (!aiTargetEvent || aiTargetEvent === 'ALL') {
      toast.error("Vui lòng chọn một sự kiện để phân tích.");
      return;
    }
    setAiLoading(true);
    setAiAnalysis(null);
    try {
      const response = await aiApi.getDynamicPriceCeiling(aiTargetEvent, aiTargetDemand);
      setAiAnalysis(response);
    } catch (error) {
      console.error(error);
      toast.error("Lỗi khi kết nối AI Engine.");
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản Lý Vé Bán Lại & Giá Trần (Resale Market)"
        description="Theo dõi thị trường thứ cấp, thiết lập luật giá trần chống vé chợ đen (Scalping) và kiểm soát chính sách phí giao dịch bán lại an toàn."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => (
          <AdminStatCard key={idx} {...s} />
        ))}
      </div>

      {/* Top 2 Cards: AI Dynamic Cap & Ceiling Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Col 1: AI Dynamic Cap */}
        <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4 border-b app-border pb-4">
            <div>
              <h3 className="font-bold text-sm app-text-main flex items-center gap-2 mb-1">
                <FiCpu className="w-4 h-4 text-indigo-500" />
                Đề Xuất Giá Trần Động (AI Dynamic Cap)
              </h3>
              <p className="text-[11px] text-slate-500">AI phân tích dữ liệu thị trường để gợi ý giới hạn giá bán lại.</p>
            </div>
            {aiAnalysis && (
              <div className="flex flex-col items-end">
                <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">Đề xuất hiện tại</p>
                <p className="text-xl font-black text-emerald-500">+{aiAnalysis.suggested_cap_percent}%</p>
              </div>
            )}
          </div>
            
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold app-text-main mb-1.5">Sự kiện cần phân tích</label>
              <CustomSelect 
                options={[{ value: 'ALL', label: 'Chọn sự kiện...' }, ...events.map(e => ({ value: e.eventId, label: e.eventName || e.eventId }))]}
                value={aiTargetEvent}
                onChange={setAiTargetEvent}
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold app-text-main mb-1.5">Mức độ quan tâm (Demand)</label>
              <CustomSelect 
                options={[
                  { value: 'HIGH', label: 'Cao (Viral, cháy vé)' },
                  { value: 'MEDIUM', label: 'Trung bình' },
                  { value: 'LOW', label: 'Thấp' }
                ]}
                value={aiTargetDemand}
                onChange={setAiTargetDemand}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-auto">
            <button 
              onClick={handleAnalyzeAI}
              disabled={aiLoading}
              className="inline-flex items-center min-h-9 gap-2 px-4 text-[11px] font-bold rounded-md bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
            >
              {aiLoading ? <FiLoader className="w-3.5 h-3.5 animate-spin" /> : <FiCpu className="w-3.5 h-3.5" />}
              {aiLoading ? "Đang phân tích..." : "Phân tích Giá Trần"}
            </button>
            {aiAnalysis && (
              <button 
                onClick={() => {
                  setCapPercentage(aiAnalysis.suggested_cap_percent);
                  localStorage.setItem("haloticket_resale_cap_percentage", aiAnalysis.suggested_cap_percent.toString());
                  toast.success(`Đã áp dụng giá trần gợi ý +${aiAnalysis.suggested_cap_percent}%`);
                }}
                className="inline-flex items-center min-h-9 gap-2 px-4 text-[11px] font-bold rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors cursor-pointer"
              >
                Áp dụng +{aiAnalysis.suggested_cap_percent}%
              </button>
            )}
          </div>
          
          {aiAnalysis && (
            <div className="mt-4 p-3 bg-slate-50 dark:bg-slate-800/30 rounded-lg border app-border">
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                <strong>AI Reasoning:</strong> {aiAnalysis.reason}
              </p>
            </div>
          )}
        </div>

        {/* Col 2: Settings */}
        <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 relative flex flex-col h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-blue-500" />
              Thiết Lập Giá Trần Mặc Định
            </h3>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
              Đang áp dụng: +{capPercentage}%
            </span>
          </div>
          
          <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/30 border app-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 text-[10px] font-bold rounded">Toàn Hệ Thống</span>
              </div>
              <p className="text-xs font-bold text-emerald-500">+{capPercentage}% Giá Gốc</p>
            </div>
            
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={capPercentage} 
              onChange={(e) => {
                const val = Number(e.target.value);
                setCapPercentage(val);
                localStorage.setItem("haloticket_resale_cap_percentage", val.toString());
              }}
              className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 mb-2"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              <span>0% (Bán lỗ/gốc)</span>
              <span>100% (Giá x2)</span>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30">
            <h3 className="font-bold text-xs text-rose-600 dark:text-rose-400 flex items-center gap-2 mb-2">
              <FiAlertOctagon className="w-3.5 h-3.5" />
              Quy tắc sát giờ G (24h)
            </h3>
            <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium">Tự động chặn bán lại vé có giá cao hơn giá gốc (0%) trong vòng 24h trước khi sự kiện diễn ra để ngăn xả vé chợ đen phút chót.</p>
          </div>
        </div>
      </div>

      {/* Cấu Hình & Bóc Tách % Phí Bán Lại An Toàn (Secondary Marketplace - Resale Fee) */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b app-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-purple-600 text-white">Thị Trường Thứ Cấp (Resale)</span>
              <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
                <FiShield className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Cơ Cấu & Bóc Tách % Phí Giao Dịch Bán Lại An Toàn
              </h3>
            </div>
            <p className="text-xs app-text-muted">
              Chính sách phân bổ phí giao dịch, bảo hiểm xác thực vé thật 100% và cơ chế chống phe vé đầu cơ.
            </p>
          </div>
          <button 
            type="button"
            disabled={isSavingFee}
            onClick={handleSaveResaleFeeConfig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg shadow-sm text-xs font-bold transition-all cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{isSavingFee ? "Đang lưu..." : "Lưu Cấu Hình Phí Bán Lại"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 1. Tổng phí thu */}
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/80 dark:border-purple-800/80 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Tổng Phí Thu Giao Dịch</label>
              <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold bg-white dark:bg-zinc-800 px-2 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                Khuyến nghị: 8% – 10%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full text-base font-black p-2 rounded-lg border border-purple-200 dark:border-purple-700 bg-white dark:bg-zinc-900 text-purple-600 dark:text-purple-400">
                {secondaryTotalFee}%
              </div>
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-purple-600/80 dark:text-purple-300/80 font-medium">
              = Phí Người Bán ({secondarySellerFee}%) + Phí Người Mua ({secondaryBuyerFee}%)
            </p>
          </div>

          {/* 2. Thu người bán */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thu Người Bán (Seller Fee)</label>
              <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold bg-rose-50 dark:bg-rose-900/30 px-2 py-0.5 rounded border border-rose-200 dark:border-rose-800">
                Chống đầu cơ, găm vé
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.5" 
                min="1" 
                max="15"
                value={secondarySellerFee}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSecondarySellerFee(val);
                  setSecondaryTotalFee(Number((val + secondaryBuyerFee).toFixed(1)));
                }}
                className="w-full text-base font-black p-2 rounded-lg border app-border app-text-main bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Giảm thiểu tình trạng phe vé cố tình đầu cơ tích trữ vé số lượng lớn.
            </p>
          </div>

          {/* 3. Thu người mua */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Thu Người Mua (Buyer Fee)</label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                Phí bảo hiểm: 3% – 5%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.5" 
                min="1" 
                max="15"
                value={secondaryBuyerFee}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setSecondaryBuyerFee(val);
                  setSecondaryTotalFee(Number((secondarySellerFee + val).toFixed(1)));
                }}
                className="w-full text-base font-black p-2 rounded-lg border app-border app-text-main bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-purple-500/30"
              />
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Phí dịch vụ đảm bảo 100% vé thật, lưu giữ escrow và tái cấp mã QR mới.
            </p>
          </div>
        </div>

        {/* Lý do vì sao tính % cao hơn vé sơ cấp */}
        <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-900 dark:text-purple-300 leading-relaxed space-y-2">
          <div className="flex items-center gap-2 font-bold text-sm text-purple-700 dark:text-purple-300">
            <FiShield className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0" />
            <span>Vì sao mức phí bán lại (8% – 10%) cao hơn thị trường vé sơ cấp (5% – 6%)?</span>
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            Nền tảng phải gánh chịu chi phí công nghệ & vận hành bảo vệ giao dịch lớn hơn đáng kể:
          </p>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-[11px] text-slate-600 dark:text-slate-300 font-medium list-none">
            <li className="flex items-start gap-1.5">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Xác thực eKYC người bán:</strong> Kiểm duyệt căn cước/sinh trắc học chặt chẽ để truy vết nguồn gốc và quyền sở hữu vé.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Tài khoản ký quỹ Escrow:</strong> Tạm giữ tiền an toàn và chỉ giải ngân sau khi vé được sang tên thành công.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Hủy mã QR cũ & Tạo mã QR mới:</strong> Tự động vô hiệu hóa mã QR của người bán trong DB và tạo mới 100% QR bảo mật cho người mua.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <span className="text-purple-500 font-bold">•</span>
              <span><strong>Cam kết 100% vé thật:</strong> Loại bỏ hoàn toàn rủi ro chuyển tiền rồi bị "chặn liên lạc" như mua vé trôi nổi trên mạng xã hội.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* List tickets on resale */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Tabs with Badge */}
        <div className="flex items-center border-b app-border px-2 pt-2">
          <button 
            onClick={() => setActiveTab('LISTINGS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'LISTINGS' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            Quản Lý Vé Bán Lại
            {resaleTickets.length > 0 && (
              <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold shadow-sm">
                {resaleTickets.length}
              </span>
            )}
          </button>
          <button 
            onClick={() => setActiveTab('SCALPERS')}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${activeTab === 'SCALPERS' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <FiAlertOctagon className="w-3.5 h-3.5" />
            Giám sát Đầu Cơ (Radar)
          </button>
        </div>

        {activeTab === 'LISTINGS' ? (
          <>
            <div className="p-4 border-b app-border flex flex-col sm:flex-row items-center justify-between gap-4 app-bg-subnav">
              <div className="relative w-full sm:w-64">
                <LuSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input type="text" value={ticketSearch} onChange={(e) => setTicketSearch(e.target.value)} placeholder="Tìm ID vé, sự kiện..." className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" />
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="w-48">
                  <CustomSelect 
                    options={[{ value: 'ALL', label: 'Lọc theo sự kiện' }, ...events.map(e => ({ value: e.eventId, label: e.eventName || e.eventId }))]}
                    value={filterEvent}
                    onChange={setFilterEvent}
                  />
                </div>
                <div className="w-36">
                  <CustomSelect 
                    options={[
                      { value: 'ALL', label: 'Mọi trạng thái' },
                      { value: 'ACTIVE', label: 'Đang bán' },
                      { value: 'RESERVED', label: 'Đang giao dịch' }
                    ]}
                    value={filterStatus}
                    onChange={setFilterStatus}
                  />
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-800/40 border-b app-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Listing ID / Ticket</th>
                    <th className="px-4 py-3 text-right">Giá Gốc</th>
                    <th className="px-4 py-3 text-right">Giá Bán Lại</th>
                    <th className="px-4 py-3 text-right">Chênh Lệch</th>
                    <th className="px-4 py-3 text-center">Trạng Thái</th>
                    <th className="px-4 py-3 text-center">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs app-text-main font-medium">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                        Đang tải danh sách vé...
                      </td>
                    </tr>
                  ) : resaleTickets.length > 0 ? (
                    resaleTickets.map(ticket => {
                      const originalPrice = ticket.originalPrice || 1000000;
                      const diff = ticket.price - originalPrice;
                      const diffPercent = (diff / originalPrice) * 100;
                      const isWarning = diffPercent > capPercentage;
                      
                      return (
                        <tr key={ticket.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          <td className="px-4 py-3">
                            <span className="block font-mono text-blue-600 dark:text-blue-400 font-bold truncate max-w-[150px]" title={ticket.id}>{ticket.id}</span>
                            <span className="text-[10px] text-slate-500 font-mono">Vé: {ticket.ticketId}</span>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-slate-500">{originalPrice.toLocaleString('vi-VN')}đ</td>
                          <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">{ticket.price.toLocaleString('vi-VN')}đ</td>
                          <td className="px-4 py-3 text-right">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold border ${isWarning ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-900/50' : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/50'}`}>
                              <FiTrendingUp className={`w-3 h-3 ${isWarning ? 'text-rose-500' : 'text-emerald-500'}`} />
                              {diff > 0 ? '+' : ''}{diff.toLocaleString('vi-VN')}đ ({diffPercent.toFixed(1)}%)
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700">{ticket.status}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 transition-colors cursor-pointer">Gỡ bài bán</button>
                          </td>
                        </tr>
                      );
                    })
                  ) : filterEvent === 'ALL' ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        Vui lòng chọn sự kiện để xem danh sách vé đang bán lại.
                      </td>
                    </tr>
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                        Không có vé nào đang bán lại cho sự kiện này.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="p-5">
            <div className="p-4 rounded-lg bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 mb-4">
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-bold app-text-main">truong***@gmail.com</p>
                </div>
                <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400">Rủi ro cao</span>
              </div>
              <p className="text-[11px] text-rose-700/80 dark:text-rose-300/80 font-medium mb-3">Hành vi: Mua 8 vé VIP lúc 09:00, list bán lại cả 8 vé trên chợ đen sau 1 giờ với giá +150%.</p>
              <button className="px-4 min-h-8 bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-bold rounded-md transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <FiShield className="w-3.5 h-3.5" /> Khóa tài khoản & Thu hồi vé
              </button>
            </div>
            <p className="text-xs text-slate-500 text-center py-8">Chưa phát hiện thêm hành vi đáng ngờ nào khác.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ResaleManagement;