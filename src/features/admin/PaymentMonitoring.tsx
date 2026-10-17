import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  FiInfo,
  FiDownload,
  FiChevronDown,
  FiChevronUp,
  FiCalendar,
  FiRotateCcw,
  FiEye,
  FiFileText
} from "react-icons/fi";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminStatCard } from "@/components/admin/AdminStatCard";
import { CustomSelect } from "@/components/common/CustomSelect";
import { TablePagination } from "@/components/common/TablePagination";
import { AdminConfirmModal } from "@/components/admin/AdminConfirmModal";
import { toast } from "react-hot-toast";
import { payoutApi } from "@/services/payoutApi";
import { eventApi } from "@/services/eventApi";
import { organizerApi } from "@/services/organizerApi";
import { userApi, getCachedUserProfile } from "@/services/userApi";
import { adminConfigApi } from "@/services/adminConfigApi";
import type { PayoutResponse } from "@/types";

export function PaymentMonitoring() {
  const { t } = useTranslation();
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
  const [eventTitles, setEventTitles] = useState<Record<string, string>>({});

  // Dispute modal state
  const [disputeModalOpen, setDisputeModalOpen] = useState(false);
  const [targetDisputePayout, setTargetDisputePayout] = useState<PayoutResponse | null>(null);
  const [disputeReason, setDisputeReason] = useState('');
  const [isDisputing, setIsDisputing] = useState(false);

  // Platform Fee Configuration Collapsible & State
  const [isFeeConfigExpanded, setIsFeeConfigExpanded] = useState(false);
  const [primaryTotalFee, setPrimaryTotalFee] = useState<number>(5.0);
  const [primaryGatewayFee, setPrimaryGatewayFee] = useState<number>(1.5);
  const [primaryPlatformFee, setPrimaryPlatformFee] = useState<number>(3.5);
  const [primaryFeePayer, setPrimaryFeePayer] = useState<'ORGANIZER_DEDUCT' | 'BUYER_PAYS'>('ORGANIZER_DEDUCT');
  const [isSavingFee, setIsSavingFee] = useState(false);

  // Load fee configuration on mount
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

      toast.success(t("Đã cập nhật cấu hình % hoa hồng sơ cấp thành công!"));
    } catch (error) {
      toast.error(t("Không thể lưu cấu hình phí."));
    } finally {
      setIsSavingFee(false);
    }
  };

  const fetchAllPayouts = async () => {
    try {
      setIsLoading(true);
      const data = await payoutApi.getAllAdminPayouts();
      setAllPayouts(data || []);

      // Fetch public events to resolve real event titles
      try {
        const events = await eventApi.getAllEvents();
        if (Array.isArray(events) && events.length > 0) {
          const map: Record<string, string> = {};
          events.forEach((ev: any) => {
            if (ev.id && ev.title) map[ev.id] = ev.title;
          });
          setEventTitles(prev => ({ ...map, ...prev }));
        }
      } catch {
        // continue
      }

      // Fetch organizer display names
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
          const organizerName = profile?.name;
          if (organizerName) {
            setOrganizerNames(prev => ({ ...prev, [id]: organizerName }));
            return;
          }
        } catch {
          // continue
        }

        try {
          const publicUser = await userApi.getUserByKeycloakId(id);
          const fullName = publicUser?.fullName;
          if (fullName) {
            setOrganizerNames(prev => ({ ...prev, [id]: fullName }));
            return;
          }
        } catch {
          // fallback
        }

        setOrganizerNames(prev => ({ ...prev, [id]: 'Ban Tổ Chức Halo' }));
      });
    } catch (error) {
      toast.error(t("Không thể tải danh sách lệnh đối soát."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAllPayouts();
  }, []);

  // Bank Account details for payout settlement
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
      toast.success(`${t("Phê duyệt thành công mã")} ${shortId}. ${t("Đã giải ngân cho BTC.")}`);
      setPayoutModalOpen(false);
      setSelectedPayout(null);
      fetchAllPayouts();
      window.dispatchEvent(new Event("approval-events-updated"));
    } catch {
      toast.error(t("Có lỗi xảy ra khi phê duyệt lệnh."));
    } finally {
      setIsApproving(false);
    }
  };

  const handleOpenDispute = (payout: PayoutResponse) => {
    setTargetDisputePayout(payout);
    setDisputeReason("Cần rà soát và đối chiếu thêm số liệu vé hoàn của sự kiện trước khi thanh toán.");
    setDisputeModalOpen(true);
  };

  const handleConfirmDispute = async () => {
    if (!targetDisputePayout) return;
    try {
      setIsDisputing(true);
      await payoutApi.disputePayout(targetDisputePayout.id, disputeReason);
      toast.success(t("Đã chuyển lệnh đối soát sang trạng thái Tranh chấp / Tạm hoãn."));
      setDisputeModalOpen(false);
      setTargetDisputePayout(null);
      fetchAllPayouts();
    } catch {
      toast.error(t("Không thể cập nhật trạng thái tranh chấp."));
    } finally {
      setIsDisputing(false);
    }
  };

  const handleReopenPayout = async (payoutId: string) => {
    try {
      await payoutApi.reopenPayout(payoutId);
      toast.success(t("Đã mở lại lệnh đối soát (Chuyển về Chờ duyệt)."));
      fetchAllPayouts();
    } catch {
      toast.error(t("Không thể mở lại lệnh đối soát."));
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
        const evName = (eventTitles[p.eventId] || p.eventId).toLowerCase();
        const matchId = p.id.toLowerCase().includes(q);
        const matchEvent = evName.includes(q) || p.eventId.toLowerCase().includes(q);
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
  const totalPaid = completedPayouts.reduce((sum, p) => sum + p.netAmount, 0);
  const totalFee = allPayouts.reduce((sum, p) => sum + p.platformFee, 0);

  // Dynamic Cash Flow percentages
  const escrowPercent = totalGross > 0 ? Math.round((totalEscrow / totalGross) * 100) : 0;
  const paidPercent = totalGross > 0 ? Math.round((totalPaid / totalGross) * 100) : 0;
  const feePercent = totalGross > 0 ? Math.max(0, 100 - escrowPercent - paidPercent) : 0;

  const stats = [
    { title: t("Tổng Doanh Thu (Gross)"), value: `${totalGross.toLocaleString('vi-VN')}đ`, subtext: t("Tổng tiền vé bán được"), icon: <FiDollarSign className="w-4 h-4 text-emerald-500" />, iconBgColor: "bg-emerald-500/10", valueColor: "text-emerald-600 dark:text-emerald-400" },
    { title: t("Tiền Tạm Giữ (Escrow)"), value: `${totalEscrow.toLocaleString('vi-VN')}đ`, subtext: `${t("Chưa giải ngân")}: ${escrowPercent}%`, icon: <FiClock className="w-4 h-4 text-amber-500" />, iconBgColor: "bg-amber-500/10", valueColor: "text-amber-600 dark:text-amber-400" },
    { title: t("Tổng Hoa Hồng (Net Rev)"), value: `${totalFee.toLocaleString('vi-VN')}đ`, subtext: `${t("Doanh thu ròng sàn")}: ${feePercent}%`, icon: <FiCheckCircle className="w-4 h-4 text-blue-500" />, iconBgColor: "bg-blue-500/10", valueColor: "text-blue-600 dark:text-blue-400" },
    { title: t("Lệnh Chờ Duyệt"), value: pendingPayouts.length.toString(), subtext: t("Cần kế toán xử lý"), icon: <FiAlertTriangle className="w-4 h-4 text-rose-500" />, iconBgColor: "bg-rose-500/10", valueColor: "text-rose-600 dark:text-rose-400" },
  ];

  const [isExporting, setIsExporting] = useState(false);

  // Export Excel (.xlsx) function
  const handleExportExcel = async () => {
    if (currentTabItems.length === 0) {
      toast.error(t("Không có dữ liệu để xuất báo cáo."));
      return;
    }

    try {
      setIsExporting(true);
      const XLSX = await import("xlsx");
      
      const exportData = currentTabItems.map((item, idx) => {
        const displayEvent = eventTitles[item.eventId] || item.eventId;
        const org = organizerNames[item.organizerUserId] || "Ban Tổ Chức Halo";
        const statusLabel = item.status === 'COMPLETED' ? t("Đã thanh toán") : item.status === 'DISPUTE' ? t("Tranh chấp") : t("Chờ duyệt");
        const created = new Date(item.createdAt).toLocaleString("vi-VN");
        const transferred = item.transferredAt ? new Date(item.transferredAt).toLocaleString("vi-VN") : "---";

        return {
          "STT": idx + 1,
          [t("Mã đối soát")]: item.id,
          [t("Tên sự kiện")]: displayEvent,
          [t("Ban tổ chức")]: org,
          [t("Tổng thu (Gross) VNĐ")]: item.grossAmount,
          [t("Phí nền tảng VNĐ")]: item.platformFee,
          [t("Thực nhận (Net) VNĐ")]: item.netAmount,
          [t("Trạng thái")]: statusLabel,
          [t("Ngày tạo")]: created,
          [t("Ngày hoàn tất")]: transferred,
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(exportData);

      // Auto column widths
      worksheet["!cols"] = [
        { wch: 6 },  // STT
        { wch: 22 }, // Mã đối soát
        { wch: 38 }, // Tên sự kiện
        { wch: 28 }, // Ban tổ chức
        { wch: 20 }, // Tổng thu
        { wch: 18 }, // Phí nền tảng
        { wch: 20 }, // Thực nhận
        { wch: 16 }, // Trạng thái
        { wch: 22 }, // Ngày tạo
        { wch: 22 }, // Ngày hoàn tất
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "DoiSoat");

      const nowStr = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `HaloTicket_BaoCao_DoiSoat_${activeTab}_${nowStr}.xlsx`);
      toast.success(t("Đã xuất file báo cáo Excel (.xlsx) thành công!"));
    } catch (err) {
      console.error("Export Excel error:", err);
      toast.error(t("Có lỗi xảy ra khi xuất file Excel."));
    } finally {
      setIsExporting(false);
    }
  };

  // Export CSV function with UTF-8 BOM
  const handleExportCSV = () => {
    if (currentTabItems.length === 0) {
      toast.error(t("Không có dữ liệu để xuất báo cáo."));
      return;
    }
    
    const headers = [
      t("Mã đối soát"),
      t("Tên sự kiện"),
      t("Ban tổ chức"),
      t("Tổng thu (Gross) VNĐ"),
      t("Phí nền tảng VNĐ"),
      t("Thực nhận (Net) VNĐ"),
      t("Trạng thái"),
      t("Ngày tạo"),
      t("Ngày hoàn tất")
    ];

    const rows = currentTabItems.map(item => {
      const displayEvent = eventTitles[item.eventId] || item.eventId;
      const org = organizerNames[item.organizerUserId] || "Ban Tổ Chức Halo";
      const statusLabel = item.status === 'COMPLETED' ? t("Đã thanh toán") : item.status === 'DISPUTE' ? t("Tranh chấp") : t("Chờ duyệt");
      const created = new Date(item.createdAt).toLocaleString("vi-VN");
      const transferred = item.transferredAt ? new Date(item.transferredAt).toLocaleString("vi-VN") : "---";

      return [
        `"${item.id}"`,
        `"${displayEvent.replace(/"/g, '""')}"`,
        `"${org.replace(/"/g, '""')}"`,
        item.grossAmount,
        item.platformFee,
        item.netAmount,
        `"${statusLabel}"`,
        `"${created}"`,
        `"${transferred}"`
      ].join(",");
    });

    const csvContent = "\uFEFF" + [headers.join(","), ...rows].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const nowStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `HaloTicket_BaoCao_DoiSoat_${activeTab}_${nowStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success(t("Đã xuất file báo cáo đối soát thành công!"));
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("Quản Lý Tài Chính & Đối Soát")}
        description={t("Giám sát dòng tiền vào (Gross), tiền ký quỹ (Escrow), doanh thu nền tảng và phê duyệt các lệnh thanh toán (Payout) cho Ban tổ chức.")}
        actions={
          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Export Dropdown (Excel & CSV) */}
            <div className="relative group">
              <button 
                type="button"
                disabled={isExporting}
                className="inline-flex items-center min-h-9.5 gap-2 px-3 text-xs font-semibold rounded-md border app-border app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800 app-text-main transition-colors cursor-pointer shadow-xs disabled:opacity-60"
                title={t("Xuất danh sách đối soát")}
              >
                <FiDownload className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>{isExporting ? t("Đang xuất…") : t("Xuất báo cáo")}</span>
                <FiChevronDown className="w-3 h-3 text-slate-400" />
              </button>
              <div className="absolute top-10 right-0 z-30 hidden min-w-44 rounded-lg border app-border app-bg-card p-1.5 shadow-xl group-focus-within:block group-hover:block animate-in fade-in duration-150">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center gap-2 min-h-9.5 w-full rounded-md px-2.5 text-left text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-colors cursor-pointer"
                >
                  <FiFileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>{t("Xuất Excel (.xlsx)")}</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-2 min-h-8.5 w-full rounded-md px-2.5 text-left text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <FiDownload className="w-4 h-4 text-slate-500" />
                  <span>{t("Xuất CSV (.csv)")}</span>
                </button>
              </div>
            </div>
            <button 
              onClick={fetchAllPayouts}
              className="inline-flex items-center min-h-9 gap-1.5 px-3.5 text-xs font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
            >
              <FiRefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
              <span>{t("Làm mới dữ liệu")}</span>
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

      {/* Biểu đồ Dòng Tiền Ký Quỹ Tính Toán Động 100% */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-bl-full blur-2xl pointer-events-none"></div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="font-bold text-sm app-text-main flex items-center gap-2">
            <FiDollarSign className="w-4 h-4 text-emerald-500" />
            {t("Cơ Cấu Dòng Tiền Toàn Hệ Thống (Platform Cash Flow)")}
          </h3>
          <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1 rounded-md border border-blue-200 dark:border-blue-800">
            * {t("Phí nền tảng sơ cấp mặc định")}: {primaryTotalFee}% ({t("Cổng TT")}: {primaryGatewayFee}% | Net: {primaryPlatformFee}%)
          </span>
        </div>

        {/* Dynamic Progress Bar */}
        <div className="flex h-3.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 border app-border shadow-inner">
          <div 
            className="bg-gradient-to-r from-amber-400 to-amber-500 relative group cursor-pointer transition-all duration-500 hover:brightness-110" 
            style={{ width: `${escrowPercent}%` }}
          >
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-lg transition-opacity whitespace-nowrap z-10">
              {t("Tạm giữ (Escrow)")}: {escrowPercent}% ({totalEscrow.toLocaleString('vi-VN')}đ)
            </div>
          </div>
          <div 
            className="bg-gradient-to-r from-emerald-400 to-emerald-500 relative group cursor-pointer transition-all duration-500 hover:brightness-110" 
            style={{ width: `${paidPercent}%` }}
          >
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-lg transition-opacity whitespace-nowrap z-10">
              {t("Đã giải ngân")}: {paidPercent}% ({totalPaid.toLocaleString('vi-VN')}đ)
            </div>
          </div>
          <div 
            className="bg-gradient-to-r from-blue-500 to-indigo-500 relative group cursor-pointer transition-all duration-500 hover:brightness-110" 
            style={{ width: `${feePercent}%` }}
          >
            <div className="opacity-0 group-hover:opacity-100 absolute -top-8 right-0 px-2.5 py-1 bg-slate-800 text-white text-[10px] font-bold rounded shadow-lg transition-opacity whitespace-nowrap z-10">
              {t("Hoa hồng (Net)")}: {feePercent}% ({totalFee.toLocaleString('vi-VN')}đ)
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-6 mt-4 flex-wrap text-[11px]">
          <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div> 
            {t("Đang tạm giữ (Escrow)")}: <span className="font-mono text-amber-600 dark:text-amber-400">{escrowPercent}% ({totalEscrow.toLocaleString('vi-VN')}đ)</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div> 
            {t("Đã giải ngân (Payout)")}: <span className="font-mono text-emerald-600 dark:text-emerald-400">{paidPercent}% ({totalPaid.toLocaleString('vi-VN')}đ)</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-slate-600 dark:text-slate-300">
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div> 
            {t("Hoa hồng nền tảng (Net Rev)")}: <span className="font-mono text-blue-600 dark:text-blue-400">{feePercent}% ({totalFee.toLocaleString('vi-VN')}đ)</span>
          </div>
        </div>
      </div>

      {/* Cấu Hình & Bóc Tách % Phí Nền Tảng (Collapsible Card Tinh Tế) */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs transition-all overflow-hidden">
        <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 app-bg-subnav">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-blue-600 text-white">
              {t("Thị Trường Sơ Cấp")}
            </span>
            <div className="flex items-center gap-2">
              <FiSliders className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <h3 className="font-bold text-sm app-text-main">
                {t("Cơ Chế Bóc Tách % Phí Nền Tảng")}
              </h3>
            </div>
            <span className="text-xs text-slate-500 font-medium hidden md:inline">
              • {t("Tổng thu")}: <strong className="app-text-main">{primaryTotalFee}%</strong> ({t("Cổng TT")}: {primaryGatewayFee}% | Net: {primaryPlatformFee}%)
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isFeeConfigExpanded && (
              <button 
                type="button"
                disabled={isSavingFee}
                onClick={handleSaveFeeConfig}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-xs text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                <FiSave className="w-3.5 h-3.5" />
                <span>{isSavingFee ? t("Đang lưu...") : t("Lưu Cấu Hình")}</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsFeeConfigExpanded(!isFeeConfigExpanded)}
              className="inline-flex items-center gap-1 px-3 py-1.5 border app-border rounded-lg bg-white dark:bg-zinc-800 text-xs font-semibold app-text-main hover:bg-slate-50 dark:hover:bg-zinc-700 transition-colors cursor-pointer"
            >
              <span>{isFeeConfigExpanded ? t("Thu gọn") : t("Tùy chỉnh tỷ lệ")}</span>
              {isFeeConfigExpanded ? <FiChevronUp className="w-3.5 h-3.5" /> : <FiChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {isFeeConfigExpanded && (
          <div className="p-5 border-t app-border space-y-4 animate-in fade-in duration-200">
            <p className="text-xs app-text-muted">
              {t("Minh bạch cơ cấu phân bổ giữa phí cổng thanh toán đối tác và doanh thu ròng của HaloTicket cho thị trường vé sơ cấp.")}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* 1. Tổng phí thu */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("Tổng Phí Thu")}</label>
                  <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded border border-blue-200 dark:border-blue-800">
                    {t("Khuyến nghị")}: 5% – 6%
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
                  {t("Tính trên tổng giá trị đơn hàng vé mới.")}
                </p>
              </div>

              {/* 2. Cổng thanh toán */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border app-border space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t("Cổng Thanh Toán Đối Tác")}</label>
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
                  {t("Chi trả trực tiếp VNPAY / VietQR / SePay.")}
                </p>
              </div>

              {/* 3. Doanh thu ròng HaloTicket */}
              <div className="p-4 rounded-xl bg-blue-50/60 dark:bg-blue-900/20 border border-blue-200/80 dark:border-blue-800/80 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-[11px] font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider">{t("Doanh Thu Ròng (Net Rev)")}</label>
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
                  {t("Phần giữ lại sau khi đối soát trừ chi phí cổng TT.")}
                </p>
              </div>
            </div>

            {/* Collection Method */}
            <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-800/30 border app-border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-600 dark:text-slate-300 text-[11px] block">{t("Hình thức thu phí:")}</span>
                <div className="flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="primaryFeePayer" 
                      checked={primaryFeePayer === 'ORGANIZER_DEDUCT'}
                      onChange={() => setPrimaryFeePayer('ORGANIZER_DEDUCT')}
                      className="text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-200">{t("Trừ thẳng vào tiền quyết toán trả về BTC sau sự kiện (Mặc định)")}</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="radio" 
                      name="primaryFeePayer" 
                      checked={primaryFeePayer === 'BUYER_PAYS'}
                      onChange={() => setPrimaryFeePayer('BUYER_PAYS')}
                      className="text-blue-600"
                    />
                    <span className="font-medium text-slate-700 dark:text-slate-200">{t("Cho phép BTC cấu hình 'Người mua chịu phí' (Buyer pays fee)")}</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 text-[11px] text-emerald-800 dark:text-emerald-300 shrink-0 font-medium">
                <FiShield className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{t("Sự kiện miễn phí: 0% (Hỗ trợ cộng đồng & sinh viên)")}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="app-bg-card border app-border rounded-xl shadow-xs overflow-hidden flex flex-col">
        {/* Tabs with Badges */}
        <div className="flex items-center border-b app-border px-2 pt-2 overflow-x-auto no-scrollbar">
          <button 
            onClick={() => { setActiveTab('PENDING'); setCurrentPage(1); }}
            className={`px-4 py-2.5 text-xs font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer shrink-0 ${activeTab === 'PENDING' ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}
          >
            <span>{t("Chờ Đối Soát")}</span>
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
            <span>{t("Đã Thanh Toán")}</span>
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
            <span>{t("Tranh chấp / Hoàn tiền")}</span>
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
              placeholder={t("Tìm tên sự kiện, mã đối soát, BTC...")}
              className="w-full pl-9 pr-3 min-h-9 text-xs rounded-md border app-border bg-slate-50 dark:bg-[#1E1E20] focus:bg-white dark:focus:bg-[#171719] outline-none focus:border-blue-500 transition-colors app-text-main" 
            />
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Filter by Gross revenue range */}
            <div className="w-44">
              <CustomSelect 
                options={[
                  { value: 'ALL', label: t('Tất cả mức thu') },
                  { value: 'UNDER_100M', label: t('< 100 triệu') },
                  { value: '100M_500M', label: t('100 - 500 triệu') },
                  { value: 'ABOVE_500M', label: t('> 500 triệu') }
                ]}
                value={filterGross}
                onChange={(val) => { setFilterGross(val); setCurrentPage(1); }}
                placeholder={t("Khoảng Tổng thu")}
              />
            </div>

            {/* Filter by Date */}
            <div className="w-36">
              <CustomSelect 
                options={[
                  { value: 'ALL', label: t('Mọi thời gian') },
                  { value: 'TODAY', label: t('Hôm nay') },
                  { value: 'WEEK', label: t('Tuần này') },
                  { value: 'MONTH', label: t('Tháng này') }
                ]}
                value={filterDate}
                onChange={(val) => { setFilterDate(val); setCurrentPage(1); }}
                placeholder={t("Thời gian")}
              />
            </div>
          </div>
        </div>

        {/* Table Area */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800/40 border-b app-border text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="px-4 py-3">{t("Mã đối soát")}</th>
                <th className="px-4 py-3">{t("Sự kiện & BTC")}</th>
                <th className="px-4 py-3 text-right">{t("Tổng thu (Gross)")}</th>
                <th className="px-4 py-3 text-right">{t("Phí nền tảng")}</th>
                <th className="px-4 py-3 text-right">{t("Thực nhận (Net Payout)")}</th>
                <th className="px-4 py-3 text-center">{t("Thao tác")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50 text-xs app-text-main font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                    <FiLoader className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
                    {t("Đang tải dữ liệu...")}
                  </td>
                </tr>
              ) : paginatedItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500 text-sm">
                    {searchQuery || filterGross !== 'ALL' || filterDate !== 'ALL'
                      ? t("Không tìm thấy lệnh đối soát nào phù hợp với bộ lọc.")
                      : (activeTab === 'PENDING' ? t("Không có lệnh chờ đối soát nào.") : activeTab === 'COMPLETED' ? t("Không có lệnh đã thanh toán nào.") : t("Chưa có dữ liệu tranh chấp hoặc hoàn tiền."))}
                  </td>
                </tr>
              ) : (
                paginatedItems.map(item => {
                  const displayCode = item.id.includes('-') ? item.id.split('-')[0] : item.id.slice(0, 8);
                  const organizerDisplay = organizerNames[item.organizerUserId] || "Ban Tổ Chức Halo";
                  const eventDisplay = eventTitles[item.eventId] || item.eventId;

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
                              {t("Chờ duyệt")}
                            </span>
                          )}
                          {item.status === 'COMPLETED' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-100 dark:border-emerald-900/30 shrink-0">
                              <FiCheckCircle className="w-3 h-3" />
                              {t("Đã thanh toán")}
                            </span>
                          )}
                          {item.status === 'DISPUTE' && (
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 text-[10px] font-bold border border-rose-100 dark:border-rose-900/30 shrink-0">
                              <FiAlertTriangle className="w-3 h-3" />
                              {t("Tranh chấp")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium">
                          {item.status === 'COMPLETED' 
                            ? `${t("Hoàn tất")}: ${new Date(item.transferredAt || item.updatedAt).toLocaleDateString('vi-VN')}`
                            : `${t("Tạo lúc")}: ${new Date(item.createdAt).toLocaleDateString('vi-VN')}`}
                        </p>
                      </td>

                      {/* Sự kiện & Tên Ban Tổ Chức (Hiển thị Tên Sự Kiện Rõ Ràng) */}
                      <td className="px-4 py-4 max-w-xs">
                        <div className="flex items-center gap-1.5 mb-1 min-w-0">
                          <FiCalendar className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate" title={eventDisplay}>
                            {eventDisplay}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div className="w-4 h-4 rounded bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[8px] font-bold text-slate-600 dark:text-slate-300 uppercase shrink-0">
                            {organizerDisplay.substring(0, 1)}
                          </div>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-semibold truncate max-w-[220px]" title={organizerDisplay}>
                            {organizerDisplay}
                          </p>
                        </div>

                        {/* Dispute reason if flagged */}
                        {item.status === 'DISPUTE' && item.disputeReason && (
                          <div className="mt-1.5 flex items-center gap-1.5 text-[10px] text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 px-2 py-1 rounded border border-rose-200 dark:border-rose-900/50 font-medium">
                            <FiAlertTriangle className="w-3 h-3 shrink-0" />
                            <span className="truncate" title={item.disputeReason}>
                              {item.disputeReason}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Tổng thu */}
                      <td className="px-4 py-3 text-right">
                        <p className="font-semibold text-slate-800 dark:text-slate-200">{item.grossAmount.toLocaleString('vi-VN')}đ</p>
                      </td>

                      {/* Phí nền tảng */}
                      <td className="px-4 py-3 text-right text-rose-600 dark:text-rose-400 font-medium">
                        <p>-{item.platformFee.toLocaleString('vi-VN')}đ</p>
                        <p className="text-[10px] opacity-75">{t("Cắt")} {primaryTotalFee}%</p>
                      </td>

                      {/* Thực nhận */}
                      <td className="px-4 py-4 text-right">
                        {item.status === 'PENDING' ? (
                          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 inline-block text-right min-w-[120px]">
                            <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm mb-0.5">{item.netAmount.toLocaleString('vi-VN')}đ</p>
                            <p className="text-[9px] font-bold text-emerald-700/60 dark:text-emerald-400/60 uppercase">{t("Net Transfer")}</p>
                          </div>
                        ) : (
                          <p className="font-black text-emerald-600 dark:text-emerald-400 text-sm">{item.netAmount.toLocaleString('vi-VN')}đ</p>
                        )}
                      </td>

                      {/* Thao tác */}
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          {item.status === 'PENDING' && (
                            <>
                              <button 
                                onClick={() => { setSelectedPayout(item); setPayoutModalOpen(true); }}
                                className="inline-flex items-center min-h-8 gap-1.5 px-3 text-[11px] font-semibold rounded-md bg-blue-600 hover:bg-blue-700 text-white transition-colors cursor-pointer shadow-xs"
                              >
                                <FiCheck className="w-3.5 h-3.5" /> 
                                <span>{t("Duyệt Payout")}</span>
                              </button>
                              <button 
                                onClick={() => handleOpenDispute(item)}
                                className="inline-flex items-center min-h-9.5 gap-1 px-3 text-[11px] font-medium rounded-md border border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors cursor-pointer"
                                title={t("Tạm hoãn và chuyển sang Tranh chấp để rà soát")}
                              >
                                <FiAlertTriangle className="w-3 h-3" />
                                <span>{t("Tạm hoãn")}</span>
                              </button>
                            </>
                          )}

                          {item.status === 'COMPLETED' && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center min-h-8 gap-1 px-2.5 text-[11px] font-bold rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 select-none">
                                <FiCheck className="w-3.5 h-3.5" /> {t("Đã Duyệt")}
                              </span>
                              <button
                                onClick={() => { setSelectedPayout(item); setPayoutModalOpen(true); }}
                                className="p-1.5 text-slate-400 hover:text-blue-600 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                title={t("Xem chi tiết & mã QR")}
                              >
                                <FiEye className="w-4 h-4" />
                              </button>
                            </div>
                          )}

                          {item.status === 'DISPUTE' && (
                            <div className="flex items-center gap-1.5">
                              <span className="inline-flex items-center min-h-8 gap-1 px-2 text-[11px] font-bold rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 select-none">
                                <FiAlertTriangle className="w-3.5 h-3.5" /> {t("Đang giữ")}
                              </span>
                              <button
                                onClick={() => handleReopenPayout(item.id)}
                                className="inline-flex items-center min-h-8 gap-1 px-2.5 text-[11px] font-semibold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer shadow-xs"
                                title={t("Mở lại lệnh đối soát sang Chờ duyệt")}
                              >
                                <FiRotateCcw className="w-3 h-3" />
                                <span>{t("Mở lại")}</span>
                              </button>
                            </div>
                          )}
                        </div>
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
          onConfirm={selectedPayout.status === 'PENDING' ? handleApprove : () => setPayoutModalOpen(false)}
          title={selectedPayout.status === 'PENDING' ? t("Duyệt & Giải Ngân Lệnh Tất Toán (Payout)") : t("Chi Tiết Lệnh Đối Soát Đã Hoàn Tất")}
          subtitle={`${t("Phê duyệt lệnh đối soát")} #${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()} • ${t("Giải ngân quỹ Escrow sang tài khoản Ban tổ chức")}`}
          confirmText={selectedPayout.status === 'PENDING' ? (isApproving ? t("Đang xử lý...") : t("Xác nhận đã chuyển & Hoàn tất")) : t("Đóng")}
          cancelText={selectedPayout.status === 'PENDING' ? t("Đóng") : undefined}
          isDanger={false}
          pending={isApproving}
          maxWidth="max-w-4xl"
        >
          <div className="mt-4 space-y-4">
            {/* Event Name & Verification Badge */}
            <div className="p-3 rounded-xl border border-blue-200/70 dark:border-blue-900/50 bg-blue-50/60 dark:bg-blue-950/30 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <FiCalendar className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block">
                    {t("Sự kiện đối soát")}
                  </span>
                  <strong className="text-sm font-bold app-text-main truncate block">
                    {eventTitles[selectedPayout.eventId] || selectedPayout.eventId}
                  </strong>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[11px] font-black uppercase bg-emerald-600 text-white shrink-0 flex items-center gap-1 shadow-2xs">
                <FiCheckCircle className="w-3.5 h-3.5" />
                {t("Escrow Hợp Lệ")}
              </span>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
              {/* Left Column: Beneficiary & Financial breakdown (7 cols) */}
              <div className="lg:col-span-7 space-y-3.5">
                {/* Beneficiary Box */}
                <div className="p-4 rounded-xl border app-border bg-slate-50/70 dark:bg-slate-800/40 space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between border-b app-border pb-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                      <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                        {t("Tài khoản thụ hưởng BTC (Bước 5)")}
                      </span>
                    </div>
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300">
                      Napas 24/7
                    </span>
                  </div>

                  {isLoadingBank ? (
                    <div className="py-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                      <FiLoader className="w-4 h-4 animate-spin text-blue-500" /> {t("Đang tải thông tin tài khoản ngân hàng...")}
                    </div>
                  ) : (
                    <div className="space-y-2.5 text-xs">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">{t("Chủ tài khoản:")}</span>
                          <strong className="app-text-main font-bold text-sm block truncate" title={payoutBankInfo?.accountHolder}>
                            {payoutBankInfo?.accountHolder || t("Đang cập nhật")}
                          </strong>
                        </div>
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">{t("Ngân hàng:")}</span>
                          <strong className="app-text-main font-bold text-sm block truncate" title={payoutBankInfo?.bankName}>
                            {payoutBankInfo?.bankName || "Vietcombank"}
                            {payoutBankInfo?.bankBranch ? ` (${payoutBankInfo.bankBranch})` : ""}
                          </strong>
                        </div>
                      </div>

                      <div>
                        <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-1">{t("Số tài khoản:")}</span>
                        <div className="flex items-center justify-between p-2 rounded-lg bg-white dark:bg-zinc-900 border app-border">
                          <span className="font-mono font-black text-base text-blue-600 dark:text-blue-400 tracking-wider">
                            {payoutBankInfo?.accountNumber || "---"}
                          </span>
                          <button 
                            type="button" 
                            onClick={() => {
                              if (payoutBankInfo?.accountNumber) {
                                navigator.clipboard.writeText(payoutBankInfo.accountNumber);
                                toast.success(t("Đã sao chép số tài khoản!"));
                              }
                            }}
                            className="px-2.5 py-1 text-xs font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded border border-blue-200 dark:border-blue-800/60 flex items-center gap-1.5 cursor-pointer transition-colors"
                            title={t("Sao chép STK")}
                          >
                            <FiCopy className="w-3.5 h-3.5" />
                            <span>{t("Sao chép")}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Financial Settlement Breakdown */}
                <div className="p-4 rounded-xl border app-border bg-slate-50/70 dark:bg-slate-800/40 space-y-2.5 shadow-2xs">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 block">
                    {t("Bóc tách đối soát tài chính")}
                  </span>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>{t("Doanh thu bán vé (Gross):")}</span>
                      <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                        {selectedPayout.grossAmount.toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                      <span>
                        {t("Phí nền tảng khấu trừ")}
                        {selectedPayout.grossAmount > 0 && selectedPayout.platformFee 
                          ? ` (${((selectedPayout.platformFee / selectedPayout.grossAmount) * 100).toFixed(0)}%)` 
                          : ""}:
                      </span>
                      <span className="font-mono font-semibold text-rose-500">
                        -{(selectedPayout.platformFee || 0).toLocaleString('vi-VN')}đ
                      </span>
                    </div>
                    <div className="pt-2 border-t app-border flex items-center justify-between">
                      <span className="font-bold app-text-main text-sm">{t("Thực nhận giải ngân (Net Payout):")}</span>
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
                      {t("Nội dung chuyển khoản (Memo)")}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-500">{t("Bắt buộc để khớp lệnh")}</span>
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
                        toast.success(t("Đã sao chép nội dung chuyển khoản!"));
                      }}
                      className="px-2 py-1 text-xs font-medium hover:bg-slate-100 dark:hover:bg-zinc-800 rounded text-slate-600 dark:text-slate-300 flex items-center gap-1 cursor-pointer transition-colors shrink-0 ml-2"
                      title={t("Sao chép nội dung CK")}
                    >
                      <FiCopy className="w-3.5 h-3.5" />
                      <span>{t("Sao chép")}</span>
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
                        {t("Mã VietQR Napas 24/7")}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                        {t("Chuẩn SePay")}
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
                        {t("Mở App ngân hàng bất kỳ để quét mã chuyển nhanh 24/7. Số tiền và nội dung đối soát tự động điền chính xác 100%.")}
                      </p>
                      <a 
                        href={`https://img.vietqr.io/image/${getVietQRBankCode(payoutBankInfo.bankName)}-${payoutBankInfo.accountNumber}-compact2.png?amount=${selectedPayout.netAmount}&addInfo=HALOTICKET%20PAYOUT%20${selectedPayout.id.includes('-') ? selectedPayout.id.split('-')[0].toUpperCase() : selectedPayout.id.slice(0, 8).toUpperCase()}&accountName=${encodeURIComponent(payoutBankInfo.accountHolder)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline pt-1 cursor-pointer"
                      >
                        <FiExternalLink className="w-3 h-3" />
                        <span>{t("Mở ảnh QR kích thước gốc")}</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="w-full h-64 rounded-2xl border app-border bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-xs text-slate-400">
                    <FiLoader className="w-5 h-5 animate-spin mr-2" /> {t("Đang chuẩn bị mã QR...")}
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Explanation Alert */}
            <div className="p-3 rounded-xl border border-blue-200/60 dark:border-blue-900/40 bg-blue-50/50 dark:bg-blue-950/20 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
              <FiInfo className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
              <p className="leading-relaxed">
                {t('Số tiền giải ngân được trích trực tiếp từ quỹ Escrow (Ký quỹ giữ tiền) sang tài khoản Ban tổ chức. Sau khi kế toán chuyển tiền thành công, nhấn')} <strong>"{t('Xác nhận đã chuyển & Hoàn tất')}"</strong> {t('để cập nhật trạng thái lệnh sang')} <strong>{t('Đã thanh toán')}</strong> {t('và gửi biên lai đối soát cho BTC.')}
              </p>
            </div>
          </div>
        </AdminConfirmModal>
      )}

      {/* Modal Tạm Hoãn & Chuyển Sang Tranh Chấp */}
      {disputeModalOpen && targetDisputePayout && (
        <AdminConfirmModal
          onClose={() => setDisputeModalOpen(false)}
          onConfirm={handleConfirmDispute}
          title={t("Tạm Hoãn Đối Soát & Chuyển Sang Tranh Chấp")}
          subtitle={`${t("Lệnh đối soát")} #${targetDisputePayout.id} • ${t("Tạm dừng giải ngân để rà soát chứng từ hoặc giải quyết khiếu nại")}`}
          confirmText={isDisputing ? t("Đang lưu...") : t("Xác nhận tạm hoãn")}
          cancelText={t("Hủy bỏ")}
          isDanger={true}
          pending={isDisputing}
          maxWidth="max-w-lg"
        >
          <div className="mt-4 space-y-3 text-xs">
            <div className="p-3 rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200">
              <span className="font-bold flex items-center gap-1.5 mb-1">
                <FiAlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                {t("Cảnh báo đóng băng quỹ giải ngân")}
              </span>
              <p className="leading-relaxed">
                {t("Lệnh này sẽ được chuyển sang tab 'Tranh chấp / Hoàn tiền'. Quỹ Escrow")} <strong>{targetDisputePayout.netAmount.toLocaleString('vi-VN')}đ</strong> {t("sẽ tiếp tục được bảo toàn tại HaloTicket cho đến khi Admin mở lại.")}
              </p>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                {t("Lý do tạm hoãn / khiếu nại:")} <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                rows={3}
                placeholder={t("Nhập lý do tạm hoãn hoặc yêu cầu kiểm tra (vé hoàn, hủy sự kiện, khiếu nại khách hàng)...")}
                className="w-full p-2.5 rounded-lg border app-border app-bg-card app-text-main text-xs focus:outline-none focus:ring-2 focus:ring-rose-500/30"
              />
            </div>
          </div>
        </AdminConfirmModal>
      )}
    </div>
  );
}

export default PaymentMonitoring;
