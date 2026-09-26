import axiosClient from "./axiosClient";
import type { OrganizerProfileData } from "@/types";

export const organizerApi = {
  // fetch organizer profile for pre-filling create event form or settings
  getOrganizerProfile: async (userId?: string): Promise<OrganizerProfileData | null> => {
    try {
      const url = userId ? `/events/organizer-profile?userId=${encodeURIComponent(userId)}` : "/events/organizer-profile";
      const response: unknown = await axiosClient.get(url);
      return response as OrganizerProfileData;
    } catch (err: any) {
      if (err?.response?.status !== 403) {
        console.warn("Failed to fetch organizer profile:", err);
      }
      return null;
    }
  },

  // fetch organizer payout account directly from payment-service (/api/payments/organizer-payout-account/{userId})
  getPayoutAccount: async (userId?: string): Promise<Record<string, unknown> | null> => {
    try {
      const url = userId ? `/payments/organizer-payout-account/${encodeURIComponent(userId)}` : "/payments/organizer-payout-account/me";
      const response: unknown = await axiosClient.get(url);
      return response as Record<string, unknown>;
    } catch (err) {
      console.warn("Failed to fetch organizer payout account from payment-service:", err);
      return null;
    }
  },

  // save or update organizer payout account directly via payment-service (/api/payments/organizer-payout-account)
  savePayoutAccount: async (data: Record<string, unknown>): Promise<unknown> => {
    try {
      const response: unknown = await axiosClient.post("/payments/organizer-payout-account", data);
      return response;
    } catch (err) {
      console.warn("Failed to save/update payout account in payment-service:", err);
      return null;
    }
  },
};
