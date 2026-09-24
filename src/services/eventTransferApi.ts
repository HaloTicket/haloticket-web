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
      `/events/${eventId}/transfer-settings`
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
      `/events/${eventId}/resale-policy`,
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
      `/events/${eventId}/gift-policy`,
      data
    ),

  getListings: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerListingItem>>(
      `/marketplace/organizer/events/${eventId}/listings?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),

  getGifts: (eventId: string, page = 0, size = 20, status?: string) =>
    axiosClient.get<unknown, PageData<OrganizerGiftItem>>(
      `/marketplace/organizer/events/${eventId}/gifts?page=${page}&size=${size}${status ? `&status=${status}` : ""}`
    ),
};
