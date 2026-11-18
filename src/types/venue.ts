/** Dữ liệu địa điểm do backend trả về. */
export interface VenueApiData {
  id: number | string;
  name: string;
  address: string;
  city: string;
  ward?: string;
  capacity: number;
  type?: 'indoor' | 'outdoor' | 'hybrid';
  verified: boolean;
  isPublic?: boolean;
  organizerId?: string;
  seatmapTemplate?: string;
  eventsHosted: number;
  createdAt?: string;
  updatedAt?: string;
}

/** Địa điểm trong màn hình quản lý của admin, kèm các lịch đặt sắp tới. */
export interface SystemVenue {
  id: string;
  name: string;
  city: string;
  ward: string;
  address: string;
  capacity: number;
  verified: boolean;
  isPublic?: boolean;
  organizerId?: string;
  seatmapTemplate?: string;
  eventsHosted: number;
  bookings: {
    eventName: string;
    organizer: string;
    date: string;
    timeSlot: string;
    status: "CONFIRMED" | "PENDING";
  }[];
}

/** Sơ đồ chỗ ngồi do một người tổ chức tạo cho sự kiện tại địa điểm. */
export interface VenueOrganizerSeatmap {
  eventId: string;
  seatLayoutId?: string;
  eventTitle: string;
  organizerName?: string;
  updatedAt?: string;
  draftJson?: string;
  capacity?: number;
  zonesCount?: number;
}

/** Tất cả sơ đồ của một địa điểm: mẫu của admin và các sơ đồ của người tổ chức. */
export interface VenueSeatmapsResponse {
  venueId: number | string;
  venueName: string;
  adminTemplate?: string | null;
  organizerSeatmaps: VenueOrganizerSeatmap[];
}
