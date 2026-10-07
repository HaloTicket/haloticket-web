import axiosClient from "./axiosClient";
import type { Category, Banner, EventSection, SystemConfig } from "@/types/adminConfig";

export const adminConfigApi = {
  // category
  getCategories: () => axiosClient.get<Category[]>("/events/categories/admin"),
  addCategory: (data: Partial<Category>) => axiosClient.post<Category>("/events/categories", data),
  updateCategory: (id: string, data: Partial<Category>) => axiosClient.put<Category>(`/events/categories/${id}`, data),
  deleteCategory: (id: string) => axiosClient.delete(`/events/categories/${id}`),

  // system config
  getSystemConfig: () => axiosClient.get<SystemConfig>("/events/admin/config/system-config"),
  updateSystemConfig: (data: Partial<SystemConfig>) => axiosClient.put<SystemConfig>("/events/admin/config/system-config", data),

  // homepage config (banners)
  getBanners: () => axiosClient.get<Banner[]>("/events/admin/config/homepage/banners"),
  updateBanners: (banners: Banner[]) => axiosClient.put<Banner[]>("/events/admin/config/homepage/banners", banners),

  // homepage config (event sections)
  getEventSections: () => axiosClient.get<EventSection[]>("/events/admin/config/homepage/sections"),
  updateEventSections: (sections: EventSection[]) => axiosClient.put<EventSection[]>("/events/admin/config/homepage/sections", sections),
};
