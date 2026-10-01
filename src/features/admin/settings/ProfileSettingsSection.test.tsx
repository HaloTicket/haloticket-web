// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";

import ProfileSettingsSection from "./ProfileSettingsSection";

const { syncCurrentUser, updateProfile } = vi.hoisted(() => ({ syncCurrentUser: vi.fn(), updateProfile: vi.fn() }));
vi.mock("@/services/userApi", () => ({ userApi: { syncCurrentUser, updateProfile } }));
vi.mock("@/services/mediaApi", () => ({ mediaApi: { uploadImage: vi.fn() } }));
vi.mock("@/services/ekycApi", () => ({ ekycApi: { getStatus: vi.fn().mockResolvedValue({ status: "NOT_STARTED" }) } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ i18n: { resolvedLanguage: "vi" } }) }));

afterEach(() => { cleanup(); vi.clearAllMocks(); });

const profile = { id: "user-1", email: "admin@example.com", fullName: "Admin", phoneNumber: "0123", gender: "OTHER" as const, avatarUrl: "" };

describe("admin profile settings", () => {
  it("saves only supported fields after loading the live account", async () => {
    syncCurrentUser.mockResolvedValue(profile);
    updateProfile.mockResolvedValue({ ...profile, fullName: "New Name", phoneNumber: "456" });
    render(<ProfileSettingsSection profile={profile} hideEmail={false} />);
    const name = await screen.findByRole("textbox", { name: "Tên" });
    fireEvent.change(name, { target: { value: " Name " } });
    fireEvent.change(screen.getByRole("textbox", { name: "Họ và tên đệm" }), { target: { value: "New" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Số điện thoại" }), { target: { value: "456" } });
    fireEvent.click(screen.getByRole("button", { name: "Cập nhật thông tin" }));
    await waitFor(() => expect(updateProfile).toHaveBeenCalledWith({ fullName: "New Name", phoneNumber: "456", gender: "OTHER", avatarUrl: "" }));
    expect(await screen.findByRole("status")).toHaveProperty("textContent", "Đã lưu thông tin hồ sơ.");
  });

  it("does not claim a save when the live account cannot be loaded", async () => {
    syncCurrentUser.mockRejectedValue(new Error("offline"));
    render(<ProfileSettingsSection profile={profile} hideEmail={true} />);
    expect(await screen.findByRole("alert")).toHaveProperty("textContent", "Không thể tải hồ sơ từ máy chủ. Vui lòng thử lại sau.");
    expect(screen.getByRole("button", { name: "Cập nhật thông tin" }).hasAttribute("disabled")).toBe(true);
    expect(updateProfile).not.toHaveBeenCalled();
  });
});
