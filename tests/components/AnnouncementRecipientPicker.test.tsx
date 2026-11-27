// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getUsers = vi.hoisted(() => vi.fn());
vi.mock("@/services/adminUserApi", () => ({ adminUserApi: { getUsers } }));
vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

import { AnnouncementRecipientPicker } from "@/features/admin/components/AnnouncementRecipientPicker";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("AnnouncementRecipientPicker", () => {
  it("requests 1-based user pages and shows different options per page", async () => {
    getUsers.mockImplementation(async ({ page }: { page: number }) => ({
      totalPages: 2,
      content: [page === 1
        ? { id: "u1", fullName: "Người một", email: "one@x.vn" }
        : { id: "u2", fullName: "Người hai", email: "two@x.vn" }],
    }));
    render(<AnnouncementRecipientPicker kind="USER" selected={null} onSelect={vi.fn()} disabled={false} />);

    expect(await screen.findByText("Người một")).toBeTruthy();
    expect(getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, status: "ACTIVE" }));
    expect(screen.getByText("1 / 2")).toBeTruthy();

    fireEvent.click(screen.getByText("Trang sau"));
    expect(await screen.findByText("Người hai")).toBeTruthy();
    expect(screen.queryByText("Người một")).toBeNull();
    expect(getUsers).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    expect(screen.getByText("2 / 2")).toBeTruthy();
  });
});
