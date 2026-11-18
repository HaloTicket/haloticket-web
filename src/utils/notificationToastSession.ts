import { toast } from "sonner";

let activeUser: string | null = null;
const seen = new Set<string>();
const recentContentKeys = new Map<string, number>();

/** Xóa trạng thái chống lặp toast (thông báo đã thấy, khóa nội dung gần đây và người dùng hiện tại), thường gọi khi đăng xuất. */
export function resetNotificationToastSession() {
  seen.clear();
  recentContentKeys.clear();
  activeUser = null;
}

/**
 * Xin quyền hiển thị toast cho một thông báo. Chống lặp theo mã thông báo và theo khóa nội dung trong 6 giây;
 * khi đổi người dùng thì đóng toast đang mở và xóa trạng thái cũ.
 *
 * @param userId - Người dùng đang đăng nhập.
 * @param notificationId - Mã thông báo.
 * @param contentKey - Khóa nội dung để loại thông báo trùng, có thể bỏ trống.
 * @returns Mã định danh toast để hiển thị, hoặc `null` nếu đã hiển thị hoặc trùng nội dung.
 */
export function claimNotificationToast(userId: string, notificationId: string, contentKey?: string): string | null {
  if (activeUser !== userId) {
    if (activeUser !== null) toast.dismiss();
    seen.clear();
    recentContentKeys.clear();
    activeUser = userId;
  }
  const id = `${userId}:${notificationId}`;
  if (seen.has(id)) return null;

  if (contentKey) {
    const now = Date.now();
    for (const [key, timestamp] of recentContentKeys.entries()) {
      if (now - timestamp > 6000) {
        recentContentKeys.delete(key);
      }
    }
    const fullKey = `${userId}:${contentKey}`;
    if (recentContentKeys.has(fullKey)) {
      seen.add(id);
      return null;
    }
    recentContentKeys.set(fullKey, now);
  }

  seen.add(id);
  return id;
}
