/** Nhóm trạng thái chi trả chỉ dùng để hiển thị; việc chuyển trạng thái vẫn dùng trạng thái gốc của API. */
export const payoutStatusGroups = {
  PENDING: "Chờ duyệt",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Đã chi trả",
  NEEDS_VERIFICATION: "Cần bổ sung",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
} as const;
/** Mã nhóm trạng thái chi trả. */
export type PayoutStatusGroup = keyof typeof payoutStatusGroups;
/** Đưa trạng thái của API về nhóm hiển thị; trạng thái lạ được xếp vào `PROCESSING`. */
export function payoutStatusGroup(status: string): PayoutStatusGroup {
  if (status in payoutStatusGroups) return status as PayoutStatusGroup;
  return "PROCESSING";
}
/**
 * Chuẩn hóa tham số lọc chi trả từ URL.
 *
 * @param value - Giá trị tham số, có thể rỗng.
 * @returns `ALL` nếu rỗng hoặc là `ALL`, ngược lại là nhóm tương ứng.
 */
export function normalizePayoutFilter(value: string | null): PayoutStatusGroup | "ALL" {
  if (!value || value.toUpperCase() === "ALL") return "ALL";
  return payoutStatusGroup(value);
}
