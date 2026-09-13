export interface BookingOrderData {
  eventId?: string;
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
