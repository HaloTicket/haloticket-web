/** Phản hồi của dịch vụ AI khi sinh nội dung sự kiện: phần mô tả và phần điều khoản (kiểu không xác định vì dữ liệu từ bên ngoài). */
export interface GeneratedEventContent {
  description?: unknown;
  terms_and_conditions?: unknown;
}

/**
 * Dựng văn bản đưa vào ô mô tả từ phản hồi của AI: nối thêm phần điều khoản (kèm nhãn) và loại bỏ ký hiệu markdown (tiêu đề, in đậm, in nghiêng).
 * Trả về {@code null} khi phản hồi không có mô tả dùng được: nơi gọi phải coi đó là lỗi và giữ nguyên ô mô tả.
 * @param res - phản hồi của AI
 * @param termsLabel - nhãn đặt trước phần điều khoản
 */
export function buildGeneratedDescription(res: GeneratedEventContent | null | undefined, termsLabel: string): string | null {
  if (!res || typeof res.description !== "string" || !res.description.trim()) return null;
  let full = res.description;
  if (typeof res.terms_and_conditions === "string" && res.terms_and_conditions.trim()) {
    full += "\n\n" + termsLabel + "\n" + res.terms_and_conditions;
  }
  // Xóa hoàn toàn tiêu đề markdown (#, ##, ###) và ký hiệu in đậm hoặc nghiêng (***, **, *)
  return full
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*{2,3}/g, "")
    .replace(/_{2,3}/g, "");
}
