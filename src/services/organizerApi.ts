import axiosClient from "./axiosClient";
import type { OrganizerProfileData } from "@/types";
import type { PayoutAccount } from "@/types";
import { userApi } from "@/services/userApi";

/** Chuẩn hóa tài khoản nhận tiền từ server: tự tạo số tài khoản che (4 số cuối) và gộp các tên trường `verified`, `version` cũ/mới. */
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
  /** Lấy tài khoản nhận tiền đã xác minh từ server theo hồ sơ người dùng hiện tại. Luồng tài chính không đọc bản nháp trong trình duyệt; ném lỗi nếu không xác định được người dùng. */
  getPayoutAccountFromServer: async (): Promise<PayoutAccount | null> => {
    const profile = await userApi.getProfile();
    const userId = profile?.id || profile?.keycloakId;
    if (!userId) throw new Error("Không xác định được tài khoản người tổ chức.");
    const response = (await axiosClient.get(`/payments/organizer-payout-account/${encodeURIComponent(userId)}`)) as unknown as PayoutAccount | null;
    if (!response) return null;
    return normalizePayoutAccount(response);
  },

  /** Lưu tài khoản nhận tiền cho luồng tài chính. Bản nghiêm ngặt: lỗi khi lưu được ném ra để giao diện hiển thị, không bị nuốt. */
  savePayoutAccountForFinance: async (data: Record<string, unknown>): Promise<PayoutAccount> => {
    const response: unknown = await axiosClient.post("/payments/organizer-payout-account", data);
    if (!response || typeof response !== "object") throw new Error("Invalid payout account response");
    return normalizePayoutAccount(response as PayoutAccount);
  },
  /** Lấy hồ sơ tổ chức để điền sẵn vào form tạo sự kiện hoặc trang cài đặt. Trả về `null` nếu lỗi (không cảnh báo khi 403). */
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

  /** Lấy tài khoản nhận tiền của người tổ chức: ưu tiên bản lưu ở localStorage (bước 5 hoặc bản nháp sự kiện), sau đó mới gọi payment-service. Trả về `null` nếu thất bại. */
  getPayoutAccount: async (userId?: string): Promise<Record<string, unknown> | null> => {
    // thử bản lưu cục bộ từ bước 5 (tài khoản nhận tiền) hoặc bản nháp sự kiện
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
      // bỏ qua lỗi parse JSON
    }

    try {
      const url = userId ? `/payments/organizer-payout-account/${encodeURIComponent(userId)}` : "/payments/organizer-payout-account/me";
      const response: unknown = await axiosClient.get(url);
      return response as Record<string, unknown>;
    } catch {
      return null;
    }
  },

  /** Tạo hoặc cập nhật tài khoản nhận tiền qua payment-service. Bản lỏng: lỗi chỉ được ghi cảnh báo và trả về `null`. */
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
