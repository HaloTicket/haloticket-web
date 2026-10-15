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

export interface VenueSeatmapsResponse {
  venueId: number | string;
  venueName: string;
  adminTemplate?: string | null;
  organizerSeatmaps: VenueOrganizerSeatmap[];
}
