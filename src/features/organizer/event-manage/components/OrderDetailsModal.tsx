import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FiX, FiCheckCircle, FiClock, FiXCircle, FiUser, FiCreditCard, FiTag } from "react-icons/fi";
import { format } from "date-fns";
import { vi, enUS } from "date-fns/locale";
import { ticketApi } from "@/services/ticketApi";
import { eventApi } from "@/services/eventApi";

/** Props của modal chi tiết đơn hàng: đơn cần xem, danh sách loại vé và khu ghế (nếu đã có) và hàm tùy chọn để suy ra tên hạng vé. */
interface OrderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: any;
  ticketTypes?: any[];
  seatZones?: any[];
  ticketNameResolver?: (item: any) => string;
}

/**
 * Modal chi tiết đơn hàng của sự kiện: trạng thái, người mua, thanh toán và danh sách vé theo hạng vé.
 * Khi người gọi không truyền loại vé hoặc khu ghế thì tự tải từ nhiều nguồn (loại vé, suất diễn, sơ đồ ghế) để suy ra tên hạng vé.
 */
export const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  isOpen,
  onClose,
  order,
  ticketTypes = [],
  seatZones = [],
  ticketNameResolver,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === "en" ? enUS : vi;
  const [internalTypes, setInternalTypes] = useState<any[]>([]);
  const [internalZones, setInternalZones] = useState<any[]>([]);

  /** Kiểm tra chuỗi có đúng dạng UUID hay không, để tránh hiện mã thô làm tên hạng vé. */
  const isUuid = (val: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);

  // nếu không truyền {@code ticketTypes} hoặc {@code seatZones}, tự tải từ nhiều nguồn theo {@code order.eventId}
  useEffect(() => {
    let isMounted = true;
    if (!isOpen || !order?.eventId) return;

    if (ticketTypes.length > 0 && seatZones.length > 0) {
      return;
    }

    /** Gom loại vé từ các bảng ticket_types, suất diễn và sơ đồ ghế (kể cả bản nháp) của sự kiện; mỗi nguồn lỗi thì bỏ qua. */
    async function loadSources() {
      try {
        const collectedTypes: any[] = [];
        const collectedZones: any[] = [];

        // bảng ticket_types (mọi suất diễn và sự kiện)
        const allTypes = await ticketApi.getAllTicketTypesByEventId(order.eventId).catch(() => []);
        if (Array.isArray(allTypes)) collectedTypes.push(...allTypes);

        // bảng event_showtimes và ticket_types theo suất diễn
        const eventData = await eventApi.getEventById(order.eventId).catch(() => null);
        const showtimes: any[] = (eventData as any)?.showtimes || [];
        if (showtimes.length > 0) {
          const showtimeResults = await Promise.all(
            showtimes.map((st) => ticketApi.getTicketTypesByShowtimeId(st.id).catch(() => []))
          );
          showtimeResults.forEach((list) => {
            if (Array.isArray(list)) collectedTypes.push(...list);
          });
        }

        // bảng seat_layouts và seat_zones
        const layout = await ticketApi.getSeatLayoutByEventId(order.eventId).catch(() => null);
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
            // ignore
          }
        }

        if (isMounted) {
          setInternalTypes(collectedTypes);
          setInternalZones(collectedZones);
        }
      } catch (err) {
        console.warn("Failed to load ticket sources in OrderDetailsModal:", err);
      }
    }

    loadSources();
    return () => {
      isMounted = false;
    };
  }, [isOpen, order?.eventId, ticketTypes.length, seatZones.length]);

  // từ điển gộp từ mọi bảng:
  // - ID sang tên hạng vé
  // - đơn giá sang tên hạng vé
  const { idToNameMap, priceToNameMap } = useMemo(() => {
    const idMap = new Map<string, string>();
    const priceMap = new Map<number, string>();

    const allTypes = [...ticketTypes, ...internalTypes];
    const allZones = [...seatZones, ...internalZones];

    allTypes.forEach((t) => {
      if (t.id && t.name) idMap.set(String(t.id).toLowerCase(), t.name);
      if (t.ticketTypeId && t.name) idMap.set(String(t.ticketTypeId).toLowerCase(), t.name);
      if (t.price !== undefined && t.name) {
        priceMap.set(Number(t.price), t.name);
      }
    });

    allZones.forEach((z) => {
      if (z.id && z.name) idMap.set(String(z.id).toLowerCase(), z.name);
      if (z.ticketTypeId && z.name) {
        idMap.set(String(z.ticketTypeId).toLowerCase(), z.name);
      }
      if (z.price !== undefined && z.name) {
        priceMap.set(Number(z.price), z.name);
      }
    });

    return { idToNameMap: idMap, priceToNameMap: priceMap };
  }, [ticketTypes, internalTypes, seatZones, internalZones]);

  /**
   * Suy ra tên hạng vé thật của một dòng đơn hàng. Thử lần lượt: hàm của người gọi, tra theo ID, các trường tên có sẵn,
   * ghế đã đặt, đúng đơn giá, đơn giá gần nhất (lệch dưới 30%); cuối cùng dùng tên chung theo giá.
   */
  const getTicketName = (item: any) => {
    // nếu người gọi có truyền hàm suy tên và hàm trả tên hợp lệ thì dùng luôn
    if (ticketNameResolver) {
      const resolved = ticketNameResolver(item);
      if (resolved && resolved !== "Vé tham gia" && !isUuid(resolved)) {
        return resolved;
      }
    }

    const typeId = String(item?.ticketTypeId || item?.id || "").toLowerCase();
    const unitPrice = Number(item?.unitPrice || 0);

    // tra ID trực tiếp trong {@code idToNameMap} đã gộp (ticket_types, seat_zones, suất diễn)
    if (typeId && idToNameMap.has(typeId)) {
      return idToNameMap.get(typeId)!;
    }

    // các thuộc tính tên có sẵn trên dòng nếu là tên hạng vé hợp lệ
    if (item?.ticketTypeName && !isUuid(item.ticketTypeName)) {
      return item.ticketTypeName;
    }
    if (item?.tierName) return item.tierName;
    if (item?.zoneName) return item.zoneName;
    if (item?.seatTypeName) return item.seatTypeName;
    if (item?.ticketType?.name && !isUuid(item.ticketType.name)) {
      return item.ticketType.name;
    }
    if (item?.name && !isUuid(item.name) && !item.name.includes("-")) {
      return item.name;
    }

    // đối chiếu với ghế đã đặt
    if (Array.isArray(order?.seatReservations)) {
      const seatMatch = order.seatReservations.find(
        (s: any) =>
          String(s.ticketTypeId || s.id || "").toLowerCase() === typeId ||
          (s.unitPrice && Number(s.unitPrice) === unitPrice)
      );
      if (seatMatch?.tierName) return seatMatch.tierName;
      if (seatMatch?.zoneName) return seatMatch.zoneName;
      if (seatMatch?.seatTypeName) return seatMatch.seatTypeName;
    }

    // khớp chính xác đơn giá với hạng vé của sự kiện
    if (unitPrice > 0 && priceToNameMap.has(unitPrice)) {
      return priceToNameMap.get(unitPrice)!;
    }

    // khớp đơn giá gần nhất trong các hạng vé của sự kiện
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

    // phương án dự phòng theo ngữ cảnh (KHÔNG BAO GIỜ dùng "Vé tham gia" hay UUID thô)
    if (unitPrice > 0) {
      return `${t("Hạng vé")} ${unitPrice.toLocaleString("vi-VN")} đ`;
    }
    return t("Hạng vé tiêu chuẩn");
  };

  if (!isOpen || !order) return null;

  /** Trả nhãn, biểu tượng và màu hiển thị cho trạng thái đơn hàng. */
  const getStatusConfig = (status: string) => {
    switch (status) {
      case "PAID":
        return {
          label: t("Thành công"),
          icon: FiCheckCircle,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-500/30",
        };
      case "PENDING":
        return {
          label: t("Chờ thanh toán"),
          icon: FiClock,
          color: "text-amber-600 dark:text-amber-400",
          bg: "bg-amber-50 dark:bg-amber-500/10 border-amber-500/30",
        };
      case "REFUNDED":
        return {
          label: t("Đã hoàn tiền"),
          icon: FiClock,
          color: "text-purple-600 dark:text-purple-400",
          bg: "bg-purple-50 dark:bg-purple-500/10 border-purple-500/30",
        };
      default:
        return {
          label: status ? t(status) : t("Đã hủy"),
          icon: FiXCircle,
          color: "text-rose-600 dark:text-rose-400",
          bg: "bg-rose-50 dark:bg-rose-500/10 border-rose-500/30",
        };
    }
  };

  const statusConfig = getStatusConfig(order.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-150">
      {/* Lớp nền mờ */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-xs cursor-pointer"
        onClick={onClose}
      />

      {/* Nội dung modal */}
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col app-bg-card border app-border rounded-lg shadow-2xl z-10 text-[var(--text-main)]">
        {/* Đầu modal */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b app-border app-bg-subnav">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-blue-600 dark:text-blue-400">
                {order.bookingCode || order.id}
              </h3>
              <span
                className={`flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-md font-bold border ${statusConfig.bg} ${statusConfig.color}`}
              >
                <StatusIcon className="w-3.5 h-3.5" />
                {statusConfig.label}
              </span>
            </div>
            <p className="text-xs app-text-muted font-medium mt-1">
              {t("Thời gian mua:")}{" "}
              {order.createdAt
                ? format(new Date(order.createdAt), "HH:mm, dd/MM/yyyy", {
                    locale: dateLocale,
                  })
                : "N/A"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md border app-border hover:bg-slate-100 dark:hover:bg-slate-800 app-text-muted hover:app-text-main transition-colors cursor-pointer"
            aria-label={t("Đóng")}
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* Thân modal (cuộn được) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Thẻ thông tin người mua */}
            <div className="app-bg-subnav border app-border rounded-lg p-4 space-y-2.5 shadow-xs">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FiUser className="w-4 h-4 text-blue-500" /> {t("Khách hàng")}
              </h4>
              <div>
                <p className="font-bold app-text-main text-sm">
                  {order.customerName || t("Khách hàng")}
                </p>
                <p className="text-xs app-text-muted mt-0.5">
                  {order.customerEmail || t("Không có email")}
                </p>
                {order.customerPhone && (
                  <p className="text-xs app-text-muted mt-0.5 font-mono">
                    {order.customerPhone}
                  </p>
                )}
              </div>
            </div>

            {/* Thẻ tóm tắt thanh toán */}
            <div className="app-bg-subnav border app-border rounded-lg p-4 space-y-2.5 shadow-xs">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <FiCreditCard className="w-4 h-4 text-emerald-500" /> {t("Thanh toán")}
              </h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between app-text-main">
                  <span className="app-text-muted">{t("Tạm tính:")}</span>
                  <span className="font-bold">
                    {(Number(order.subtotal) || Number(order.totalAmount) || 0).toLocaleString(
                      "vi-VN"
                    )}{" "}
                    đ
                  </span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600 dark:text-emerald-400">
                    <span>{t("Giảm giá:")}</span>
                    <span className="font-bold">
                      - {Number(order.discountAmount).toLocaleString("vi-VN")} đ
                    </span>
                  </div>
                )}
                <div className="flex justify-between pt-1 mt-1 border-t app-border">
                  <span className="font-bold text-sm">{t("Tổng thanh toán:")}</span>
                  <span className="font-black text-sm text-blue-600 dark:text-blue-400">
                    {(Number(order.totalAmount) || 0).toLocaleString("vi-VN")} đ
                  </span>
                </div>
                <div className="flex justify-between mt-1 text-[11px] app-text-muted">
                  <span>{t("Phương thức:")}</span>
                  <span className="font-bold uppercase">
                    {order.paymentMethod || "VIETQR"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Phần danh sách vé */}
          <div className="space-y-2.5">
            <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
              <FiTag className="w-4 h-4 text-purple-500" /> {t("Danh sách Vé")}
            </h4>

            {order.items && order.items.length > 0 ? (
              <div className="border app-border rounded-lg overflow-hidden shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 dark:bg-slate-800/50 border-b app-border text-[11px] uppercase tracking-wider font-bold app-text-muted">
                    <tr>
                      <th className="py-2.5 px-4">{t("Loại vé")}</th>
                      <th className="py-2.5 px-4 text-center">{t("Số lượng")}</th>
                      <th className="py-2.5 px-4 text-right">{t("Đơn giá")}</th>
                      <th className="py-2.5 px-4 text-right">{t("Thành tiền")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                    {order.items.map((item: any) => (
                      <tr
                        key={item.id || item.ticketTypeId}
                        className="app-bg-card hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="py-3 px-4 font-bold app-text-main">
                          {getTicketName(item)}
                        </td>
                        <td className="py-3 px-4 text-center font-bold app-text-main">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 text-right app-text-muted tabular-nums">
                          {(Number(item.unitPrice) || 0).toLocaleString("vi-VN")} đ
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-blue-600 dark:text-blue-400 tabular-nums">
                          {(Number(item.subTotal) || (Number(item.unitPrice) || 0) * (Number(item.quantity) || 1)).toLocaleString(
                            "vi-VN"
                          )}{" "}
                          đ
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-xs app-text-muted p-4 border app-border rounded-lg bg-slate-50/50 dark:bg-slate-800/30 text-center font-medium shadow-xs">
                {t("Không có dữ liệu vé")}
              </div>
            )}
          </div>

          {/* Phần ghế đã đặt */}
          {order.seatReservations && order.seatReservations.length > 0 && (
            <div className="space-y-2.5">
              <h4 className="text-xs font-black app-text-muted uppercase tracking-wider flex items-center gap-1.5">
                <svg
                  className="w-4 h-4 text-amber-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                  />
                </svg>
                {t("Ghế đã đặt")}
              </h4>
              <div className="flex flex-wrap gap-2">
                {order.seatReservations.map((seat: any) => (
                  <span
                    key={seat.id || seat.seatId}
                    className="px-2.5 py-1 text-xs font-bold text-amber-700 bg-amber-100 border border-amber-200 dark:border-amber-500/30 dark:bg-amber-500/20 dark:text-amber-400 rounded-md shadow-xs"
                  >
                    {t("Ghế")}: {seat.seatId}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;
