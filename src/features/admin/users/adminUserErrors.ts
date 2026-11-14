import type { TFunction } from "i18next";

/** The user-service answers with a stable code in `message` (see AdminUserManagementService); this turns it into a sentence. */
export function adminUserErrorMessage(error: unknown, t: TFunction, fallback: string): string {
  const response = (error as { response?: { status?: number; data?: { message?: string } } })?.response;
  const code = response?.data?.message;
  switch (code) {
    case "INVALID_EMAIL": return t("Email không hợp lệ.");
    case "INVALID_NAME": return t("Họ tên phải từ 2 đến 100 ký tự.");
    case "INVALID_PHONE": return t("Số điện thoại không hợp lệ (ví dụ 0912345678).");
    case "ROLES_REQUIRED": return t("Cần chọn ít nhất một vai trò.");
    case "INVALID_ROLE": return t("Vai trò không hợp lệ.");
    case "INVALID_BODY": return t("Dữ liệu gửi lên không hợp lệ.");
    case "REASON_TOO_LONG": return t("Lý do tối đa 500 ký tự.");
    case "EMAIL_ALREADY_EXISTS": return t("Email này đã có tài khoản.");
    case "PHONE_ALREADY_EXISTS": return t("Số điện thoại này đã gắn với một tài khoản khác.");
    case "CANNOT_LOCK_SELF": return t("Bạn không thể tự khóa tài khoản của mình.");
    case "CANNOT_REMOVE_OWN_ADMIN": return t("Bạn không thể tự gỡ quyền Admin của mình.");
    case "LAST_ADMIN": return t("Đây là quản trị viên đang hoạt động cuối cùng nên không thể khóa hoặc gỡ quyền Admin.");
    case "USER_NOT_FOUND": return t("Không tìm thấy người dùng.");
    case "IDENTITY_PROVIDER_UNAVAILABLE": return t("Hệ thống định danh đang không phản hồi. Vui lòng thử lại sau.");
    case "IDENTITY_PROVIDER_ERROR": return t("Hệ thống định danh từ chối tạo tài khoản. Vui lòng thử lại sau.");
    default:
      if (response?.status === 403) return t("Bạn không có quyền thực hiện thao tác này.");
      return fallback;
  }
}
