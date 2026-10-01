import axiosClient from "./axiosClient";

export const notificationApi = {
  // fetch user notifications from DB
  getUserNotifications: async (userId: string = "ADMIN"): Promise<Record<string, unknown>[]> => {
    const response: unknown = await axiosClient.get(`/notifications/users/${userId}`);
    if (Array.isArray(response)) {
      return response as Record<string, unknown>[];
    }
    throw new Error("INVALID_NOTIFICATION_RESPONSE");
  },

  // mark single notification as read in DB
  markNotificationAsRead: async (id: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/${id}/read`);
  },

  // mark all notifications for a user as read in DB
  markAllNotificationsAsRead: async (userId: string): Promise<unknown> => {
    return await axiosClient.patch(`/notifications/users/${userId}/read-all`);
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
