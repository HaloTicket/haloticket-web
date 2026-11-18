// Các dạng dữ liệu ticket service trả về cho cổng soát vé: GET /tickets/checkin/events/{id}/summary, /page và /search.

/** Thống kê check-in của một nhóm (theo suất diễn hoặc loại vé): tổng vé và số vé đã vào cổng. */
export interface CheckinSummaryGroup {
  /** id suất diễn hoặc id loại vé; `null` với vé không thuộc suất diễn nào */
  id: string | null;
  /** tên loại vé; `null` với nhóm theo suất diễn (trang đã biết tên suất diễn) */
  name: string | null;
  total: number;
  checkedIn: number;
}

/** Tổng quan check-in của sự kiện, chia theo suất diễn và theo loại vé. */
export interface CheckinSummary {
  eventId: string;
  total: number;
  checkedIn: number;
  byShowtime: CheckinSummaryGroup[];
  byTicketType: CheckinSummaryGroup[];
  generatedAt?: string;
}

/** Một dòng check-in đã ghi nhận: vé, ghế và thời điểm vào cổng. */
export interface CheckinRow {
  checkinId?: string;
  ticketId?: string;
  qrCodeHash?: string;
  ticketTypeName?: string;
  seatName?: string;
  showtimeId?: string;
  checkedInAt: string;
  ticketKind?: "SEATED" | "STANDING" | "GENERAL" | string;
  zone?: string | null;
  row?: string | null;
  seat?: string | null;
}

/** Một trang kết quả danh sách check-in. */
export interface CheckinPage {
  content: CheckinRow[];
  /** 0-based */
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** Kết quả tra cứu vé tại cổng: thông tin vé, chủ vé (đã che) và trạng thái check-in. */
export interface CheckinLookupItem {
  ticketId: string;
  shortCode: string;
  bookingId?: string | null;
  /** chủ vé được server che (chỉ giữ vài ký tự đầu) */
  ownerMasked?: string | null;
  ticketTypeName?: string | null;
  seatName?: string | null;
  ticketKind?: string | null;
  zone?: string | null;
  row?: string | null;
  seat?: string | null;
  showtimeId?: string | null;
  ticketStatus: string;
  checkedIn: boolean;
  checkedInAt?: string | null;
  /** chỉ có với vé còn có thể vào cổng, và chỉ khi người gọi được phép quét */
  qrCodeHash?: string | null;
}
