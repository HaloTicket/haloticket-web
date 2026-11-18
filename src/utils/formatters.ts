import { getLocale } from "@/i18n";
/**
 * Định dạng số tiền VND theo ngôn ngữ hiện tại, ví dụ 150000 thành 150.000 ₫.
 *
 * @param amount - Số tiền.
 * @returns Chuỗi tiền tệ đã định dạng.
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat(getLocale(), {
    style: "currency",
    currency: "VND",
  }).format(amount);
};

/**
 * Nhãn rút gọn cho số tiền VND trên trục biểu đồ: 1500000 thành 1,5tr, 2400000000 thành 2,4 tỷ.
 *
 * @param amount - Số tiền.
 * @returns Chuỗi rút gọn theo hậu tố k, tr hoặc tỷ.
 */
export const formatCompactVnd = (amount: number): string => {
  const abs = Math.abs(amount);
  /** Làm tròn một chữ số thập phân và dùng dấu phẩy. */
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (abs >= 1e9) return `${trim(amount / 1e9)} tỷ`;
  if (abs >= 1e6) return `${trim(amount / 1e6)}tr`;
  if (abs >= 1e3) return `${trim(amount / 1e3)}k`;
  return String(Math.round(amount));
};

/**
 * Đọc số tiền VND từ số hoặc chuỗi, kể cả chuỗi kiểu cũ như "Từ 150.000 ₫" (bỏ tiền tố, dấu phân cách và ký hiệu tiền).
 *
 * @param value - Giá trị cần đọc.
 * @returns Số tiền, hoặc `undefined` nếu không đọc được.
 */
export const parseVndAmount = (value: unknown): number | undefined => {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value !== "string") return undefined;

  const trimmed = value.trim().replace(/^(?:Từ|From)\s+/i, "");
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed);

  const legacyDigits = trimmed.replace(/(?:VND|₫|đ|\s|[,.])/gi, "");
  return /^\d+$/.test(legacyDigits) ? Number(legacyDigits) : undefined;
};

/**
 * Chuyển ngày kiểu cũ dạng "15 tháng 10, 2026" sang định dạng theo ngôn ngữ hiện tại.
 *
 * @param value - Chuỗi ngày kiểu cũ.
 * @returns Chuỗi ngày, hoặc `undefined` nếu không khớp định dạng.
 */
export const formatLegacyVietnameseDate = (value: string): string | undefined => {
  const match = value.match(/^(\d{1,2})\s+tháng\s+(\d{1,2}),\s*(\d{4})$/i);
  if (!match) return undefined;

  const [, day, month, year] = match;
  return new Intl.DateTimeFormat(getLocale(), { dateStyle: "medium" })
    .format(new Date(Number(year), Number(month) - 1, Number(day)));
};

/**
 * Định dạng ngày giờ ISO theo ngôn ngữ hiện tại, ví dụ 2026-10-15T08:30:00 thành 15/10/2026, 08:30 (tùy ngôn ngữ).
 *
 * @param dateString - Chuỗi ngày giờ.
 * @returns Chuỗi ngày giờ đã định dạng.
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getLocale(), {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

/**
 * Định dạng chuỗi ngày giờ cho ô nhập HTML `datetime-local` (`yyyy-MM-ddTHH:mm`, giờ địa phương).
 *
 * @param dateStr - Chuỗi ngày giờ, có thể rỗng.
 * @returns Chuỗi định dạng; rỗng nếu không có đầu vào, hoặc 16 ký tự đầu nếu không phân tích được.
 */
export const formatDatetimeLocal = (dateStr?: string): string => {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr.slice(0, 16);
    /** Thêm số 0 phía trước để đủ hai chữ số. */
    const pad = (n: number) => n.toString().padStart(2, "0");
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return dateStr.slice(0, 16);
  }
};
