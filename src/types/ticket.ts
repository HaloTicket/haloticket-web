export interface TicketTypeApiRequest {
  id?: string;
  eventId?: string;
  name: string;
  price: number;
  isFree?: boolean;
  totalQuantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  description?: string;
}

export interface TicketTypeApiResponse {
  id: string;
  eventId: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  initialQuantity?: number;
  remainingQuantity?: number;
  heldQuantity?: number;
  soldQuantity?: number | null;
  availableQuantity?: number;
  minPerOrder: number;
  maxPerOrder: number;
  description?: string;
  status: string;
}

export interface OwnedTicketApiResponse {
  id: string;
  bookingId?: string | null;
  showtimeId?: string | null;
  section?: string | null;
  row?: string | null;
  seatNumber?: string | null;
  bookingCode?: string | null;
  eventId: string;
  ticketTypeId?: string | null;
  ticketTypeName?: string | null;
  price?: number | null;
  originalPrice?: number | null;
  acquisitionType?: "PRIMARY" | "RESALE" | "GIFT" | string | null;
  status?: string | null;
  qrCode?: string | null;
  qrVersion?: number | null;
  issuedAt?: string | null;
  seatName?: string | null;
}

export interface SeatLayoutZoneDto {
  id?: string;
  name: string;
  ticketTypeId?: string | null;
  shapeType?: string;
  colorCode?: string;
  fillColor?: string;
  strokeColor?: string;
  curvature?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  points?: string | null;
  capacity?: number;
}

export interface SeatLayoutApiRequest {
  eventId: string;
  draftJson?: string;
  svgData?: string | null;
  imageUrl?: string | null;
  status?: string;
  zones?: SeatLayoutZoneDto[];
}

export interface SeatLayoutApiResponse {
  id: string;
  eventId: string;
  draftJson?: string;
  svgData?: string;
  imageUrl?: string;
  status: string;
  zones?: SeatLayoutZoneDto[];
}
