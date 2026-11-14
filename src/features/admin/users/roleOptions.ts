/** Roles an administrator may give (the backend refuses anything else; GUEST is the anonymous visitor). Labels are i18n keys. */
export const ASSIGNABLE_ROLES = ["CUSTOMER", "ORGANIZER", "STAFF", "ADMIN"] as const;
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
// local mobile form, or +84 / 84 prefix; matches the backend check
export const VN_PHONE_PATTERN = /^(0|\+84|84)[35789]\d{8}$/;
