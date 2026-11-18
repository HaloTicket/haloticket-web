/** Các vai trò quản trị viên được phép gán (backend từ chối vai trò khác; GUEST là khách ẩn danh). Nhãn là khóa i18n. */
export const ASSIGNABLE_ROLES = ["CUSTOMER", "ORGANIZER", "STAFF", "ADMIN"] as const;
/** Kiểu một vai trò có thể gán, suy ra từ {@code ASSIGNABLE_ROLES}. */
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

export const ROLE_LABEL: Record<AssignableRole, string> = {
  CUSTOMER: "Khách hàng",
  ORGANIZER: "Ban tổ chức",
  STAFF: "Nhân viên",
  ADMIN: "Admin quản trị",
};

export const ROLE_HINT: Record<AssignableRole, string> = {
  CUSTOMER: "Mua vé, tham gia sự kiện.",
  ORGANIZER: "Tạo và quản lý sự kiện.",
  STAFF: "Hỗ trợ vận hành, soát vé theo phân công.",
  ADMIN: "Toàn quyền quản trị hệ thống.",
};

export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
// dạng số di động trong nước, hoặc có tiền tố +84 / 84; khớp với kiểm tra ở backend
export const VN_PHONE_PATTERN = /^(0|\+84|84)[35789]\d{8}$/;
