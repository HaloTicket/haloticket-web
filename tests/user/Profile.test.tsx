// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import "@/i18n";

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import Profile from "../../src/features/user/Profile";
import type { UserProfile } from "../../src/services/userApi";

const mocks = vi.hoisted(() => ({
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
  uploadImage: vi.fn(),
}));

vi.mock("@/services/keycloakSession", () => ({
  getKeycloakSession: () => ({
    isAuthenticated: () => true,
    logout: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock("@/services/userApi", () => ({
  userApi: {
    getProfile: mocks.getProfile,
    updateProfile: mocks.updateProfile,
  },
}));

vi.mock("@/services/mediaApi", () => ({
  mediaApi: { uploadImage: mocks.uploadImage },
}));

const savedProfile: UserProfile = {
  id: "user-123",
  keycloakId: "google-123",
  email: "an@example.com",
  fullName: "Nguyễn Văn An",
  phoneNumber: "0901234567",
  gender: "MALE",
  avatarUrl: "https://example.com/saved-avatar.png",
  status: "ACTIVE",
  roles: ["CUSTOMER"],
};

function renderProfile() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <Profile />
    </MemoryRouter>,
  );
}

afterEach(cleanup);

beforeEach(() => {
  mocks.getProfile.mockReset();
  mocks.updateProfile.mockReset();
  mocks.uploadImage.mockReset();
  mocks.getProfile.mockResolvedValue(savedProfile);
});

describe("Profile editing", () => {
  it("keeps the saved account summary unchanged while the name is only a draft", async () => {
    const user = userEvent.setup();
    renderProfile();

    const nameInput = await screen.findByPlaceholderText("Nhập họ và tên đầy đủ");
    await user.clear(nameInput);
    await user.type(nameInput, "Tên chưa lưu");

    expect(screen.getByRole("heading", { name: "Nguyễn Văn An" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tên chưa lưu" })).not.toBeInTheDocument();
    expect(screen.getByText("Có thay đổi chưa lưu")).toBeInTheDocument();
  });

  it("restores every draft field when the user cancels editing", async () => {
    const user = userEvent.setup();
    renderProfile();

    const nameInput = await screen.findByPlaceholderText("Nhập họ và tên đầy đủ");
    await user.clear(nameInput);
    await user.type(nameInput, "Tên sẽ hủy");
    await user.click(screen.getByRole("button", { name: "Hủy thay đổi" }));

    expect(nameInput).toHaveValue("Nguyễn Văn An");
    expect(screen.queryByText("Có thay đổi chưa lưu")).not.toBeInTheDocument();
  });

  it("updates the account summary only after the backend confirms the save", async () => {
    const user = userEvent.setup();
    let resolveUpdate: ((profile: UserProfile) => void) | undefined;
    mocks.updateProfile.mockReturnValue(
      new Promise<UserProfile>((resolve) => {
        resolveUpdate = resolve;
      }),
    );
    renderProfile();

    const nameInput = await screen.findByPlaceholderText("Nhập họ và tên đầy đủ");
    await user.clear(nameInput);
    await user.type(nameInput, "Tên đã lưu xuống DB");
    await user.click(screen.getByRole("button", { name: "Lưu thay đổi" }));

    expect(screen.getByRole("heading", { name: "Nguyễn Văn An" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Tên đã lưu xuống DB" })).not.toBeInTheDocument();

    resolveUpdate?.({ ...savedProfile, fullName: "Tên đã lưu xuống DB" });

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Tên đã lưu xuống DB" })).toBeInTheDocument();
    });
  });
});
