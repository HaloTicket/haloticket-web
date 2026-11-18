import type { PayoutResponse } from "@/types";

/** Chia các yêu cầu rút tiền thành 4 nhóm trạng thái (đang xử lý, đã chi trả, chờ duyệt, từ chối hoặc tạm giữ) để vẽ biểu đồ tròn. */
export function payoutSlices(payouts: PayoutResponse[]) {
  return [
    { name: "Đang xử lý", value: payouts.filter(p => ["APPROVED", "PROCESSING", "NEEDS_VERIFICATION"].includes(p.status)).length },
    { name: "Đã chi trả", value: payouts.filter(p => p.status === "COMPLETED").length },
    { name: "Chờ duyệt", value: payouts.filter(p => p.status === "PENDING").length },
    { name: "Từ chối / Tạm giữ", value: payouts.filter(p => ["FAILED", "REJECTED", "CANCELLED", "DISPUTE"].includes(p.status)).length },
  ];
}
