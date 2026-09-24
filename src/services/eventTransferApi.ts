import axiosClient from "./axiosClient";
import type {
  GiftPolicyData,
  OrganizerGiftItem,
  OrganizerListingItem,
  PageData,
  ResalePolicyData,
  TransferSettingsData,
} from "@/types/eventTransfer";

export const eventTransferApi = {
  getSettings: (eventId: string) =>
    axiosClient.get<unknown, TransferSettingsData>(
      `/api/events/${eventId}/transfer-settings`
    ),

  updateResalePolicy: (
    eventId: string,
    data: {
      enabled: boolean;
      minPricePercent: number;
      maxPricePercent: number;
      opensAt: string | null;
      closesAt: string | null;
      ticketTypeScope: string;
      allowedTicketTypeIds: string[];
      termsVersion: string | null;
      expectedVersion: number | null;
    }
  ) =>
    axiosClient.put<unknown, ResalePolicyData>(
      `/api/events/${eventId}/resale-policy`,
      data
    ),

  updateGiftPolicy: (
    eventId: string,
    data: {
      enabled: boolean;
      opensAt: string | null;
      closesAt: string | null;
      invitationTtlHours: number;
      ticketTypeScope: string;
      allowedTicketTypeIds: string[];
      expectedVersion: number | null;
    }
  ) =>
    axiosClient.put<unknown, GiftPolicyData>(
      `/api/events/${eventId}/gift-policy`,
      data
    ),

  getListings: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerListingItem>>(
      `/api/marketplace/organizer/events/${eventId}/listings?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),

  getGifts: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerGiftItem>>(
      `/api/marketplace/organizer/events/${eventId}/gifts?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),
};
