/** Ngữ cảnh quản lý sự kiện chia sẻ cho các trang con: vai trò của người dùng, đã tải xong vai trò chưa và dữ liệu sự kiện. */
export interface EventManageContext {
  myRole: string | null;
  myRoleLoaded: boolean;
  eventData: Record<string, unknown> | null;
}

export const FULL_ACCESS_ROLES = ["OWNER", "ADMIN"];
export const ANNOUNCEMENT_ROLES = ["OWNER", "MANAGER"];
export const VIEW_ACCESS_ROLES = ["OWNER", "ADMIN", "MANAGER"];
