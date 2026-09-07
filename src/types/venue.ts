export interface VenueApiData {
  id: number | string;
  name: string;
  address: string;
  city: string;
  ward?: string;
  capacity: number;
  type?: 'indoor' | 'outdoor' | 'hybrid';
  verified: boolean;
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
  eventsHosted: number;
  bookings: {
    eventName: string;
    organizer: string;
    date: string;
    timeSlot: string;
    status: "CONFIRMED" | "PENDING";
  }[];
}
