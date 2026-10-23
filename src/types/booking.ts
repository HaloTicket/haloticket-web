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

export interface BookingItemRequest {
  ticketTypeId: string;
  quantity: number;
  unitPrice: number;
  /** True for a no-seat (general admission) item; the backend holds its quantity as stock. */
  generalAdmission?: boolean;
}

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

export interface BookingItemDetailResponse {
  ticketTypeId: string;
  ticketTypeName: string;
  quantity: number;
  unitPrice: number;
}

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
