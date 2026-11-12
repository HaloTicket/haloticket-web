// Display groups only; payout transitions continue to use the original API status.
export const payoutStatusGroups = {
  PENDING: "Chờ duyệt",
  PROCESSING: "Đang xử lý",
  COMPLETED: "Đã chi trả",
  NEEDS_VERIFICATION: "Cần bổ sung",
  REJECTED: "Đã từ chối",
  CANCELLED: "Đã hủy",
} as const;
export type PayoutStatusGroup = keyof typeof payoutStatusGroups;
export function payoutStatusGroup(status: string): PayoutStatusGroup {
  if (status in payoutStatusGroups) return status as PayoutStatusGroup;
  return "PROCESSING";
}
export function normalizePayoutFilter(value: string | null): PayoutStatusGroup | "ALL" {
  if (!value || value.toUpperCase() === "ALL") return "ALL";
  return payoutStatusGroup(value);
}
