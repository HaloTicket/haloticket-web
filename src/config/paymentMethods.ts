/** Mã các phương thức thanh toán mà giao diện biết tới. */
export type PaymentMethodKey = 'vnpay' | 'sepay' | 'momo' | 'zalopay' | 'shopeepay';

/**
 * Phương thức nào được hiện cho khách. SePay là cổng thật duy nhất, VNPAY chỉ dùng để thử nghiệm;
 * MoMo, ZaloPay và ShopeePay chưa tích hợp thật nên ẩn. Bật lại bằng cách đổi giá trị ở đây (backend vẫn còn các đường tương ứng).
 */
export const ENABLED_PAYMENT_METHODS: Record<PaymentMethodKey, boolean> = {
  vnpay: true,
  sepay: true,
  momo: false,
  zalopay: false,
  shopeepay: false,
};

/**
 * Kiểm tra một phương thức thanh toán có đang được hiện hay không.
 *
 * @param key - Mã phương thức.
 * @returns True nếu được hiện cho khách.
 */
export const isPaymentMethodEnabled = (key: PaymentMethodKey): boolean => ENABLED_PAYMENT_METHODS[key];
