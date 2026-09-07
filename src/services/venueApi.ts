import axiosClient from "./axiosClient";
import type { VenueApiData } from "@/types";

export const venueApi = {
  // fetch all venues from backend DB
  getVenues: async (): Promise<VenueApiData[]> => {
    try {
      const response: unknown = await axiosClient.get("/events/venues");
      if (Array.isArray(response)) {
        return response as VenueApiData[];
      }
      return [];
    } catch (err) {
      console.warn("Failed to fetch venues from DB API:", err);
      return [];
    }
  },

  // create new venue
  createVenue: async (data: Partial<VenueApiData>): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.post("/events/venues", data);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to create venue in DB:", err);
      return null;
    }
  },

  // update existing venue
  updateVenue: async (id: number | string, data: Partial<VenueApiData>): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.put(`/events/venues/${id}`, data);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to update venue in DB:", err);
      return null;
    }
  },

  // toggle venue verification status
  toggleVerifyVenue: async (id: number | string): Promise<VenueApiData | null> => {
    try {
      const response: unknown = await axiosClient.patch(`/events/venues/${id}/verify`);
      return response as VenueApiData;
    } catch (err) {
      console.error("Failed to toggle venue verification in DB:", err);
      return null;
    }
  },

  // delete venue by ID
  deleteVenue: async (id: number | string): Promise<boolean> => {
    try {
      await axiosClient.delete(`/events/venues/${id}`);
      return true;
    } catch (err) {
      console.error("Failed to delete venue from DB:", err);
      return false;
    }
  },
};
