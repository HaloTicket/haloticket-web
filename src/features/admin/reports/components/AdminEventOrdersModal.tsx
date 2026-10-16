import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  FiX,
  FiSearch,
  FiDownload,
  FiRefreshCw,
  FiShoppingCart,
  FiCheckCircle,
  FiClock,
  FiXCircle,
  FiEye,
} from "react-icons/fi";
import { toast } from "sonner";
import { eventApi } from "@/services/eventApi";
import { ticketApi } from "@/services/ticketApi";
import { CustomSelect } from "@/components/common/CustomSelect";
import { AdminPagination } from "@/components/admin/AdminPagination";
import { OrderDetailsModal } from "@/features/organizer/event-manage/components/OrderDetailsModal";
import * as XLSX from "xlsx";

interface AdminEventOrdersModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  eventTitle: string;
}

export const AdminEventOrdersModal: React.FC<AdminEventOrdersModalProps> = ({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}) => {
  const { t } = useTranslation();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalElements, setTotalElements] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [seatZones, setSeatZones] = useState<any[]>([]);
  const [exporting, setExporting] = useState(false);

  // combine multiple tables/sources
  useEffect(() => {
    if (!isOpen || !eventId) return;

    let isMounted = true;

    async function loadAllTicketSources() {
      const collectedTypes: any[] = [];
      const collectedZones: any[] = [];

      try {
        // base ticket types by event (all without deduplication)
        const baseTypes = await ticketApi.getAllTicketTypesByEventId(eventId).catch(() => []);
        if (Array.isArray(baseTypes)) {
          collectedTypes.push(...baseTypes);
        }

        // event details & showtimes
        const eventData = await eventApi.getEventById(eventId).catch(() => null);
        const showtimes: any[] = (eventData as any)?.showtimes || [];

        // ticket types for every showtime
        if (showtimes.length > 0) {
          const showtimeResults = await Promise.all(
            showtimes.map((st) =>
              ticketApi.getTicketTypesByShowtimeId(st.id).catch(() => [])
            )
          );
          showtimeResults.forEach((list) => {
            if (Array.isArray(list)) {
              collectedTypes.push(...list);
            }
          });
        }

        // seat layout & zones
        const layout = await ticketApi.getSeatLayoutByEventId(eventId).catch(() => null);
        if (layout?.zones && Array.isArray(layout.zones)) {
          collectedZones.push(...layout.zones);
        }
        if (layout?.draftJson) {
          try {
            const draft = JSON.parse(layout.draftJson);
            if (draft?.zones) {
              const zoneValues = Array.isArray(draft.zones)
                ? draft.zones
                : Object.values(draft.zones);
              collectedZones.push(...zoneValues);
            }
            if (draft?.tiers && Array.isArray(draft.tiers)) {
              collectedTypes.push(...draft.tiers);
            }
          } catch {
            // ignore json parse error
          }
        }

        if (isMounted) {
          setTicketTypes(collectedTypes);
          setSeatZones(collectedZones);
        }
      } catch (err) {
        console.warn("Failed to load comprehensive ticket sources:", err);
      }
    }

    loadAllTicketSources();

    return () => {
      isMounted = false;
    };
  }, [isOpen, eventId]);

  // combined dictionary from all tables:
  // - ID -> Tier Name
  // - Unit Price -> Tier Name
  const { idToNameMap, priceToNameMap } = useMemo(() => {
    const idMap = new Map<string, string>();
    const priceMap = new Map<number, string>();

    // populate from ticket_types
    ticketTypes.forEach((t) => {
      if (t.id && t.name) idMap.set(String(t.id).toLowerCase(), t.name);
      if (t.ticketTypeId && t.name) idMap.set(String(t.ticketTypeId).toLowerCase(), t.name);
      if (t.price !== undefined && t.name) {
        priceMap.set(Number(t.price), t.name);
      }
    });

    // populate from seat_zones
    seatZones.forEach((z) => {
      if (z.id && z.name) idMap.set(String(z.id).toLowerCase(), z.name);
      if (z.ticketTypeId && z.name) {
        idMap.set(String(z.ticketTypeId).toLowerCase(), z.name);
      }
      if (z.price !== undefined && z.name) {
        priceMap.set(Number(z.price), z.name);
      }
    });

    return { idToNameMap: idMap, priceToNameMap: priceMap };
  }, [ticketTypes, seatZones]);

  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // resolves the true ticket tier name by combining all sources
  const getTicketName = useCallback(
    (item: any) => {
      const typeId = String(item?.ticketTypeId || item?.id || "").toLowerCase();
      const unitPrice = Number(item?.unitPrice || 0);

      // direct ID match from all tables (ticket_types, showtimes, seat_zones)
      if (typeId && idToNameMap.has(typeId)) {
        return idToNameMap.get(typeId)!;
      }

      // exact match by Unit Price to event tier
      if (unitPrice > 0 && priceToNameMap.has(unitPrice)) {
        return priceToNameMap.get(unitPrice)!;
      }

      // item properties if valid name
      if (item?.ticketTypeName && !isUuid(item.ticketTypeName)) {
        return item.ticketTypeName;
      }
      if (item?.tierName) return item.tierName;
      if (item?.zoneName) return item.zoneName;
      if (item?.name && !isUuid(item.name)) return item.name;

      // closest price match among event tiers
      if (unitPrice > 0 && priceToNameMap.size > 0) {
        let closestName = "";
        let minDiff = Infinity;
        for (const [p, name] of priceToNameMap.entries()) {
          const diff = Math.abs(p - unitPrice);
          if (diff < minDiff) {
            minDiff = diff;
            closestName = name;
          }
        }
        if (closestName && minDiff / unitPrice < 0.3) {
          return closestName;
        }
      }

      if (unitPrice > 0) {
        return `Hạng vé ${unitPrice.toLocaleString("vi-VN")} đ`;
      }
      return "Hạng vé tiêu chuẩn";
    },
    [idToNameMap, priceToNameMap]
  );

  // load orders
  const fetchOrders = useCallback(async () => {
    if (!isOpen || !eventId) return;
    setLoading(true);
    try {
      const res: any = await eventApi.getEventBookings(
        eventId,
        searchQuery,
        "",
        page - 1,
        size
      );
      if (res) {
        let content = res.content || [];
        if (statusFilter !== "ALL") {
          content = content.filter((o: any) => o.status === statusFilter);
        }
        setOrders(content);
        setTotalPages(res.totalPages || 1);
        setTotalElements(
          typeof res.totalElements === "number"
            ? res.totalElements
            : content.length
        );
      }
    } catch (error) {
      console.error("Failed to load event bookings:", error);
      toast.error("Không thể tải danh sách đơn hàng của sự kiện.");
    } finally {
      setLoading(false);
    }
  }, [isOpen, eventId, searchQuery, statusFilter, page, size]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  if (!isOpen) return null;

  const formatVnd = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount || 0);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PAID":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <FiCheckCircle className="w-3 h-3" />
            {t("Thành công")}
          </span>
        );
      case "PENDING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <FiClock className="w-3 h-3" />
            {t("Chờ thanh toán")}
          </span>
        );
      case "REFUNDED":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-purple-500/30 bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <FiRefreshCw className="w-3 h-3" />
            {t("Đã hoàn tiền")}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <FiXCircle className="w-3 h-3" />
            {status ? t(status) : t("Đã hủy")}
          </span>
        );
    }
  };

  // export event orders report (Excel & CSV)
  const handleExport = async (formatType: "xlsx" | "csv") => {
    if (exporting) return;
    setExporting(true);
    try {
      toast.info(t("Đang trích xuất toàn bộ dữ liệu đơn hàng..."));
      // fetch all bookings up to 5000
      const res: any = await eventApi.getEventBookings(
        eventId,
        searchQuery,
        "",
        0,
        5000
      );
      let allOrders = res?.content || [];
      if (statusFilter !== "ALL") {
        allOrders = allOrders.filter((o: any) => o.status === statusFilter);
      }

      if (allOrders.length === 0) {
        toast.warning(t("Không có đơn hàng nào để xuất báo cáo."));
        setExporting(false);
        return;
      }

      const totalRevenue = allOrders
        .filter((o: any) => o.status === "PAID")
        .reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0);

      const totalTickets = allOrders.reduce((sum: number, o: any) => {
        const items = o.items || [];
        const count = items.reduce(
          (c: number, item: any) => c + (Number(item.quantity) || 1),
          0
        );
        return sum + count;
      }, 0);

      const generatedTime = new Date().toLocaleString("vi-VN");
      const metadata = [
        ["BÁO CÁO CHI TIẾT ĐƠN HÀNG SỰ KIỆN - HALOTICKET"],
        [`Tên sự kiện:`, eventTitle || "Không rõ"],
        [`Mã sự kiện:`, eventId],
        [`Thời gian xuất:`, generatedTime],
        [`Múi giờ:`, "Asia/Ho_Chi_Minh (UTC+7)"],
        [
          `Bộ lọc áp dụng:`,
          `Tìm kiếm: "${searchQuery || "Tất cả"}" | Trạng thái: ${statusFilter}`,
        ],
        [],
        ["TỔNG HỢP NHANH"],
        [`Tổng số đơn hàng:`, allOrders.length],
        [`Tổng số vé:`, totalTickets],
        [`Tổng doanh thu thành công:`, formatVnd(totalRevenue)],
        [],
        [
          "STT",
          "Mã đơn hàng",
          "Thời gian mua",
          "Tên khách hàng",
          "Email",
          "Số điện thoại",
          "Chi tiết vé (Hạng vé)",
          "Số lượng vé",
          "Tổng tiền (VNĐ)",
          "Phương thức thanh toán",
          "Trạng thái đơn",
        ],
      ];

      const dataRows = allOrders.map((o: any, idx: number) => {
        const items = o.items || [];
        const ticketsDetail = items
          .map(
            (i: any) =>
              `${getTicketName(i)} (x${i.quantity || 1})`
          )
          .join("; ");
        const ticketsCount = items.reduce(
          (c: number, i: any) => c + (Number(i.quantity) || 1),
          0
        );

        return [
          idx + 1,
          o.bookingCode || o.id,
          o.createdAt
            ? new Date(o.createdAt).toLocaleString("vi-VN")
            : "N/A",
          o.customerName || "N/A",
          o.customerEmail || "N/A",
          o.customerPhone || "N/A",
          ticketsDetail || "Hạng vé tiêu chuẩn",
          ticketsCount || 1,
          Number(o.totalAmount) || 0,
          o.paymentMethod || "VIETQR",
          o.status === "PAID"
            ? "Thành công"
            : o.status === "PENDING"
            ? "Chờ thanh toán"
            : o.status === "REFUNDED"
            ? "Đã hoàn tiền"
            : "Đã hủy",
        ];
      });

      const totalRow = [
        "",
        "TỔNG CỘNG",
        "",
        "",
        "",
        "",
        "",
        totalTickets,
        totalRevenue,
        "",
        "",
      ];

      const fullSheetData = [...metadata, ...dataRows, totalRow];
      const stamp = new Date().toISOString().slice(0, 10);

      if (formatType === "xlsx") {
        const worksheet = XLSX.utils.aoa_to_sheet(fullSheetData);
        worksheet["!cols"] = [
          { wch: 6 }, // STT
          { wch: 22 }, // Mã đơn
          { wch: 20 }, // Thời gian
          { wch: 24 }, // Khách hàng
          { wch: 28 }, // Email
          { wch: 15 }, // SĐT
          { wch: 32 }, // Chi tiết vé
          { wch: 14 }, // Số vé
          { wch: 20 }, // Tổng tiền
          { wch: 22 }, // Phương thức
          { wch: 16 }, // Trạng thái
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "DonHang");
        XLSX.writeFile(workbook, `BaoCaoDonHang_${eventId}_${stamp}.xlsx`);
      } else {
        const csvContent = fullSheetData
          .map((row: any[]) =>
            row
              .map((cell: any) => {
                const text = String(cell ?? "").replaceAll('"', '""');
                return `"${text}"`;
              })
              .join(",")
          )
          .join("\r\n");

        const blob = new Blob(["\uFEFF", csvContent], {
          type: "text/csv;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `BaoCaoDonHang_${eventId}_${stamp}.csv`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(t("Đã xuất báo cáo đơn hàng thành công!"));
    } catch (err) {
      console.error("Export orders error:", err);
      toast.error(t("Không thể xuất file báo cáo đơn hàng."));
    } finally {
      setExporting(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative w-full max-w-5xl max-h-[92vh] overflow-hidden flex flex-col app-bg-card border app-border rounded-lg shadow-2xl z-10 text-[var(--text-main)]">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-5 border-b app-border app-bg-subnav">
            <div className="min-w-0 pr-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-blue-600/10 text-blue-600 dark:text-blue-400 border border-blue-600/20">
                  {t("Báo cáo đơn hàng")}
                </span>
                <span className="text-xs font-mono app-text-muted">ID: {eventId}</span>
              </div>
              <h3 className="text-base sm:text-lg font-black app-text-main truncate mt-1">
                {eventTitle || t("Danh sách đơn hàng sự kiện")}
              </h3>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Export dropdown */}
              <div className="relative group">
                <button
                  type="button"
                  disabled={exporting}
                  className="min-h-9 px-3.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  <FiDownload className="w-3.5 h-3.5" />
                  <span>{exporting ? t("Đang xuất...") : t("Xuất báo cáo")}</span>
                </button>
                <div className="absolute top-10 right-0 z-30 hidden min-w-40 rounded-lg border app-border app-bg-card p-1 shadow-xl group-hover:block group-focus-within:block">
                  <button
                    type="button"
                    onClick={() => handleExport("xlsx")}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t("Xuất Excel (.xlsx)")}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExport("csv")}
                    className="w-full text-left px-3 py-2 text-xs font-medium rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    {t("Xuất CSV (.csv)")}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 app-text-muted hover:app-text-main transition-colors cursor-pointer"
                aria-label={t("Đóng")}
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="p-4 border-b app-border flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 app-bg-card">
            <div className="flex-1 flex items-center gap-2">
              <div className="relative flex-1">
                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setSearchQuery(searchInput);
                      setPage(1);
                    }
                  }}
                  placeholder={t("Tìm mã đơn, tên khách, email...")}
                  className="min-h-9 w-full pl-9 pr-3 py-1.5 rounded-md border app-border app-bg-card text-xs font-medium app-text-main placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery(searchInput);
                  setPage(1);
                }}
                className="min-h-9 px-3.5 py-1.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-xs font-bold app-text-main transition-colors shrink-0 cursor-pointer"
              >
                {t("Tìm")}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <div className="w-40 shrink-0">
                <CustomSelect
                  value={statusFilter}
                  onChange={(val) => {
                    setStatusFilter(val);
                    setPage(1);
                  }}
                  options={[
                    { value: "ALL", label: t("Tất cả trạng thái") },
                    { value: "PAID", label: t("Thành công") },
                    { value: "PENDING", label: t("Chờ thanh toán") },
                    { value: "REFUNDED", label: t("Đã hoàn tiền") },
                    { value: "CANCELLED", label: t("Đã hủy") },
                  ]}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setSearchInput("");
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPage(1);
                  fetchOrders();
                }}
                className="min-h-9 p-2 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 app-text-muted hover:app-text-main transition-colors shrink-0 cursor-pointer"
                title={t("Làm mới")}
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-blue-500" : ""}`} />
              </button>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading && orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-sm app-text-muted">
                <FiRefreshCw className="w-6 h-6 animate-spin text-blue-500" />
                <span>{t("Đang tải danh sách đơn hàng...")}</span>
              </div>
            ) : orders.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-2">
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <FiShoppingCart className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold app-text-main">{t("Không có đơn hàng nào")}</h4>
                <p className="text-xs app-text-muted max-w-sm">
                  {searchQuery || statusFilter !== "ALL"
                    ? t("Không tìm thấy đơn hàng phù hợp với điều kiện tìm kiếm/lọc.")
                    : t("Sự kiện này chưa phát sinh đơn hàng nào.")}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border app-border">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 uppercase tracking-wider text-[11px] font-bold app-text-muted border-b app-border">
                    <tr>
                      <th className="px-4 py-3">{t("Mã đơn")}</th>
                      <th className="px-4 py-3">{t("Khách hàng")}</th>
                      <th className="px-4 py-3">{t("Chi tiết vé")}</th>
                      <th className="px-4 py-3">{t("Tổng tiền")}</th>
                      <th className="px-4 py-3">{t("Phương thức")}</th>
                      <th className="px-4 py-3">{t("Trạng thái")}</th>
                      <th className="px-4 py-3">{t("Thời gian")}</th>
                      <th className="px-4 py-3 text-right">{t("Chi tiết")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {orders.map((o) => {
                      const items = o.items || [];
                      const ticketsCount = items.reduce(
                        (sum: number, i: any) => sum + (Number(i.quantity) || 1),
                        0
                      );

                      return (
                        <tr
                          key={o.id || o.bookingCode}
                          className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <td className="px-4 py-3 font-mono font-bold text-blue-600 dark:text-blue-400">
                            {o.bookingCode || o.id}
                          </td>
                          <td className="px-4 py-3 max-w-[200px]">
                            <div className="font-bold app-text-main truncate">
                              {o.customerName || t("Khách hàng")}
                            </div>
                            <div className="text-[11px] app-text-muted truncate">
                              {o.customerEmail || "N/A"}
                            </div>
                          </td>
                          <td className="px-4 py-3 max-w-[220px]">
                            <span className="font-bold app-text-main">
                              {ticketsCount} {t("vé")}
                            </span>
                            {items.length > 0 && (
                              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 truncate mt-0.5">
                                {items
                                  .map(
                                    (i: any) =>
                                      `${getTicketName(i)} (x${i.quantity || 1})`
                                  )
                                  .join(", ")}
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                            {formatVnd(Number(o.totalAmount) || 0)}
                          </td>
                          <td className="px-4 py-3 app-text-muted text-[11px] uppercase font-semibold">
                            {o.paymentMethod || "VIETQR"}
                          </td>
                          <td className="px-4 py-3">{getStatusBadge(o.status)}</td>
                          <td className="px-4 py-3 text-[11px] app-text-muted tabular-nums whitespace-nowrap">
                            {o.createdAt
                              ? new Date(o.createdAt).toLocaleString("vi-VN", {
                                  dateStyle: "short",
                                  timeStyle: "short",
                                })
                              : "N/A"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(o)}
                              className="p-1.5 rounded-md text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 transition-colors cursor-pointer"
                              title={t("Xem chi tiết đơn hàng")}
                            >
                              <FiEye className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Footer Pagination */}
          {totalPages > 1 && (
            <div className="border-t app-border px-4 py-2">
              <AdminPagination
                page={page}
                totalPages={totalPages}
                totalElements={totalElements}
                size={size}
                loading={loading}
                itemLabel={t("đơn hàng")}
                onPageChange={(p) => setPage(p)}
                onPageSizeChange={(s) => {
                  setSize(s);
                  setPage(1);
                }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Order Details Modal if clicked */}
      {selectedOrder && (
        <OrderDetailsModal
          isOpen={Boolean(selectedOrder)}
          onClose={() => setSelectedOrder(null)}
          order={selectedOrder}
          ticketTypes={ticketTypes}
          seatZones={seatZones}
          ticketNameResolver={getTicketName}
        />
      )}
    </>
  );
};

export default AdminEventOrdersModal;
