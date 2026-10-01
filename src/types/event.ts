export interface EventApiData {
  id: string;
  title: string;
  description?: string;
  bannerUrl?: string;
  thumbnailUrl?: string;
  locationName?: string;
  location?: string;
  address?: string;
  eventStatus?: string;
  startTime?: string;
  endTime?: string;
  categoryName?: string;
  categoryId?: string;
  minPrice?: string;
  price?: string;
  image?: string;
  date?: string;
  city?: string;
  saleEndTime?: string;
  [key: string]: unknown;
}

export interface TicketTier {
  id: string;
  name: string;
  price: string;
  priceValue: number;
  available: boolean;
  statusText?: string;
  minPerOrder?: number;
  maxPerOrder?: number;
}

export interface Showtime {
  id: string;
  dateStr: string;
  timeStr: string;
  fullDateTime: string;
  tickets: TicketTier[];
  isOpen: boolean;
  dayNumber: number;
  monthNumber: number;
  yearNumber: number;
}

export interface EventOrganizerInfo {
  name: string;
  avatar: string;
  description?: string;
}

export interface EventDetailData {
  id: string;
  title: string;
  locationName: string;
  address: string;
  minPrice: string | number;
  startTime?: string;
  endTime?: string;
  ticketSaleStartDate?: string;
  ticketSaleEndDate?: string;
  posterImage: string;
  datesSummary: string;
  extraDaysCount: number;
  author: string;
  director: string;
  cast: string[];
  descriptionText: string;
  galleryImages: string[];
  showtimes: Showtime[];
  organizer?: EventOrganizerInfo;
}

export interface EventItem {
  id: string;
  title: string;
  price: string;
  date: string;
  image: string;
  location?: string;
  category?: string;
  isHot?: boolean;
  isResale?: boolean;
  rank?: number;
  bannerUrl?: string;
  thumbnailUrl?: string;
  minPrice?: string;
  [key: string]: unknown;
}

export interface ArtistItem {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
}

export interface HeroBannerItem {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  link: string;
  badge?: string;
}

export interface DestinationItem {
  id: string;
  name: string;
  image: string;
  count: number;
}

export interface ApprovalEventItem {
  id: string;
  title: string;
  categoryName?: string;
  organizerName?: string;
  locationName?: string;
  address?: string;
  city?: string;
  datesSummary?: string;
  startTime?: string;
  endTime?: string;
  posterImage?: string;
  bannerUrl?: string;
  galleryImages?: string[];
  eventApprovalStatus?: "DRAFT" | "PENDING" | "APPROVED" | "REJECTED" | "UPDATE_PENDING" | string;
  eventStatus?: string;
  submittedAt?: string;
  createdAt?: string;
  minPrice?: number;
  descriptionText?: string;
  description?: string;
  tickets?: Record<string, unknown>[];
  customQuestions?: Record<string, unknown>[];
  enableCustomQuestions?: boolean;
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  bankBranch?: string;
  businessType?: string;
  taxName?: string;
  taxAddress?: string;
  taxCode?: string;
  rejectionReason?: string;
  rejectionNotes?: string;
  organizer?: {
    id?: string;
    userId?: string;
    name?: string;
    avatar?: string;
    description?: string;
  };
}
