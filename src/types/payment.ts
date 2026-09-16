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
