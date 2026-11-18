/** Dữ liệu đơn hàng tạm ở phía giao diện khi chọn vé, trước khi tạo đặt vé. */
export interface BookingOrderData {
  eventId?: string;
  showtimeId?: string;
  eventTitle: string;
  eventTime: string;
  eventLocation: string;
  zoneId?: string;
  zoneName?: string;
  ticketTypeName: string;
  price: number;
  quantity: number;
  totalAmount: number;
}

/** Một dòng đặt vé trong danh sách quản lý của người tổ chức. */
export interface BookingItem {
  id: string;
  orderCode: string;
  purchaseTime: string;
  buyerName: string;
  buyerEmail: string;
  amount: number;
  paymentMethod: string;
  status: "PAID" | "PENDING" | "CANCELLED";
  ticketQuantity: number;
}

/** Một mục vé trong yêu cầu tạo đặt vé: loại vé, số lượng và đơn giá. */
export interface BookingItemRequest {
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  /** Đúng với mục vé không chọn ghế (vé tự do); backend giữ số lượng này như tồn kho. */
  generalAdmission?: boolean;
}

/** Yêu cầu tạo đặt vé: sự kiện, suất diễn, khách hàng, voucher, ghế và các mục vé. */
export interface BookingCreateRequest {
  eventId: string;
  showtimeId?: string;
  customerId?: string;
  customerEmail?: string;
  customerName?: string;
  voucherId?: string;
  totalAmount: number;
  seatIds?: string[];
  items?: BookingItemRequest[];
}

/** Phản hồi sau khi tạo hoặc tra cứu đặt vé: mã, trạng thái và hạn thanh toán. */
export interface BookingResponse {
  id: string;
  bookingCode: string;
  customerId: string;
  customerName?: string;
  customerEmail?: string;
  eventId?: string;
  showtimeId?: string;
  totalAmount: number;
  status: "PENDING" | "PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  createdAt?: string;
  expiredAt: string;
  quantity?: number;
}

/** Một dòng chi tiết loại vé trong đặt vé. */
export interface BookingItemDetailResponse {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

/** Chi tiết đặt vé, gồm danh sách các mục vé. */
export interface BookingDetailResponse {
  id: string;
  bookingCode: string;
  status: "PENDING" | "PAID" | "CONFIRMED" | "CANCELLED" | "EXPIRED" | "REFUNDED";
  eventId: string;
  showtimeId?: string;
  totalAmount: number;
  createdAt: string;
  items: BookingItemDetailResponse[];
}

/** Một người tham dự (vé) trong danh sách tham dự và trạng thái check-in. */
export interface AttendeeItem {
  id: string;
  ticketCode: string;
  attendeeName: string;
  attendeeEmail: string;
  ticketType: string;
  showtime: string;
  checkinStatus: boolean;
  checkinTime?: string;
}
