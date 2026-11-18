/** Dữ liệu sự kiện thô từ API (còn nhiều trường tùy biến nên có chỉ mục động). */
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

/** Một hạng vé của suất diễn khi hiển thị chi tiết sự kiện. */
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

/** Một suất diễn trong chi tiết sự kiện, kèm ngày giờ đã định dạng và các hạng vé. */
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

/** Thông tin người tổ chức hiển thị trên trang sự kiện. */
export interface EventOrganizerInfo {
  name: string;
  avatar: string;
  description?: string;
}

/** Dữ liệu chi tiết sự kiện đã chuẩn hóa cho trang chi tiết: áp phích, suất diễn, thời gian mở bán, nghệ sĩ. */
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
  description?: string;
  galleryImages: string[];
  showtimes: Showtime[];
  organizer?: EventOrganizerInfo;
}

/** Thẻ sự kiện hiển thị trong danh sách hoặc các khu vực ở trang chủ. */
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

/** Một nghệ sĩ nổi bật hiển thị ở trang chủ. */
export interface ArtistItem {
  id: string;
  name: string;
  avatar: string;
  verified: boolean;
}

/** Một banner nổi bật ở đầu trang chủ. */
export interface HeroBannerItem {
  id: string;
  title: string;
  date: string;
  location: string;
  image: string;
  link: string;
  badge?: string;
}

/** Một điểm đến (thành phố) kèm số sự kiện. */
export interface DestinationItem {
  id: string;
  name: string;
  image: string;
  count: number;
}

/** Sự kiện trong màn hình duyệt của admin, gồm thông tin sự kiện, tài khoản nhận tiền, thông tin thuế và lý do từ chối. */
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
