/** Trạng thái của trình quét camera: tắt, đang khởi động, đang quét, bị từ chối quyền, không có camera hoặc lỗi khác. */
export type ScannerState = "off" | "starting" | "scanning" | "denied" | "no-camera" | "error";

/** Cùng một mã không được gửi hai lần trong khoảng thời gian này: camera đọc cùng một mã QR nhiều lần mỗi giây. */
export const SCAN_REPEAT_WINDOW_MS = 4000;

/** Chuyển lỗi camera thành trạng thái để người ở cổng soát vé biết cách xử lý. */
export function cameraErrorState(err: unknown): ScannerState {
  const name = (err as { name?: string } | null)?.name ?? "";
  const message = String((err as { message?: string } | null)?.message ?? err ?? "").toLowerCase();
  if (name === "NotAllowedError" || name === "SecurityError" || message.includes("permission") || message.includes("denied")) return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError" || message.includes("no camera") || message.includes("not found")) return "no-camera";
  return "error";
}
