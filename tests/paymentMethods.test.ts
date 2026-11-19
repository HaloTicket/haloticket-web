import { describe, expect, it } from 'vitest';
import { isPaymentMethodEnabled } from '../src/config/paymentMethods';

describe('paymentMethods', () => {
  it('chỉ hiện SePay và VNPAY; ví chưa tích hợp thật bị ẩn', () => {
    expect(isPaymentMethodEnabled('sepay')).toBe(true);
    expect(isPaymentMethodEnabled('vnpay')).toBe(true);
    expect(isPaymentMethodEnabled('momo')).toBe(false);
    expect(isPaymentMethodEnabled('zalopay')).toBe(false);
    expect(isPaymentMethodEnabled('shopeepay')).toBe(false);
  });
});
