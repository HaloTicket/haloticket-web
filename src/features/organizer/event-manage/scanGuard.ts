// Camera đọc cùng một mã QR nhiều lần mỗi giây. Bộ chặn cho mã đi qua một lần rồi bỏ qua nó trong vài giây
// (đủ lâu để người dùng cất vé đi), nhờ vậy một vé không bị gửi đi lặp lại.

/** Bộ chặn quét lặp mã QR theo khoảng thời gian. */
export interface ScanGuard {
  /** {@code true} khi mã này cần được gửi đi ngay; {@code false} nếu mã rỗng hoặc đã thấy trong khoảng chặn */
  accept(code: string): boolean;
  reset(): void;
}

/**
 * Tạo bộ chặn quét lặp.
 * @param windowMs - thời gian (ms) bỏ qua một mã đã nhận, mặc định 4000
 * @param now - hàm lấy thời gian hiện tại (ms), cho phép thay thế khi kiểm thử
 */
export function createScanGuard(windowMs = 4000, now: () => number = () => Date.now()): ScanGuard {
  const seen = new Map<string, number>();
  return {
    /** Nhận mã nếu chưa thấy trong khoảng chặn (mã được cắt khoảng trắng hai đầu) và dọn các mã đã hết hạn. */
    accept(code) {
      const value = code.trim();
      if (!value) return false;
      const at = now();
      for (const [key, time] of seen) {
        if (at - time >= windowMs) seen.delete(key);
      }
      if (seen.has(value)) return false;
      seen.set(value, at);
      return true;
    },
    /** Xóa toàn bộ mã đã ghi nhớ để quét lại từ đầu. */
    reset() {
      seen.clear();
    },
  };
}
