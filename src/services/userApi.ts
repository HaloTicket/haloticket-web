import axiosClient from "./axiosClient";
import { getKeycloakSession } from "@/services/keycloakSession";
import type { UserProfile, UserProfileUpdateRequest, JwtPayload } from "@/types";
export type { UserProfile, UserProfileUpdateRequest, JwtPayload };

const USER_CACHE_KEY = "haloticket_user_profile";
let inFlightProfilePromise: Promise<UserProfile> | null = null;

export function parseJwt(token: string): JwtPayload | null {
  try {
    const base64Url = token.split(".")[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload) as JwtPayload;
  } catch {
    return null;
  }
}

export function getCachedUserProfile(): UserProfile | null {
  try {
    const raw = localStorage.getItem(USER_CACHE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fallback below
  }

  // Fallback: derive from access_token if possible
  const token = getKeycloakSession().getCurrentToken();
  if (token) {
    const payload = parseJwt(token);
    if (payload) {
      return {
        id: payload.sub,
        keycloakId: payload.sub,
        email: payload.email || "user@haloticket.vn",
        fullName: payload.name || payload.preferred_username || "Khách hàng HaloTicket",
        gender: "OTHER",
        isActive: true,
        roles: payload.realm_access?.roles || ["CUSTOMER"],
      };
    }
  }
  return null;
}

export function setCachedUserProfile(profile: UserProfile, notify = false): void {
  try {
    localStorage.setItem(USER_CACHE_KEY, JSON.stringify(profile));
    if (notify) {
      window.dispatchEvent(new Event("user-updated"));
    }
  } catch {
    // ignore
  }
}

export const userApi = {
  findGiftRecipient: (email: string) =>
    axiosClient.get<unknown, { userId: string; email: string; fullName: string }>(
      `/users/gift-recipient?email=${encodeURIComponent(email.trim())}`,
    ),
  syncCurrentUser: async (): Promise<UserProfile> => {
    const response = await axiosClient.get<unknown, UserProfile>("/users/me");
    setCachedUserProfile(response, true);
    return response;
  },

  getProfile: async (): Promise<UserProfile> => {
    // Return existing in-flight request if one is already pending
    if (inFlightProfilePromise) {
      return inFlightProfilePromise;
    }

    inFlightProfilePromise = (async () => {
      try {
        const response = await axiosClient.get<unknown, UserProfile>("/users/me");
        if (response && response.email) {
          setCachedUserProfile(response, false);
          return response;
        }
      } catch (error) {
        console.warn("Could not fetch user profile from API, falling back to cached profile:", error);
      } finally {
        inFlightProfilePromise = null;
      }

      const cached = getCachedUserProfile();
      if (cached) return cached;

      // Default mock user profile when logged in but backend endpoint unreachable
      const fallbackProfile: UserProfile = {
        id: "u-default",
        email: "minh.nguyen@haloticket.vn",
        fullName: "Nguyễn Văn Minh",
        phoneNumber: "0901234567",
        gender: "MALE",
        isActive: true,
        roles: ["CUSTOMER"],
        createdAt: new Date().toISOString(),
      };
      setCachedUserProfile(fallbackProfile, false);
      return fallbackProfile;
    })();

    return inFlightProfilePromise;
  },

  updateProfile: async (data: UserProfileUpdateRequest): Promise<UserProfile> => {
    const response = await axiosClient.put<unknown, UserProfile>("/users/me", data);
    if (response && response.email) {
      setCachedUserProfile(response, true);
      return response;
    }
    throw new Error("Không thể cập nhật thông tin. Vui lòng thử lại.");
  },
};
