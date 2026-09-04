import axiosClient from "./axiosClient";

export interface UserProfile {
  id?: string;
  keycloakId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  avatarUrl?: string;
  isActive?: boolean;
  gender?: "MALE" | "FEMALE" | "OTHER";
  status?: string;
  roles?: string[];
  createdAt?: string;
}

export interface UserProfileUpdateRequest {
  fullName: string;
  phoneNumber?: string;
  gender?: "MALE" | "FEMALE" | "OTHER";
  avatarUrl?: string;
}

export interface JwtPayload {
  email?: string;
  name?: string;
  preferred_username?: string;
  realm_access?: {
    roles?: string[];
  };
  [key: string]: unknown;
}

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
  const token = localStorage.getItem("access_token");
  if (token) {
    const payload = parseJwt(token);
    if (payload) {
      return {
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
    try {
      const response = await axiosClient.put<unknown, UserProfile>("/users/me", data);
      if (response && response.email) {
        setCachedUserProfile(response, true);
        return response;
      }
    } catch (error) {
      console.warn("Could not update profile via API, updating local cache:", error);
    }

    const existing = getCachedUserProfile() || {
      email: "user@haloticket.vn",
      fullName: data.fullName,
    };
    const updated: UserProfile = {
      ...existing,
      ...data,
    };
    setCachedUserProfile(updated, true);
    return updated;
  },
};
