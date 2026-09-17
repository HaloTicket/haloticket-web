export interface PaymentCreateRequest {
  bookingId: string;
  amount: number;
  method?: string;
  provider?: string;
}

export interface PaymentResponse {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
}

export interface VnPayUrlResponse {
  paymentUrl: string;
}

export interface VietQrPayloadResponse {
  qrUrl: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  amount: number;
  transferContent: string;
}

export interface StripeSessionResponse {
  sessionUrl: string;
  sessionId?: string;
}

