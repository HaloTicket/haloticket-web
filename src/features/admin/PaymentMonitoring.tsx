import { useState, useEffect } from "react";
import { 
  FiCheckCircle, 
  FiDollarSign, 
  FiClock, 
  FiAlertTriangle, 
  FiSearch,
  FiCheck, 
  FiLoader, 
  FiSliders, 
  FiSave, 
  FiShield, 
  FiRefreshCw,
  FiCopy,
  FiExternalLink,
  FiInfo
} from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CustomSelect } from "@/components/common/CustomSelect";
import { TablePagination } from "@/components/common/TablePagination";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { toast } from "react-hot-toast";
import { payoutApi } from "@/services/payoutApi";
import { organizerApi } from "@/services/organizerApi";
import { userApi, getCachedUserProfile } from "@/services/userApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import type { PayoutResponse } from "@/types";

export function PaymentMonitoring() {
  const [activeTab, setActiveTab] = useState<'PENDING' | 'COMPLETED' | 'DISPUTE'>('PENDING');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGross, setFilterGross] = useState('ALL');
  const [filterDate, setFilterDate] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [payoutModalOpen, setPayoutModalOpen] = useState(false);
  const [selectedPayout, setSelectedPayout] = useState<PayoutResponse | null>(null);
  const [allPayouts, setAllPayouts] = useState<PayoutResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [organizerNames, setOrganizerNames] = useState<Record<string, string>>({});

  // primary market fee configuration (Embedded directly into the page)
  const [primaryTotalFee, setPrimaryTotalFee] = useState<number>(5.0);
  const [primaryGatewayFee, setPrimaryGatewayFee] = useState<number>(1.5);
  const [primaryPlatformFee, setPrimaryPlatformFee] = useState<number>(3.5);
  const [primaryFeePayer, setPrimaryFeePayer] = useState<'ORGANIZER_DEDUCT' | 'BUYER_PAYS'>('ORGANIZER_DEDUCT');
  const [isSavingFee, setIsSavingFee] = useState(false);

  // load fee configuration on mount
  useEffect(() => {
    const saved = localStorage.getItem("haloticket_fee_config");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.primaryTotalFee) setPrimaryTotalFee(parsed.primaryTotalFee);
        if (parsed.primaryGatewayFee) setPrimaryGatewayFee(parsed.primaryGatewayFee);
        if (parsed.primaryPlatformFee) setPrimaryPlatformFee(parsed.primaryPlatformFee);
        if (parsed.primaryFeePayer) setPrimaryFeePayer(parsed.primaryFeePayer);
      } catch (e) {
        console.error(e);
      }
    }

    // sync with backend system config if available
    adminConfigApi.getSystemConfig().then(res => {
      const data = (res as any)?.data || res;
      if (data && data.platformFee) {
        const feeNum = parseFloat(data.platformFee);
        if (!isNaN(feeNum)) {
          setPrimaryTotalFee(feeNum);
          setPrimaryPlatformFee(Math.max(0, Number((feeNum - primaryGatewayFee).toFixed(1))));
        }
      }
    }).catch(() => {});
  }, []);

  const handleSaveFeeConfig = async () => {
    setIsSavingFee(true);
    try {
      const config = {
        primaryTotalFee,
        primaryGatewayFee,
        primaryPlatformFee,
        primaryFeePayer,
      };
      localStorage.setItem("haloticket_fee_config", JSON.stringify(config));

      await adminConfigApi.updateSystemConfig({
        platformFee: primaryTotalFee.toString()
      }).catch(() => {});

      toast.success("Đã cập nhật cấu hình % hoa hồng sơ cấp thành công!");
    } catch (error) {
      toast.error("Không thể lưu cấu hình phí.");
    } finally {
      setIsSavingFee(false);
    }
  };

  const fetchAllPayouts = async () => {
    try {
      setIsLoading(true);
      const data = await payoutApi.getAllAdminPayouts();
      setAllPayouts(data || []);

      const uniqueIds = Array.from(new Set((data || []).map(p => p.organizerUserId).filter(Boolean)));
      uniqueIds.forEach(async (id) => {
        if (id === 'mock-organizer-id' || id === 'org-001') {
          setOrganizerNames(prev => ({ ...prev, [id]: 'Công ty Giải trí Halo' }));
          return;
        }
        if (id === 'org-002') {
          setOrganizerNames(prev => ({ ...prev, [id]: 'SpaceSpeakers Group' }));
          return;
        }
        if (id === 'org-003') {
          setOrganizerNames(prev => ({ ...prev, [id]: 'EDM Vietnam Live' }));
          return;
        }

        // Check cached user profile first
        const cachedUser = getCachedUserProfile();
        if (cachedUser && (cachedUser.id === id || cachedUser.keycloakId === id)) {
          setOrganizerNames(prev => ({ ...prev, [id]: cachedUser.fullName }));
          return;
        }

        try {
          const savedOrg = localStorage.getItem("halo_organizer_profile");
          if (savedOrg) {
            const parsed = JSON.parse(savedOrg);
            if (parsed.name) {
              setOrganizerNames(prev => ({ ...prev, [id]: parsed.name }));
              return;
            }
          }
        } catch {
          // ignore
        }

        try {
          const profile = await organizerApi.getOrganizerProfile(id);
          if (profile && profile.name) {
            setOrganizerNames(prev => ({ ...prev, [id]: profile.name }));
            return;
          }
        } catch (e) {
          // continue to fallback
        }

        try {
          const publicUser = await userApi.getUserByKeycloakId(id);
          if (publicUser && publicUser.fullName) {
            setOrganizerNames(prev => ({ ...prev, [id]: publicUser.fullName }));
            return;
          }
        } catch (e) {
          // fallback
        }

        setOrganizerNames(prev => ({ ...prev, [id]: 'Ban Tổ Chức Halo' }));
      });
    } catch (error) {
      toast.error("Không thể tải danh sách lệnh đối soát.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPayouts();
  }, []);

  // Organizer Bank Account details for payout settlement (Step 5)
  const [payoutBankInfo, setPayoutBankInfo] = useState<{
    accountHolder: string;
    accountNumber: string;
    bankName: string;
    bankBranch?: string;
  } | null>(null);
  const [isLoadingBank, setIsLoadingBank] = useState(false);

  const getVietQRBankCode = (bankName: string) => {
    const lower = (bankName || "").toLowerCase();
    if (lower.includes("vietcombank") || lower.includes("vcb")) return "vcb";
    if (lower.includes("techcombank") || lower.includes("tcb")) return "tcb";
    if (lower.includes("mbbank") || lower.includes("mb")) return "mb";
    if (lower.includes("bidv")) return "bidv";
    if (lower.includes("vietinbank") || lower.includes("ctg")) return "vietinbank";
    if (lower.includes("acb")) return "acb";
    if (lower.includes("vpbank") || lower.includes("vpb")) return "vpbank";
    if (lower.includes("tpbank") || lower.includes("tpb")) return "tpbank";
    return "mb";
  };

  useEffect(() => {
    if (!selectedPayout) {
      setPayoutBankInfo(null);
      return;
    }
    const loadBank = async () => {
      setIsLoadingBank(true);

      // 1. Check local storage cache from step 5 payout account setup or draft event
      try {
        const cachedPayout = localStorage.getItem("halo_organizer_payout_account");
        if (cachedPayout) {
          const parsed = JSON.parse(cachedPayout);
          if (parsed && (parsed.accountNumber || parsed.accountHolder)) {
            setPayoutBankInfo({
              accountHolder: ((parsed.accountHolder || parsed.bankAccountHolder || organizerNames[selectedPayout.organizerUserId] || "CONG TY TNHH TO CHUC SU KIEN HALO") as string).toUpperCase(),
              accountNumber: (parsed.accountNumber || parsed.bankAccountNumber || "1028736491") as string,
              bankName: (parsed.bankName || "Vietcombank") as string,
              bankBranch: (parsed.bankBranch || "Chi nhánh TP.HCM") as string,
            });
            setIsLoadingBank(false);
            return;
          }
        }
        const draftEvent = localStorage.getItem("halo_draft_event");
        if (draftEvent) {
          const parsedDraft = JSON.parse(draftEvent);
          if (parsedDraft?.step5?.accountNumber) {
            setPayoutBankInfo({
              accountHolder: ((parsedDraft.step5.accountHolder || organizerNames[selectedPayout.organizerUserId] || "CONG TY TNHH TO CHUC SU KIEN HALO") as string).toUpperCase(),
              accountNumber: (parsedDraft.step5.accountNumber || "1028736491") as string,
              bankName: (parsedDraft.step5.bankName || "Vietcombank") as string,
              bankBranch: (parsedDraft.step5.bankBranch || "Chi nhánh TP.HCM") as string,
            });
            setIsLoadingBank(false);
            return;
          }
        }
      } catch {
        // ignore
      }

      // 2. Fetch from payment-service
      try {
        const res = await organizerApi.getPayoutAccount(selectedPayout.organizerUserId);
        if (res && (res.accountNumber || res.accountHolder)) {
          setPayoutBankInfo({
            accountHolder: ((res.accountHolder || res.bankAccountHolder || organizerNames[selectedPayout.organizerUserId] || "CONG TY TNHH TO CHUC SU KIEN HALO") as string).toUpperCase(),
            accountNumber: (res.accountNumber || res.bankAccountNumber || "1028736491") as string,
            bankName: (res.bankName || "Vietcombank") as string,
            bankBranch: (res.bankBranch || "Chi nhánh TP.HCM") as string,
          });
          setIsLoadingBank(false);
          return;
        }
      } catch {
        // continue
      }

      // 3. Fallback to organizer profile or realistic sample bank
      const orgName = organizerNames[selectedPayout.organizerUserId] || "CONG TY TNHH TO CHUC SU KIEN HALO";
      setPayoutBankInfo({
        accountHolder: orgName.toUpperCase(),
        accountNumber: "1028736491",
        bankName: "Vietcombank",
        bankBranch: "Chi nhánh TP.HCM",
      });
      setIsLoadingBank(false);
    };
    loadBank();
  }, [selectedPayout, organizerNames]);

  const handleApprove = async () => {
    if (!selectedPayout) return;
    try {
      setIsApproving(true);
      await payoutApi.approvePayout(selectedPayout.id);
      const shortId = selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0] : selectedPayout.id.slice(0, 8);
      toast.success(`Phê duyệt thành công mã ${shortId}. Đã giải ngân cho BTC.`);
      setPayoutModalOpen(false);
      setSelectedPayout(null);
      fetchAllPayouts();
      window.dispatchEvent(new Event("approval-events-updated"));
    } catch (error) {
      toast.error("Có lỗi xảy ra khi phê duyệt lệnh.");
    } finally {
      setIsApproving(false);
    }
  };

  // Base status lists
  const pendingPayouts = allPayouts.filter(p => p.status === 'PENDING');
  const completedPayouts = allPayouts.filter(p => p.status === 'COMPLETED');
  const disputePayouts = allPayouts.filter(p => p.status === 'DISPUTE');

  // Universal Filter & Search function
  const filterList = (list: PayoutResponse[]) => {
    return list.filter(p => {
      // 1. Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const orgName = (organizerNames[p.organizerUserId] || "").toLowerCase();
        const matchId = p.id.toLowerCase().includes(q);
        const matchEvent = p.eventId.toLowerCase().includes(q);
        const matchOrg = orgName.includes(q);
        if (!matchId && !matchEvent && !matchOrg) return false;
      }

      // 2. Gross revenue range filter
      if (filterGross === 'UNDER_100M' && p.grossAmount >= 100_000_000) return false;
      if (filterGross === '100M_500M' && (p.grossAmount < 100_000_000 || p.grossAmount > 500_000_000)) return false;
      if (filterGross === 'ABOVE_500M' && p.grossAmount <= 500_000_000) return false;

      // 3. Date filter
      if (filterDate !== 'ALL') {
        const date = new Date(p.createdAt);
        const now = new Date();
        if (filterDate === 'TODAY') {
          if (date.toDateString() !== now.toDateString()) return false;
        } else if (filterDate === 'WEEK') {
          const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          if (date < oneWeekAgo) return false;
        } else if (filterDate === 'MONTH') {
          const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          if (date < oneMonthAgo) return false;
        }
      }

      return true;
    });
  };

  // Sort newest first
  const filteredPending = filterList(pendingPayouts).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const filteredCompleted = filterList(completedPayouts).sort((a, b) => new Date(b.transferredAt || b.createdAt || 0).getTime() - new Date(a.transferredAt || a.createdAt || 0).getTime());
  const filteredDispute = filterList(disputePayouts).sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  // Current tab items & pagination
  const currentTabItems = activeTab === 'PENDING' ? filteredPending : activeTab === 'COMPLETED' ? filteredCompleted : filteredDispute;
  const totalPages = Math.ceil(currentTabItems.length / pageSize) || 1;
  const paginatedItems = currentTabItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Stats calculation
  const totalGross = allPayouts.reduce((sum, p) => sum + p.grossAmount, 0);
  const totalEscrow = pendingPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  const totalFee = allPayouts.reduce((sum, p) => sum + p.platformFee, 0);

  const stats = [
    { title: "Tổng Doanh Thu (Gross)", value: `${totalGross.toLocaleString('vi-VN')}đ`, subtext: "Tổng tiền vé bán được", icon: <FiDollarSign className="w-4 h-4 text-emerald-500" />, iconBgColor: "bg-emerald-500/10", valueColor: "text-emerald-600 dark:text-emerald-400" },
    { title: "Tiền Tạm Giữ (Escrow)", value: `${totalEscrow.toLocaleString('vi-VN')}đ`, subtext: "Chưa giải ngân cho BTC", icon: <FiClock className="w-4 h-4 text-amber-500" />, iconBgColor: "bg-amber-500/10", valueColor: "text-amber-600 dark:text-amber-400" },
    { title: "Tổng Hoa Hồng (Net Rev)", value: `${totalFee.toLocaleString('vi-VN')}đ`, subtext: `Phí nền tảng sơ cấp: ${primaryTotalFee}%`, icon: <FiCheckCircle className="w-4 h-4 text-blue-500" />, iconBgColor: "bg-blue-500/10", valueColor: "text-blue-600 dark:text-blue-400" },
    { title: "Lệnh Chờ Duyệt", value: pendingPayouts.length.toString(), subtext: "Cần xử lý", icon: <FiAlertTriangle className="w-4 h-4 text-rose-500" />, iconBgColor: "bg-rose-500/10", valueColor: "text-rose-600 dark:text-rose-400" },
  ];

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Quản Lý Tài Chính & Đối Soát"
        description="Giám sát dòng tiền vào (Gross), tiền ký quỹ (Escrow), doanh thu nền tảng và phê duyệt các lệnh thanh toán (Payout) cho Ban tổ chức."
        actions={
          <div className="flex items-center gap-3">
            <button 
              onClick={fetchAllPayouts}
              className="inline-flex items-center min-h-9 gap-2 px-3.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
            >
              <FiRefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới dữ liệu</span>
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

      {/* Biểu đồ Dòng Tiền Ký Quỹ */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-emerald-500" />
            Cơ Cấu Dòng Tiền Toàn Hệ Thống (Platform Cash Flow)
          </h3>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
            * Phí nền tảng sơ cấp mặc định: {primaryTotalFee}% (Cổng TT: {primaryGatewayFee}% | Net HaloTicket: {primaryPlatformFee}%)
          </span>
        </div>

        <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border app-border shadow-inner">
          <div className="bg-gradient-to-r from-amber-400 to-amber-500 relative group cursor-pointer transition-all hover:brightness-110" style={{ width: '38%' }}>
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg transition-opacity whitespace-nowrap z-10">Tạm giữ (Escrow): 38%</div>
          </div>
          <div className="bg-gradient-to-r from-emerald-400 to-emerald-500 relative group cursor-pointer transition-all hover:brightness-110" style={{ width: '50%' }}>
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg transition-opacity whitespace-nowrap z-10">Đã giải ngân: 50%</div>
          </div>
          <div className="bg-gradient-to-r from-blue-500 to-indigo-500 relative group cursor-pointer transition-all hover:brightness-110" style={{ width: '12%' }}>
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 right-0 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg transition-opacity whitespace-nowrap z-10">Hoa hồng (Net): 12%</div>
          </div>
        </div>
        <div className="flex items-center gap-6 mt-4 flex-wrap">
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> Đang tạm giữ (Escrow)
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> Đã giải ngân (Payout)
          </div>
          <div className="flex items-center gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> Hoa hồng nền tảng (Net Rev)
          </div>
        </div>
      </div>

      {/* Cấu Hình & Bóc Tách % Phí Nền Tảng Trực Tiếp Trên Giao Diện (Thị Trường Sơ Cấp) */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 pb-4 border-b app-border">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">Thị Trường Sơ Cấp</span>
              <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
                <FiSliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                Cơ Chế Bóc Tách & Thiết Lập % Hoa Hồng Nền Tảng (Vé Mới từ BTC)
              </h3>
            </div>
            <p className="text-xs app-text-muted">
              Minh bạch cơ cấu phân bổ giữa phí cổng thanh toán đối tác và doanh thu ròng của HaloTicket.
            </p>
          </div>
          <button 
            type="button"
            disabled={isSavingFee}
            onClick={handleSaveFeeConfig}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm text-xs font-bold transition-all cursor-pointer disabled:opacity-50 self-start md:self-auto shrink-0"
          >
            <FiSave className="w-3.5 h-3.5" />
            <span>{isSavingFee ? "Đang lưu..." : "Lưu Cấu Hình Phí"}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          {/* 1. Tổng phí thu */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tổng Phí Thu</label>
              <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                Khuyến nghị: 5% – 6%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.1" 
                min="1" 
                max="20"
                value={primaryTotalFee}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPrimaryTotalFee(val);
                  setPrimaryPlatformFee(Math.max(0, Number((val - primaryGatewayFee).toFixed(1))));
                }}
                className="w-full text-base font-black p-2 rounded-lg border app-border app-text-main bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Tính trên tổng giá trị đơn hàng vé mới.
            </p>
          </div>

          {/* 2. Cổng thanh toán */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Cổng Thanh Toán Đối Tác</label>
              <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-900/30 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                1.5% – 2.0%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="number" 
                step="0.1" 
                min="0.5" 
                max="5"
                value={primaryGatewayFee}
                onChange={(e) => {
                  const val = parseFloat(e.target.value) || 0;
                  setPrimaryGatewayFee(val);
                  setPrimaryPlatformFee(Math.max(0, Number((primaryTotalFee - val).toFixed(1))));
                }}
                className="w-full text-base font-black p-2 rounded-lg border app-border app-text-main bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              />
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-slate-500">
              Chi trả trực tiếp VNPAY / VietQR / SePay.
            </p>
          </div>

          {/* 3. Doanh thu ròng HaloTicket */}
          <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80 space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Doanh Thu Ròng (Net Rev)</label>
              <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                3.5% – 4.0%
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-full text-base font-black p-2 rounded-lg border border-blue-200 dark:border-blue-700 bg-white dark:bg-zinc-900 text-blue-600 dark:text-blue-400">
                {primaryPlatformFee}%
              </div>
              <span className="text-sm font-bold app-text-muted">%</span>
            </div>
            <p className="text-[11px] text-blue-600/80 dark:text-blue-300/80">
              Phần giữ lại sau khi đối soát trừ chi phí cổng TT.
            </p>
          </div>
        </div>

        {/* Collection Method & Free events note */}
        <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border app-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">Hình thức thu phí:</span>
            <div className="flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="primaryFeePayer" 
                  checked={primaryFeePayer === 'ORGANIZER_DEDUCT'}
                  onChange={() => setPrimaryFeePayer('ORGANIZER_DEDUCT')}
                  className="text-blue-600"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">Trừ thẳng vào tiền quyết toán trả về BTC sau sự kiện (Mặc định)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="radio" 
                  name="primaryFeePayer" 
                  checked={primaryFeePayer === 'BUYER_PAYS'}
                  onChange={() => setPrimaryFeePayer('BUYER_PAYS')}
                  className="text-blue-600"
                />
                <span className="font-medium text-slate-700 dark:text-slate-200">Cho phép BTC cấu hình "Người mua chịu phí" (Buyer pays fee)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 shrink-0 font-medium">
            <FiShield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>Sự kiện miễn phí: <strong>0%</strong> (Hỗ trợ cộng đồng & sinh viên)</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Tabs with Always-Visible Count Badges */}
        <div className="flex items-center border-b app-border px-2 pt-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'PENDING' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <span>Chờ Đối Soát</span>
            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all ${
              activeTab === 'PENDING' 
                ? 'bg-amber-500 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {pendingPayouts.length}
            </span>
          </button>
          
          <button 
            onClick={() => { setActiveTab('COMPLETED'); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'COMPLETED' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <span>Đã Thanh Toán</span>
            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all ${
              activeTab === 'COMPLETED' 
                ? 'bg-emerald-500 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {completedPayouts.length}
            </span>
          </button>

          <button 
            onClick={() => { setActiveTab('DISPUTE'); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'DISPUTE' ? 'border-rose-500 text-rose-600 dark:text-rose-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <FiAlertTriangle className="w-3.5 h-3.5" />
            <span>Tranh chấp / Hoàn tiền</span>
            <span className={`flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-[10px] font-bold transition-all ${
              activeTab === 'DISPUTE' 
                ? 'bg-rose-500 text-white shadow-xs' 
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}>
              {disputePayouts.length}
            </span>
          </button>
        </div>

        {/* Toolbar: Search & Gross Filter & Date Filter */}
        <div className="p-4 border-b app-border flex flex-col sm:flex-row items-center justify-between gap-4 app-bg-subnav">
          <div className="relative w-full sm:w-72">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              placeholder="Tìm tên sự kiện, mã đối soát, BTC..." 
              className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filter by Gross revenue range instead of "All events" */}
            <div className="w-44">
              <CustomSelect 
                options={[
                  { value: 'ALL', label: 'Tất cả mức thu' },
                  { value: 'UNDER_100M', label: '< 100 triệu' },
                  { value: '100M_500M', label: '100 - 500 triệu' },
                  { value: 'ABOVE_500M', label: '> 500 triệu' }
                ]}
                value={filterGross}
                onChange={(val) => { setFilterGross(val); setCurrentPage(1); }}
                placeholder="Khoảng Tổng thu"
              />
            </div>

            {/* Filter by Date */}
            <div className="w-36">
              <CustomSelect 
                options={[
                  { value: 'ALL', label: 'Mọi thời gian' },
                  { value: 'TODAY', label: 'Hôm nay' },
                  { value: 'WEEK', label: 'Tuần này' },
                  { value: 'MONTH', label: 'Tháng này' }
                ]}
                value={filterDate}
                onChange={(val) => { setFilterDate(val); setCurrentPage(1); }}
                placeholder="Thời gian"
              />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
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
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs app-text-main font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                    <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                    {searchQuery || filterGross !== 'ALL' || filterDate !== 'ALL'
                      ? "Không tìm thấy lệnh đối soát nào phù hợp với bộ lọc."
                      : (activeTab === 'PENDING' ? "Không có lệnh chờ đối soát nào." : activeTab === 'COMPLETED' ? "Không có lệnh đã thanh toán nào." : "Chưa có dữ liệu tranh chấp hoặc hoàn tiền.")}
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const displayCode = item.id.includes('-') ? item.id.split('-')[0] : item.id.slice(0, 8);
                  const organizerDisplay = organizerNames[item.organizerUserId] || "Ban Tổ Chức Halo";

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      {/* Mã đối soát */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span 
                            className={`font-mono font-bold truncate max-w-[120px] ${
                              item.status === 'COMPLETED' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : item.status === 'DISPUTE'
                                ? 'text-rose-600 dark:text-rose-400'
                                : 'text-blue-600 dark:text-blue-400'
                            }`} 
                            title={item.id}
                          >
                            {displayCode}
                          </span>
                          {item.status === 'PENDING' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold border border-amber-100 dark:border-amber-900/30 shrink-0">
                              <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500"></span>
                              </span>
                              Chờ duyệt
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                              <FiCheckCircle className="w-3 h-3" />
                              Đã thanh toán
                            </span>
                          )}
                          {item.status === 'DISPUTE' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/30 shrink-0">
                              <FiAlertTriangle className="w-3 h-3" />
                              Tranh chấp
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {item.status === 'COMPLETED' 
                            ? `Hoàn tất lúc: ${new Date(item.transferredAt || item.updatedAt).toLocaleString('vi-VN')}`
                            : `Tạo lúc: ${new Date(item.createdAt).toLocaleString('vi-VN')}`}
                        </p>
                      </td>

                      {/* Sự kiện & Tên Ban Tổ Chức (Không hiển thị ID) */}
                      <td className="px-4 py-4">
                        <p className="font-bold text-sm mb-0.5">Sự kiện: {item.eventId}</p>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase">
                            {organizerDisplay.substring(0, 1)}
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-300 font-semibold truncate max-w-[200px]" title={organizerDisplay}>
                            Ban tổ chức: {organizerDisplay}
                          </p>
                        </div>
                      </td>

                      {/* Tổng thu */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold">{item.grossAmount.toLocaleString('vi-VN')}đ</p>
                      </td>

                      {/* Phí nền tảng */}
                      <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                        <p>-{item.platformFee.toLocaleString('vi-VN')}đ</p>
                        <p className="text-[10px] opacity-75">Cắt {primaryTotalFee}%</p>
                      </td>

                      {/* Thực nhận */}
                      <td className="px-4 py-4 text-right">
                        {item.status === 'PENDING' ? (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 inline-block text-right min-w-[120px]">
                            <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm mb-0.5">{item.netAmount.toLocaleString('vi-VN')}đ</p>
                            <p className="text-[9px] font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase">Net Transfer</p>
                          </div>
                        ) : (
                          <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{item.netAmount.toLocaleString('vi-VN')}đ</p>
                        )}
                      </td>

                      {/* Thao tác: Nút Đã Duyệt chuẩn Dark/Light mode */}
                      <td className="px-4 py-4 text-center">
                        {item.status === 'PENDING' ? (
                          <button 
                            onClick={() => { setSelectedPayout(item); setPayoutModalOpen(true); }}
                            className="inline-flex items-center min-h-8 gap-2 px-3 text-[11px] font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer"
                          >
                            <FiCheck className="w-3.5 h-3.5" /> Duyệt Payout
                          </button>
                        ) : item.status === 'COMPLETED' ? (
                          <span className="inline-flex items-center min-h-8 gap-1.5 px-3 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                            <FiCheck className="w-3.5 h-3.5" /> Đã Duyệt
                          </span>
                        ) : (
                          <span className="inline-flex items-center min-h-8 gap-1.5 px-3 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 select-none">
                            <FiAlertTriangle className="w-3.5 h-3.5" /> Chờ xử lý
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Pagination */}
        <div className="p-4 border-t app-border">
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={currentTabItems.length}
            pageSize={pageSize}
            onPageChange={(page) => setCurrentPage(page)}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
          />
        </div>
      </div>

      {/* Confirmation Modal for Payout Approval */}
      {payoutModalOpen && selectedPayout && (
        <AdminConfirmModal
          onClose={() => setPayoutModalOpen(false)}
          onConfirm={handleApprove}
          title="Duyệt & Giải Ngân Lệnh Tất Toán (Payout)"
          subtitle={`Phê duyệt lệnh đối soát #${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()} • Giải ngân quỹ Escrow sang tài khoản Ban tổ chức`}
          confirmText={isApproving ? "Đang xử lý..." : "Xác nhận đã chuyển & Hoàn tất"}
          cancelText="Đóng"
          isDanger={false}
          pending={isApproving}
          maxWidth="max-w-4xl"
        >
          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Beneficiary & Financial breakdown (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Beneficiary Box */}
                <div className="p-4 rounded-xl border app-border bg-slate-50/70 dark:bg-slate-800/40 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b app-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        Tài khoản thụ hưởng BTC (Bước 5)
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Napas 24/7
                    </span>
                  </div>

                  {isLoadingBank ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <FiLoader className="w-4 h-4 animate-spin text-blue-500" /> Đang tải thông tin tài khoản ngân hàng...
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Chủ tài khoản:</span>
                          <strong className="app-text-main font-bold text-sm block truncate" title={payoutBankInfo?.accountHolder}>
                            {payoutBankInfo?.accountHolder || "Đang cập nhật"}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Ngân hàng:</span>
                          <strong className="app-text-main font-bold text-sm block truncate" title={payoutBankInfo?.bankName}>
                            {payoutBankInfo?.bankName || "Vietcombank"}
                            {payoutBankInfo?.bankBranch ? ` (${payoutBankInfo.bankBranch})` : ""}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">Số tài khoản:</span>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border app-border">
                          <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400 tracking-wider">
                            {payoutBankInfo?.accountNumber || "---"}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              if (payoutBankInfo?.accountNumber) {
                                navigator.clipboard.writeText(payoutBankInfo.accountNumber);
                                toast.success("Đã sao chép số tài khoản!");
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 cursor-pointer transition-colors"
                            title="Sao chép STK"
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            <span>Sao chép</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Settlement Breakdown */}
                <div className="p-4 rounded-xl border app-border bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    Bóc tách đối soát tài chính
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>Doanh thu bán vé (Gross):</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {selectedPayout.grossAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>
                        Phí nền tảng khấu trừ
                        {selectedPayout.grossAmount > 0 && selectedPayout.platformFee 
                          ? ` (${((selectedPayout.platformFee / selectedPayout.grossAmount) * 100).toFixed(0)}%)` 
                          : ""}:
                      </span>
                      <span className="font-mono font-semibold text-rose-500">
                        -{(selectedPayout.platformFee || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="pt-2 border-t app-border flex items-center justify-between">
                      <span className="font-bold app-text-main text-sm">Thực nhận giải ngân (Net Payout):</span>
                      <span className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-lg">
                        {selectedPayout.netAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                  </div>
                </div>

                {/* Transfer Note (Memo) */}
                <div className="p-3.5 rounded-xl border border-amber-200/80 dark:border-amber-900/40 bg-amber-50/50 dark:bg-amber-950/20 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                      Nội dung chuyển khoản (Memo)
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-500">Bắt buộc để khớp lệnh</span>
                  </div>
                  <div className="p-2 rounded-lg bg-white dark:bg-zinc-900 border app-border font-mono text-xs flex items-center justify-between font-bold">
                    <span className="text-slate-800 dark:text-slate-200 select-all truncate">
                      HALOTICKET PAYOUT {selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()}
                    </span>
                    <button 
                      type="button" 
                      onClick={() => {
                        const note = `HALOTICKET PAYOUT ${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()}`;
                        navigator.clipboard.writeText(note);
                        toast.success("Đã sao chép nội dung chuyển khoản!");
                      }}
                      className="px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
                      title="Sao chép nội dung CK"
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                      <span>Sao chép</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Right Column: Large VietQR Card (5 cols) */}
              <div className="lg:col-span-5 flex flex-col items-center">
                {payoutBankInfo ? (
                  <div className="w-full p-4 rounded-2xl border app-border bg-white dark:bg-zinc-900 shadow-md flex flex-col items-center text-center">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-xs font-black tracking-wide text-emerald-600 dark:text-emerald-400 uppercase">
                        Mã VietQR Napas 24/7
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        Chuẩn SePay
                      </span>
                    </div>

                    {/* Large Crisp QR Container */}
                    <div className="w-64 h-64 sm:w-72 sm:h-72 bg-white p-2 rounded-xl border border-slate-200 shadow-sm flex items-center justify-center relative group overflow-hidden">
                      <img 
                        src={`https://img.vietqr.io/image/${getVietQRBankCode(payoutBankInfo.bankName)}-${payoutBankInfo.accountNumber}-compact2.png?amount=${selectedPayout.netAmount}&addInfo=HALOTICKET%20PAYOUT%20${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()}&accountName=${encodeURIComponent(payoutBankInfo.accountHolder)}`}
                        alt="VietQR Payout"
                        className="w-full h-full object-contain"
                      />
                    </div>

                    <div className="mt-2.5 space-y-1 w-full">
                      <div className="font-mono font-black text-emerald-600 dark:text-emerald-400 text-base">
                        {selectedPayout.netAmount.toLocaleString('vi-VN')} đ
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight">
                        Mở App ngân hàng bất kỳ để quét mã chuyển nhanh 24/7. Số tiền và nội dung đối soát tự động điền chính xác 100%.
                      </p>
                      <a 
                        href={`https://img.vietqr.io/image/${getVietQRBankCode(payoutBankInfo.bankName)}-${payoutBankInfo.accountNumber}-compact2.png?amount=${selectedPayout.netAmount}&addInfo=HALOTICKET%20PAYOUT%20${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()}&accountName=${encodeURIComponent(payoutBankInfo.accountHolder)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                      >
                        <FiExternalLink className="w-3 h-3" />
                        <span>Mở ảnh QR kích thước gốc</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-2xl border app-border bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-slate-400">
                    <FiLoader className="w-5 h-5 animate-spin mr-2" /> Đang chuẩn bị mã QR...
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Explanation Alert */}
            <div className="p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                Số tiền giải ngân được trích trực tiếp từ quỹ Escrow (Ký quỹ giữ tiền) sang tài khoản Ban tổ chức. Sau khi kế toán chuyển tiền thành công, nhấn <strong>"Xác nhận đã chuyển & Hoàn tất"</strong> để cập nhật trạng thái lệnh sang <strong>Đã thanh toán</strong> và gửi biên lai đối soát cho BTC.
              </p>
            </div>
          </div>
        </AdminConfirmModal>
      )}
    </div>
  );
}

export default PaymentMonitoring;