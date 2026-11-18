import { getKeycloakSession } from "@/services/keycloakSession";
import { parseJwt } from "@/services/userApi";

/**
 * Trả về true khi chính access token mang vai trò ROLE_ADMIN. Gateway và dịch vụ AI quyết định theo token chứ không theo
 * vai trò lưu trong hồ sơ người dùng, nên màn hình phụ thuộc vào các dịch vụ đó phải hỏi cùng một câu hỏi.
 */
export function isAdminToken(): boolean {
  const token = getKeycloakSession().getCurrentToken();
  if (!token) return false;
  const payload = parseJwt(token) as (ReturnType<typeof parseJwt> & { roles?: string[] }) | null;
  const roles = [...(payload?.roles ?? []), ...(payload?.realm_access?.roles ?? [])];
  return roles.some((role) => role.toUpperCase() === "ADMIN" || role.toUpperCase() === "ROLE_ADMIN");
}
