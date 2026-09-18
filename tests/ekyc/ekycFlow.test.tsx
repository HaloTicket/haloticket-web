// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import axiosClient from "@/services/axiosClient";
import { ekycApi } from "@/services/ekycApi";
import EkycVerification from "@/features/ekyc/EkycVerification";
import OrganizerEligibilityGate from "@/features/ekyc/OrganizerEligibilityGate";

vi.mock("@/services/axiosClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
const get = vi.mocked(axiosClient.get);
const post = vi.mocked(axiosClient.post);
beforeEach(() => { vi.resetAllMocks(); sessionStorage.clear(); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
const file = () => new File(["image"], "id.jpg", { type: "image/jpeg" });
const session = (id: string) => ({ sessionId: id, status: "CREATED", expiresAt: new Date(Date.now() + 60000).toISOString() });

describe("real eKYC API", () => {
  it("uses the configured API base once and accepts legacy empty status", async () => {
    get.mockResolvedValue({ status: null });
    expect(await ekycApi.getStatus()).toEqual({ status: "NOT_STARTED" });
    expect(get).toHaveBeenCalledWith("/users/me/ekyc", { timeout: 15000 });
  });
  it("never falls back to forged stored approval on any API failure", async () => {
    sessionStorage.setItem("haloticket_mock_ekyc_state", JSON.stringify({ status: "APPROVED" }));
    get.mockRejectedValue(new Error("503")); post.mockRejectedValue(new Error("503"));
    await expect(ekycApi.getStatus()).rejects.toThrow("503");
    await expect(ekycApi.getOrganizerEligibility()).rejects.toThrow("503");
    await expect(ekycApi.startSession(true, "2026.1")).rejects.toThrow("503");
    await expect(ekycApi.verify("id", file(), file(), file())).rejects.toThrow("503");
  });
  it("rejects malformed approval and eligibility responses", async () => {
    get.mockResolvedValue({});
    await expect(ekycApi.getStatus()).rejects.toThrow();
    await expect(ekycApi.getOrganizerEligibility()).rejects.toThrow();
  });
  it("sends document and face images without JSON content type", async () => {
    post.mockResolvedValue({ status: "PENDING" });
    const front = file(), back = file(), face = file();
    expect(await ekycApi.verify("id", front, back, face)).toEqual({ status: "PENDING" });
    const [url, payload, config] = post.mock.calls[0];
    expect(url).toBe("/users/me/ekyc/sessions/id/verify");
    expect((payload as FormData).get("frontImage")).toBe(front);
    expect((payload as FormData).get("backImage")).toBe(back);
    expect((payload as FormData).get("faceImage")).toBe(face);
    expect(config?.headers?.["Content-Type"]).toBeUndefined();
  });
});

describe("verification UI", () => {
  it("shows status fetch errors without inventing an identity or consent flow", async () => {
    get.mockRejectedValue(new Error("offline"));
    render(<MemoryRouter><EkycVerification /></MemoryRouter>);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể tải");
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bắt đầu xác minh" })).not.toBeInTheDocument();
  });
  it("keeps other image previews alive until replacement or unmount", async () => {
    get.mockResolvedValue({ status: "NOT_STARTED" });
    vi.spyOn(URL, "createObjectURL").mockReturnValueOnce("blob:front").mockReturnValueOnce("blob:back").mockReturnValueOnce("blob:replacement");
    const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
    const view = render(<MemoryRouter><EkycVerification /></MemoryRouter>);
    const front = await screen.findByLabelText("Ảnh mặt trước căn cước");
    await userEvent.upload(front, file());
    await userEvent.upload(screen.getByLabelText("Ảnh mặt sau căn cước"), file());
    expect(revoke).not.toHaveBeenCalled();
    await userEvent.upload(front, file());
    expect(revoke).toHaveBeenCalledExactlyOnceWith("blob:front");
    view.unmount();
    expect(revoke).toHaveBeenCalledWith("blob:back");
    expect(revoke).toHaveBeenCalledWith("blob:replacement");
  });
  it("requires document images, face portrait and consent, and retries with a fresh session after verify failure", async () => {
    get.mockResolvedValue({ status: "NOT_STARTED" });
    post.mockResolvedValueOnce(session("first")).mockRejectedValueOnce(new Error("timeout"))
      .mockResolvedValueOnce(session("second")).mockResolvedValueOnce({ status: "APPROVED", legalName: "TEST SERVER" });
    render(<MemoryRouter><EkycVerification /></MemoryRouter>);
    const submit = await screen.findByRole("button", { name: "Gửi xác minh" });
    expect(submit).toBeDisabled();
    await userEvent.click(screen.getByRole("checkbox"));
    expect(submit).toBeDisabled();
    for (const label of ["Ảnh mặt trước căn cước", "Ảnh mặt sau căn cước", "Chụp ảnh khuôn mặt"]) await userEvent.upload(screen.getByLabelText(label), file());
    expect(submit).toBeEnabled();
    fireEvent.submit(submit.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Không thể hoàn tất");
    expect(screen.queryByText("Đã xác minh danh tính")).not.toBeInTheDocument();
    fireEvent.submit(submit.closest("form")!);
    expect(await screen.findByText("TEST SERVER")).toBeInTheDocument();
    expect(post.mock.calls[1][0]).toContain("/first/verify");
    expect(post.mock.calls[3][0]).toContain("/second/verify");
    expect(post.mock.calls[0][2]?.headers?.["Idempotency-Key"]).not.toBe(post.mock.calls[2][2]?.headers?.["Idempotency-Key"]);
  });
  it("displays clear error messages for face liveness and face match rejections", async () => {
    get.mockResolvedValue({ status: "NOT_STARTED" });
    post.mockResolvedValueOnce(session("face-fail")).mockResolvedValueOnce({
      status: "REJECTED",
      reasonCode: "FACE_MATCH_FAILED",
      message: "Face match score below threshold",
    });
    render(<MemoryRouter><EkycVerification /></MemoryRouter>);
    const submit = await screen.findByRole("button", { name: "Gửi xác minh" });
    await userEvent.click(screen.getByRole("checkbox"));
    for (const label of ["Ảnh mặt trước căn cước", "Ảnh mặt sau căn cước", "Chụp ảnh khuôn mặt"]) {
      await userEvent.upload(screen.getByLabelText(label), file());
    }
    expect(submit).toBeEnabled();
    fireEvent.submit(submit.closest("form")!);
    expect(await screen.findByRole("alert")).toHaveTextContent("Khuôn mặt không khớp với ảnh trên CCCD");
  });
  it("keeps pending verification pending", async () => {
    get.mockResolvedValue({ status: "PENDING" });
    render(<MemoryRouter><EkycVerification /></MemoryRouter>);
    expect(await screen.findByText("Đang chờ xét duyệt")).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
  it("does not allow already approved users to repeat initial verification", async () => {
    get.mockResolvedValue({ status: "APPROVED", legalName: "ORIGINAL NAME", documentNumber: "079*******99" });
    post.mockResolvedValueOnce(session("update-session"))
      .mockResolvedValueOnce({ status: "APPROVED", legalName: "UPDATED NAME", documentNumber: "079*******00" });

    render(
      <MemoryRouter initialEntries={["/ekyc?returnUrl=/profile?tab=ekyc"]}>
        <EkycVerification />
      </MemoryRouter>
    );

    expect(await screen.findByText("ORIGINAL NAME")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi xác minh" })).not.toBeInTheDocument();

    expect(screen.queryByRole("button", { name: /Cập nhật lại eKYC/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi xác minh" })).not.toBeInTheDocument();
  });
  it("ignores update mode for an already approved account", async () => {
    get.mockResolvedValue({ status: "APPROVED", legalName: "EXISTING USER" });

    render(
      <MemoryRouter initialEntries={["/ekyc?returnUrl=/profile?tab=ekyc&mode=update"]}>
        <EkycVerification />
      </MemoryRouter>
    );

    expect(await screen.findByText("EXISTING USER")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Gửi xác minh" })).not.toBeInTheDocument();
  });
});

describe("organizer gate", () => {
  it("does not mount event form while loading or denied", async () => {
    let resolve!: (value: { eligible: boolean }) => void;
    get.mockImplementation(() => new Promise(r => { resolve = r; }));
    const mounted = vi.fn();
    function Form() { mounted(); return <div>Event editor</div>; }
    render(<MemoryRouter><OrganizerEligibilityGate><Form /></OrganizerEligibilityGate></MemoryRouter>);
    expect(mounted).not.toHaveBeenCalled();
    resolve({ eligible: false });
    await screen.findByRole("link", { name: "Xác minh ngay" });
    expect(mounted).not.toHaveBeenCalled();
    expect(screen.queryByText("Để sau")).not.toBeInTheDocument();
  });
  it("fails closed and mounts children only after a successful eligibility retry", async () => {
    get.mockRejectedValueOnce(new Error("offline")).mockResolvedValueOnce({ eligible: true });
    render(<MemoryRouter><OrganizerEligibilityGate><div>Event editor</div></OrganizerEligibilityGate></MemoryRouter>);
    await screen.findByRole("alert");
    expect(screen.queryByText("Event editor")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByText("Event editor")).toBeInTheDocument());
  });
});
