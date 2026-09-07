export interface TicketItem {
  id: string;
  name: string;
  price: number;
  isFree: boolean;
  totalQuantity: number;
  minPerOrder: number;
  maxPerOrder: number;
  startSaleDate: string;
  endSaleDate: string;
  description: string;
  image?: string | null;
}

export interface CustomQuestionItem {
  id: string;
  title: string;
  description: string;
  type: string;
  isRequired: boolean;
}

export interface OrganizerProfile {
  name: string;
  info: string;
  logo: string | null;
  isExisting: boolean;
}

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

export interface Step2Errors {
  startDate?: string;
  endDate?: string;
  tickets?: string;
}

export interface Step5Errors {
  accountHolder?: string;
  accountNumber?: string;
  bankName?: string;
  taxName?: string;
}
