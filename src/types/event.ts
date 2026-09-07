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
  [key: string]: unknown;
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
  eventApprovalStatus?: "PENDING" | "APPROVED" | "REJECTED";
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
