import axiosClient from "./axiosClient";
import type { PaginatedResponse, AdminUserListItem, AdminUserDetailResponse } from "@/types";

export const adminUserApi = {
  getUsers: (params: { query?: string; status?: string; ekycStatus?: string; role?: string; sort?: string; page?: number; size?: number }) =>
    axiosClient.get<unknown, PaginatedResponse<AdminUserListItem>>("/users/admin", { params }),

  getUserDetail: (id: string) =>
    axiosClient.get<unknown, AdminUserDetailResponse>(`/users/admin/${id}`),

  updateUserStatus: (id: string, status: string) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/status?status=${status}`),

  updateUserRoles: (id: string, roles: string[]) =>
    axiosClient.put<unknown, void>(`/users/admin/${id}/roles`, roles),
};
