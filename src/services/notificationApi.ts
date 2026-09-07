import axiosClient from "./axiosClient";

export const notificationApi = {
  // fetch user notifications from DB
  getUserNotifications: async (userId: string = "ADMIN"): Promise<Record<string, unknown>[]> => {
    try {
      const response: unknown = await axiosClient.get(`/notifications/users/${userId}`);
      if (Array.isArray(response)) {
        return response as Record<string, unknown>[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch user notifications from backend:", err);
      return [];
    }
  },

  // mark single notification as read in DB
  markNotificationAsRead: async (id: string): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.patch(`/notifications/${id}/read`);
      return response;
    } catch (err) {
      console.warn("Failed to mark notification as read:", err);
      return null;
    }
  },

  // mark all notifications for a user as read in DB
  markAllNotificationsAsRead: async (userId: string): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.patch(`/notifications/users/${userId}/read-all`);
      return response;
    } catch (err) {
      console.warn("Failed to mark all notifications as read:", err);
      return null;
    }
  },

  // publish notification payload via backend endpoint
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
