import axiosClient from "./axiosClient";
import type { OrganizerProfileData } from "@/types";

export const organizerApi = {
  // fetch organizer profile for pre-filling create event form or settings
  getOrganizerProfile: async (userId?: string): Promise<OrganizerProfileData | null> => {
    try {
      const url = userId ? `/events/organizer-profile?userId=${encodeURIComponent(userId)}` : "/events/organizer-profile";
      const response: unknown = await axiosClient.get(url);
      return response as OrganizerProfileData;
    } catch (err) {
      console.warn("Failed to fetch organizer profile:", err);
      return null;
    }
  },
};
