import axiosClient from "./axiosClient";
import type { EkycStatusResponse, SessionResponse, OrganizerEligibilityResponse } from "@/types/ekyc";

/** Kiểm tra phản hồi trạng thái eKYC: `null` được coi là `NOT_STARTED`, trạng thái ngoài danh sách hợp lệ thì ném lỗi. */
function checked(value: EkycStatusResponse): EkycStatusResponse {
  if (value && value.status === null) return { ...value, status: "NOT_STARTED" };
  if (!value || !["NOT_STARTED", "PENDING", "APPROVED", "REJECTED", "REQUIRES_UPDATE", "REVOKED", "EXPIRED"].includes(value.status)) {
    throw new Error("Invalid verification response");
  }
  return value;
}

export const ekycApi = {
  /** Lấy trạng thái xác minh danh tính (eKYC) của người dùng hiện tại. */
  async getStatus(): Promise<EkycStatusResponse> {
    return checked(await axiosClient.get<unknown, EkycStatusResponse>("/users/me/ekyc", { timeout: 15000 }));
  },
  /** Mở phiên eKYC mới sau khi người dùng đồng ý điều khoản; ném lỗi nếu phiên trả về thiếu mã hoặc hạn dùng. */
  async startSession(consentAccepted: boolean, consentVersion: string): Promise<SessionResponse> {
    const result = await axiosClient.post<unknown, SessionResponse>(
      "/users/me/ekyc/sessions",
      { consentAccepted, consentVersion },
      { headers: { "Idempotency-Key": crypto.randomUUID() }, timeout: 30000 }
    );
    if (!result?.sessionId || !Number.isFinite(Date.parse(result.expiresAt))) {
      throw new Error("Invalid session response");
    }
    return result;
  },
  /** Gửi ảnh mặt trước, mặt sau giấy tờ và ảnh khuôn mặt (nếu có) để xác minh trong một phiên; ném lỗi nếu thiếu ảnh giấy tờ. */
  async verify(sessionId: string, frontFile: File, backFile: File, faceFile?: File): Promise<EkycStatusResponse> {
    if (!sessionId || !frontFile || !backFile) throw new Error("Document images required");
    const data = new FormData();
    data.append("frontImage", frontFile);
    data.append("backImage", backFile);
    if (faceFile) {
      data.append("faceImage", faceFile);
    }
    return checked(
      await axiosClient.post<unknown, EkycStatusResponse>(
        `/users/me/ekyc/sessions/${encodeURIComponent(sessionId)}/verify`,
        data,
        { timeout: 60000 }
      )
    );
  },
  /** Kiểm tra người dùng có đủ điều kiện làm nhà tổ chức (đã xác minh eKYC) hay không. */
  async getOrganizerEligibility(): Promise<OrganizerEligibilityResponse> {
    const result = await axiosClient.get<unknown, OrganizerEligibilityResponse>("/users/me/ekyc/organizer-eligibility");
    if (typeof result?.eligible !== "boolean") throw new Error("Invalid eligibility response");
    return result;
  },
};
