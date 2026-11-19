/** Tab lọc danh sách sự kiện của ban tổ chức: sắp diễn ra, đã qua, chờ duyệt, bị từ chối, nháp. */
export type MyEventTab = "upcoming" | "past" | "pending" | "rejected" | "draft";

/** Phần dữ liệu sự kiện cần để xếp vào tab. */
export interface EventTabInput {
  endTime?: string;
  eventApprovalStatus?: string;
  eventStatus?: string;
}

/**
 * Suy ra tab của một sự kiện. Sự kiện bị từ chối luôn ở tab "bị từ chối" (để ban tổ chức thấy và sửa dù ngày diễn ra đã qua);
 * nếu không thì đã qua nếu quá giờ kết thúc, ngược lại theo trạng thái duyệt. Chờ duyệt và chờ duyệt cập nhật cùng ở "chờ duyệt".
 * Trạng thái lạ coi là chờ duyệt (sự kiện mới tạo).
 *
 * @param ev - Sự kiện cần xếp tab.
 * @param now - Thời điểm hiện tại (để kiểm thử).
 * @returns Mã tab.
 */
export function getEventTabStatus(ev: EventTabInput, now: Date = new Date()): MyEventTab {
  const status = (ev.eventApprovalStatus || ev.eventStatus || "").toUpperCase();
  if (status === "REJECTED") return "rejected";
  if (ev.endTime && new Date(ev.endTime) < now) return "past";
  if (status === "PENDING" || status === "UPDATE_PENDING") return "pending";
  if (status === "DRAFT") return "draft";
  if (status === "ENDED" || status === "PASSED" || status === "COMPLETED") return "past";
  if (status === "APPROVED" || status === "UPCOMING" || status === "ACTIVE" || status === "ONGOING") return "upcoming";
  return "pending";
}
