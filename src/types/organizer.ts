/** Một hạng vé trong form tạo hoặc sửa sự kiện của người tổ chức, kèm số lượng đã bán và đang giữ. */
export interface TicketItem {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  initialQuantity?: number;
  soldQuantity?: number;
  heldQuantity?: number;
  minPerOrder: number;
  maxPerOrder: number;
  description: string;
  image?: string | null;
  status?: string;
  showtimeId?: string;
}

/** Một suất diễn trong form sự kiện: thời gian diễn, thời gian mở bán và các hạng vé. */
export interface ShowtimeItem {
  id?: string;
  name: string;
  startTime: string;
  endTime: string;
  saleStartTime?: string;
  saleEndTime?: string;
  tickets?: TicketItem[];
}

/** Một câu hỏi tùy chỉnh người tổ chức đặt ra cho người mua vé. */
export interface CustomQuestionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  isRequired: boolean;
  options?: string[];
  [key: string]: unknown;
}

/** Hồ sơ người tổ chức dùng trong form tạo sự kiện (tên, giới thiệu, logo). */
export interface OrganizerProfile {
  name: string;
  info: string;
  logo: string | null;
  isExisting: boolean;
}

/** Dữ liệu hồ sơ người tổ chức do backend trả về: liên hệ, mã số thuế, địa chỉ và tài khoản ngân hàng. */
export interface OrganizerProfileData {
  id?: string;
  userId?: string;
  name?: string;
  description?: string;
  avatar?: string;
  organizerName?: string;
  organizerPhone?: string;
  organizerEmail?: string;
  organizerLogo?: string;
  taxCode?: string;
  businessAddress?: string;
  bankName?: string;
  bankAccountHolder?: string;
  bankAccountNumber?: string;
  verified?: boolean;
  [key: string]: unknown;
}

/** Thông báo lỗi của từng trường ở bước 1 (thông tin cơ bản) của form tạo sự kiện. */
export interface Step1Errors {
  title?: string;
  category?: string;
  locationName?: string;
  city?: string;
  address?: string;
  description?: string;
  organizerName?: string;
  organizerInfo?: string;
}

/** Thông báo lỗi của từng trường ở bước 2 (thời gian và vé) của form tạo sự kiện. */
export interface Step2Errors {
  startDate?: string;
  endDate?: string;
  tickets?: string;
  /** Lỗi chung về thời gian mở hoặc đóng bán vé của các suất diễn. */
  sales?: string;
}

/** Thông báo lỗi của từng trường ở bước 5 (thanh toán) của form tạo sự kiện. */
export interface Step5Errors {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  taxName?: string;
}
