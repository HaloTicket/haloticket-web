import axiosClient from "./axiosClient";

export const notificationApi = {
    /** Lấy danh sách thông báo của người dùng; ném lỗi nếu phản hồi không phải mảng. */
  getUserNotifications: async (userId: string = "ADMIN"): Promise<Record<string, unknown>[]> => {
    const response: unknown = await axiosClient.get(`/notifications/users/${userId}`);
    if (Array.isArray(response)) {
      return response as Record<string, unknown>[];
    }
    throw new Error("INVALID_NOTIFICATION_RESPONSE");
  },

    /** Đánh dấu một thông báo là đã đọc. */
  markNotificationAsRead: async (id: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/${id}/read`);
  },

    /** Đánh dấu toàn bộ thông báo của người dùng là đã đọc. */
  markAllNotificationsAsRead: async (userId: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/users/${userId}/read-all`);
  },

    /** Gửi nội dung thông báo qua backend; lỗi thì ghi cảnh báo và trả về `null`. */
  publishNotification: async (data: { userId: string; type: string; title: string; message: string }): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.post("/notifications/publish", data);
      return response;
    } catch (err) {
      console.warn("Failed to publish notification via backend API:", err);
      return null;
    }
  },
};
