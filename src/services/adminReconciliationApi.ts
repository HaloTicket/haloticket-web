import axiosClient from "@/services/axiosClient";

/** Số liệu tổng quan của màn đối soát. Giá trị `null` nghĩa là không đọc được nguồn dữ liệu: hiển thị "chưa rõ", không bao giờ hiển thị 0. */
export interface ReconciliationSummary {
  openExceptions: number | null;
  paidWithoutTickets: number | null;
  stockDiscrepancies: number | null;
}

/** Bối cảnh của giao dịch: ai thanh toán, bằng cách nào và cho sự kiện nào. Mọi trường đều có thể thiếu, màn hình khi đó hiển thị dấu gạch. */
export interface ReconciliationContext {
  customerName?: string | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  paymentMethod?: string | null;
  eventId?: string | null;
  eventTitle?: string | null;
}

/** Một ngoại lệ thanh toán cần quản trị viên xử lý, kèm thông tin xử lý nếu đã được giải quyết. */
export interface PaymentExceptionItem extends ReconciliationContext {
  id: string;
  bookingId?: string | null;
  bookingCode?: string | null;
  paymentId?: string | null;
  kind: string;
  amount?: number | null;
  provider?: string | null;
  status: string;
  detail?: string | null;
  createdAt?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  resolutionNote?: string | null;
}

/** Một trang kết quả danh sách ngoại lệ thanh toán, kèm tổng số bản ghi. */
export interface PaymentExceptionPage { items: PaymentExceptionItem[]; total: number; page: number; size: number }

/** Đơn đã thanh toán nhưng chưa phát hành đủ vé, kèm số vé dự kiến, số vé đã phát hành và số phút kể từ lúc thanh toán. */
export interface PaidWithoutTicketsItem extends ReconciliationContext {
  bookingId: string;
  bookingCode?: string | null;
  paidAt?: string | null;
  amount?: number | null;
  expectedTickets: number;
  issuedTickets: number;
  minutesSincePaid: number;
}

/** Một loại vé có tồn kho lệch so với số vé đã phát hành hoặc số lượng đang giữ chỗ. */
export interface StockDiscrepancyItem {
  ticketTypeId: string;
  eventId?: string | null;
  showtimeId?: string | null;
  name?: string | null;
  initial?: number | null;
  remaining?: number | null;
  held?: number | null;
  issued?: number | null;
  heldByReservations?: number | null;
  diffStockVsIssued?: number | null;
  diffHeldVsReservations?: number | null;
  note?: string | null;
  eventTitle?: string | null;
}

export const RECONCILIATION_SOURCE_UNAVAILABLE = "RECONCILIATION_SOURCE_UNAVAILABLE";

const base = "/bookings/admin/reconciliation";

export const adminReconciliationApi = {
  /** Lấy số liệu tổng quan của màn đối soát. */
  getSummary: (signal?: AbortSignal) =>
    axiosClient.get<ReconciliationSummary>(`${base}/summary`, { signal }) as unknown as Promise<ReconciliationSummary>,
  /** Lấy một trang ngoại lệ thanh toán theo trạng thái. */
  getExceptions: (params: { status: string; page: number; size: number }, signal?: AbortSignal) =>
    axiosClient.get<PaymentExceptionPage>(`${base}/exceptions`, { params, signal }) as unknown as Promise<PaymentExceptionPage>,
  /** Đánh dấu đã xử lý một ngoại lệ thanh toán, kèm ghi chú và cờ cho biết đã hoàn tiền thủ công hay chưa. */
  resolveException: (id: string, body: { note: string; refundedManually: boolean }) =>
    axiosClient.post(`${base}/exceptions/${encodeURIComponent(id)}/resolve`, body) as unknown as Promise<PaymentExceptionItem>,
  /** Lấy danh sách đơn đã thanh toán nhưng chưa có vé. */
  getPaidWithoutTickets: (signal?: AbortSignal) =>
    axiosClient.get<{ items: PaidWithoutTicketsItem[]; total: number }>(`${base}/paid-without-tickets`, { signal }) as unknown as Promise<{ items: PaidWithoutTicketsItem[]; total: number }>,
    // Gửi lại sự kiện BOOKING_CONFIRMED cho đơn đã PAID. Việc phát hành vé có tính idempotent nên chạy lần thứ hai không tạo vé trùng
  /** Gửi lại sự kiện xác nhận đơn để hệ thống phát hành lại vé cho đơn đã thanh toán. */
  republishConfirmed: (bookingId: string) =>
    axiosClient.post(`/bookings/admin/${encodeURIComponent(bookingId)}/republish-confirmed`, null, { params: { dryRun: false } }) as unknown as Promise<{ message?: string }>,
    // Tính lại tồn kho của một loại vé từ số vé thực sự đã phát hành. Trả về dòng đã sửa, hoặc 409/422 kèm mã lỗi (ví dụ INITIAL_QUANTITY_UNKNOWN)
  /** Sửa tồn kho của một loại vé theo số vé đã phát hành. */
  fixStock: (ticketTypeId: string) =>
    axiosClient.post(`${base}/stock/${encodeURIComponent(ticketTypeId)}/fix`) as unknown as Promise<StockDiscrepancyItem | null>,
  /** Lấy danh sách loại vé có tồn kho bị lệch. */
  getStockDiscrepancies: (signal?: AbortSignal) =>
    axiosClient.get<{ items: StockDiscrepancyItem[] }>(`${base}/stock-discrepancies`, { signal }) as unknown as Promise<{ items: StockDiscrepancyItem[] }>,
};

/** Lấy mã lỗi máy đọc được của một yêu cầu thất bại (ví dụ INITIAL_QUANTITY_UNKNOWN), hoặc `null` nếu không có. */
export function errorCodeOf(err: unknown): string | null {
  const code = (err as { response?: { data?: { code?: unknown } } } | null)?.response?.data?.code;
  return typeof code === "string" ? code : null;
}

/** Cho biết máy chủ báo một trong các nguồn dữ liệu của màn hình không đọc được. */
export function isSourceUnavailable(err: unknown): boolean {
  const data = (err as { response?: { data?: { code?: unknown; message?: unknown } } } | null)?.response?.data;
  return data?.code === RECONCILIATION_SOURCE_UNAVAILABLE || data?.message === RECONCILIATION_SOURCE_UNAVAILABLE;
}
