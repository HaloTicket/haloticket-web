/** Yêu cầu tạo thanh toán cho một đặt vé: số tiền, phương thức và cổng thanh toán. */
export interface PaymentCreateRequest {
  bookingId: string;
  amount: number;
  method?: string;
  provider?: string;
}

/** Phản hồi thanh toán: mã thanh toán, đặt vé liên quan, số tiền và trạng thái. */
export interface PaymentResponse {
  id: string;
  bookingId: string;
  amount: number;
  status: string;
}

/** Phản hồi chứa URL chuyển hướng sang cổng thanh toán (VNPay, MoMo, ZaloPay, ShopeePay). */
export interface VnPayUrlResponse {
  paymentUrl: string;
}

/** Dữ liệu để hiển thị mã VietQR: ảnh QR, tài khoản nhận, số tiền và nội dung chuyển khoản. */
export interface VietQrPayloadResponse {
  qrUrl: string;
  bankName: string;
  accountNo: string;
  accountName: string;
  amount: number;
  transferContent: string;
}

/** Phản hồi tạo phiên thanh toán Stripe: URL của phiên và mã phiên. */
export interface StripeSessionResponse {
  sessionUrl: string;
  sessionId?: string;
}

