import axiosClient from "./axiosClient";
import type { PaginatedResponse, AdminUserListItem, AdminUserDetailResponse } from "@/types";

/** What an administrator supplies to open an account. No password: the person sets one through "Quên mật khẩu". */
export interface AdminUserCreateRequest {
  email: string;
  fullName: string;
  phoneNumber?: string;
  roles: string[];
}

/** Head counts for the page header: byRole counts a user under every role they hold. */
export interface AdminUserStats {
  total: number;
  byRole: Record<string, number>;
  byStatus: Record<string, number>;
}

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
  getUsers: (params: { query?: string; status?: string; ekycStatus?: string; role?: string; sort?: string; page?: number; size?: number }) =>
    axiosClient.get<unknown, PaginatedResponse<AdminUserListItem>>("/users/admin", { params }),

  getStats: () =>
    axiosClient.get<unknown, AdminUserStats>("/users/admin/stats"),

  getAudit: (params: { page?: number; size?: number } = {}) =>
    axiosClient.get<unknown, PaginatedResponse<AdminAuditItem>>("/users/admin/audit", { params }),

  getUserDetail: (id: string) =>
    axiosClient.get<unknown, AdminUserDetailResponse>(`/users/admin/${id}`),

  createUser: (body: AdminUserCreateRequest) =>
    axiosClient.post<unknown, AdminUserListItem>("/users/admin", body),

  updateUserStatus: (id: string, status: string, reason?: string) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/status`, null, { params: { status, ...(reason ? { reason } : {}) } }),

  updateUserRoles: (id: string, roles: string[]) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/roles`, roles),
};
