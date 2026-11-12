import axiosClient from "./axiosClient";
import type { OrganizerProfileData } from "@/types";
import type { PayoutAccount } from "@/types";
import { userApi } from "@/services/userApi";

const normalizePayoutAccount = (account: PayoutAccount): PayoutAccount => {
  const accountNumber = account.accountNumber || "";
  return {
    ...account,
    accountNumberMasked: account.accountNumberMasked || (accountNumber ? `••••${accountNumber.slice(-4)}` : ""),
    verified: account.verified ?? account.isVerified ?? false,
    version: account.version ?? account.accountVersion,
  };
};

export const organizerApi = {
  /** Finance flows must read the verified account from the server, never browser drafts. */
  getPayoutAccountFromServer: async (): Promise<PayoutAccount | null> => {
    const profile = await userApi.getProfile();
    const userId = profile?.id || profile?.keycloakId;
    if (!userId) throw new Error("Không xác định được tài khoản người tổ chức.");
    const response = (await axiosClient.get(`/payments/organizer-payout-account/${encodeURIComponent(userId)}`)) as unknown as PayoutAccount | null;
    if (!response) return null;
    return normalizePayoutAccount(response);
  },

  /** Finance flows use this strict variant so failed persistence stays visible. */
  savePayoutAccountForFinance: async (data: Record<string, unknown>): Promise<PayoutAccount> => {
    const response: unknown = await axiosClient.post("/payments/organizer-payout-account", data);
    if (!response || typeof response !== "object") throw new Error("Invalid payout account response");
    return normalizePayoutAccount(response as PayoutAccount);
  },
  // fetch organizer profile for pre-filling create event form or settings
  getOrganizerProfile: async (userId?: string): Promise<OrganizerProfileData | null> => {
    try {
      const url = userId ? `/events/organizer-profile?userId=${encodeURIComponent(userId)}` : "/events/organizer-profile";
      const response: unknown = await axiosClient.get(url);
      return response as OrganizerProfileData;
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number } })?.response?.status;
      if (status !== 403) {
        console.warn("Failed to fetch organizer profile:", err);
      }
      return null;
    }
  },

  // fetch organizer payout account directly from payment-service (/api/payments/organizer-payout-account/{userId})
  getPayoutAccount: async (userId?: string): Promise<Record<string, unknown> | null> => {
    // try local cache from Step 5 payout account setup or draft event
    try {
      const cachedPayout = localStorage.getItem("halo_organizer_payout_account");
      if (cachedPayout) {
        const parsed = JSON.parse(cachedPayout);
        if (parsed && (parsed.accountNumber || parsed.accountHolder)) {
          return parsed;
        }
      }
      const draftEvent = localStorage.getItem("halo_draft_event");
      if (draftEvent) {
        const parsedDraft = JSON.parse(draftEvent);
        if (parsedDraft?.step5?.accountNumber) {
          return {
            accountHolder: parsedDraft.step5.accountHolder || "",
            accountNumber: parsedDraft.step5.accountNumber || "",
            bankName: parsedDraft.step5.bankName || "",
            bankBranch: parsedDraft.step5.bankBranch || "",
            businessType: parsedDraft.step5.businessType || "individual",
          };
        }
      }
    } catch {
      // ignore JSON parse error
    }

    try {
      const url = userId ? `/payments/organizer-payout-account/${encodeURIComponent(userId)}` : "/payments/organizer-payout-account/me";
      const response: unknown = await axiosClient.get(url);
      return response as Record<string, unknown>;
    } catch {
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
