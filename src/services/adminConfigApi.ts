import axiosClient from "./axiosClient";
import type { Category, Banner, EventSection } from "@/types/adminConfig";

export const adminConfigApi = {
  // category
  /** Lấy toàn bộ danh mục sự kiện (kể cả danh mục đang ẩn) cho trang quản trị. */
  getCategories: () => axiosClient.get<Category[]>("/events/categories/admin"),
  /** Thêm danh mục sự kiện mới. */
  addCategory: (data: Partial<Category>) => axiosClient.post<Category>("/events/categories", data),
  /** Cập nhật một danh mục theo mã. */
  updateCategory: (id: string, data: Partial<Category>) => axiosClient.put<Category>(`/events/categories/${id}`, data),
  /** Xóa một danh mục theo mã. */
  deleteCategory: (id: string) => axiosClient.delete(`/events/categories/${id}`),
  // Thứ tự hiển thị mới: danh sách mã danh mục từ đầu đến cuối
  /** Lưu thứ tự hiển thị danh mục; trả về danh sách danh mục sau khi sắp xếp. */
  reorderCategories: (ids: string[]) => axiosClient.put<Category[]>("/events/categories/order", ids),

  // cấu hình trang chủ (banner)
  /** Lấy danh sách banner đang cấu hình cho trang chủ. */
  getBanners: () => axiosClient.get<Banner[]>("/events/admin/config/homepage/banners"),
  /** Ghi đè toàn bộ danh sách banner trang chủ. */
  updateBanners: (banners: Banner[]) => axiosClient.put<Banner[]>("/events/admin/config/homepage/banners", banners),

  // cấu hình trang chủ (các khối sự kiện)
  /** Lấy danh sách các khối sự kiện hiển thị trên trang chủ. */
  getEventSections: () => axiosClient.get<EventSection[]>("/events/admin/config/homepage/sections"),
  /** Ghi đè toàn bộ danh sách khối sự kiện trên trang chủ. */
  updateEventSections: (sections: EventSection[]) => axiosClient.put<EventSection[]>("/events/admin/config/homepage/sections", sections),
};
