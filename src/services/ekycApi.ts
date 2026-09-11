import axiosClient from "./axiosClient";
import type { EkycStatusResponse, SessionResponse, OrganizerEligibilityResponse } from "@/types/ekyc";

function checked(value: EkycStatusResponse): EkycStatusResponse {
  if (value && value.status === null) return { ...value, status: "NOT_STARTED" };
  if (!value || !["NOT_STARTED", "PENDING", "APPROVED", "REJECTED", "REQUIRES_UPDATE", "REVOKED", "EXPIRED"].includes(value.status)) {
    throw new Error("Invalid verification response");
  }
  return value;
}

export const ekycApi = {
  async getStatus(): Promise<EkycStatusResponse> {
    return checked(await axiosClient.get<unknown, EkycStatusResponse>("/users/me/ekyc", { timeout: 15000 }));
  },
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
  async verify(sessionId: string, frontFile: File, backFile: File, faceFile: File): Promise<EkycStatusResponse> {
    if (!sessionId || !frontFile || !backFile || !faceFile) throw new Error("Three images required");
    const data = new FormData();
    data.append("frontImage", frontFile);
    data.append("backImage", backFile);
    data.append("faceImage", faceFile);
    return checked(
      await axiosClient.post<unknown, EkycStatusResponse>(
        `/users/me/ekyc/sessions/${encodeURIComponent(sessionId)}/verify`,
        data,
        { timeout: 60000 }
      )
    );
  },
  async getOrganizerEligibility(): Promise<OrganizerEligibilityResponse> {
    const result = await axiosClient.get<unknown, OrganizerEligibilityResponse>("/users/me/ekyc/organizer-eligibility");
    if (typeof result?.eligible !== "boolean") throw new Error("Invalid eligibility response");
    return result;
  },
};
