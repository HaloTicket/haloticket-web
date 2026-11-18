import axiosClient from "./axiosClient";
import type { PaginatedResponse, AdminUserListItem, AdminUserDetailResponse } from "@/types";
/** Thông tin quản trị viên cung cấp để mở tài khoản. Không có mật khẩu: người dùng tự đặt qua chức năng "Quên mật khẩu". */
/** What an administrator supplies to open an account. No password: the person sets one through "Quên mật khẩu". */
export interface AdminUserCreateRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: string[];
}

/** Số liệu đếm cho phần đầu trang: `byRole` tính một người dùng vào mọi vai trò họ có. */
export interface AdminUserStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
}

/** Một bản ghi nhật ký kiểm toán thao tác quản trị trên người dùng (tạo, đổi trạng thái, đổi vai trò). */
export interface AdminAuditItem {
  id: string;
  actorEmail?: string;
  action: "CREATE_USER" | "CHANGE_STATUS" | "CHANGE_ROLES" | string;
  targetId: string;
  targetEmail?: string;
  oldValue?: string;
  newValue?: string;
  reason?: string;
  createdAt: string;
}

export const adminUserApi = {
  /** Lấy danh sách người dùng có lọc theo từ khóa, trạng thái, eKYC, vai trò, sắp xếp và phân trang. */
  getUsers: (params: { query?: string; status?: string; ekycStatus?: string; role?: string; sort?: string; page?: number; size?: number }) =>
    axiosClient.get<unknown, PaginatedResponse<AdminUserListItem>>("/users/admin", { params }),

  /** Lấy số liệu thống kê người dùng theo vai trò và trạng thái. */
  getStats: () =>
    axiosClient.get<unknown, AdminUserStats>("/users/admin/stats"),

  /** Lấy nhật ký kiểm toán thao tác quản trị, có phân trang. */
  getAudit: (params: { page?: number; size?: number } = {}) =>
    axiosClient.get<unknown, PaginatedResponse<AdminAuditItem>>("/users/admin/audit", { params }),

  /** Lấy chi tiết một người dùng theo mã. */
  getUserDetail: (id: string) =>
    axiosClient.get<unknown, AdminUserDetailResponse>(`/users/admin/${id}`),

  /** Tạo tài khoản người dùng mới do quản trị viên mở. */
  createUser: (body: AdminUserCreateRequest) =>
    axiosClient.post<unknown, AdminUserListItem>("/users/admin", body),

  /** Đổi trạng thái tài khoản, kèm lý do nếu có. */
  updateUserStatus: (id: string, status: string, reason?: string) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/status`, null, { params: { status, ...(reason ? { reason } : {}) } }),

  /** Thay toàn bộ danh sách vai trò của người dùng. */
  updateUserRoles: (id: string, roles: string[]) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/roles`, roles),
};
