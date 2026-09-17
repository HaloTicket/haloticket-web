export interface TicketTypeApiRequest {
  id?: string;
  eventId?: string;
  name: string;
  price: number;
  isFree?: boolean;
  totalQuantity?: number;
  minPerOrder?: number;
  maxPerOrder?: number;
  startSaleDate?: string;
  endSaleDate?: string;
  description?: string;
}

export interface TicketTypeApiResponse {
  id: string;
  eventId: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  startSaleDate?: string;
  endSaleDate?: string;
  description?: string;
  status: string;
}

export interface OwnedTicketApiResponse {
  id: string;
  bookingCode?: string | null;
  eventId: string;
  ticketTypeId?: string | null;
  ticketTypeName?: string | null;
  price?: number | null;
  status?: string | null;
  qrCode?: string | null;
  qrVersion?: number | null;
  issuedAt?: string | null;
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
