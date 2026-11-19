// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getMyEvents = vi.fn();
const getAllEvents = vi.fn();

vi.mock("@/services/eventApi", () => ({
  eventApi: { getMyEvents: (...a: unknown[]) => getMyEvents(...a), getAllEvents: (...a: unknown[]) => getAllEvents(...a), cancelApprovalRequest: vi.fn() },
}));
vi.mock("@/services/ekycApi", () => ({ ekycApi: { getStatus: vi.fn().mockResolvedValue({}) } }));

import "@/i18n";
import MyEvents from "@/features/organizer/MyEvents";

const future = "2027-01-10T19:00:00";
const past = "2026-01-10T19:00:00";
const mine = [
  { id: "1", title: "Sắp tới A", eventApprovalStatus: "APPROVED", endTime: future },
  { id: "2", title: "Đã qua B", eventApprovalStatus: "APPROVED", endTime: past },
  { id: "3", title: "Bị từ chối C", eventApprovalStatus: "REJECTED", endTime: future },
  { id: "4", title: "Nháp D", eventApprovalStatus: "DRAFT", endTime: future },
  { id: "5", title: "Chờ duyệt E", eventApprovalStatus: "UPDATE_PENDING", endTime: future },
];

const renderPage = () => render(<MemoryRouter><MyEvents /></MemoryRouter>);
const tabButton = (name: string) => screen.getByRole("button", { name: new RegExp(`^${name}`) });

beforeEach(() => {
  getMyEvents.mockReset().mockResolvedValue(mine);
  getAllEvents.mockReset().mockResolvedValue([]);
});
afterEach(cleanup);

describe("MyEvents", () => {
  it("loads the events of the signed-in user from the server, never the public list", async () => {
    renderPage();
    await screen.findByText("Sắp tới A");
    expect(getMyEvents).toHaveBeenCalledTimes(1);
    expect(getAllEvents).not.toHaveBeenCalled();
  });

  it("puts rejected, past, draft and pending events in their own tabs", async () => {
    renderPage();
    await screen.findByText("Sắp tới A");

    expect(tabButton("Sắp tới").textContent).toContain("1");
    expect(tabButton("Đã qua").textContent).toContain("1");
    expect(tabButton("Chờ duyệt").textContent).toContain("1");
    expect(tabButton("Bị từ chối").textContent).toContain("1");
    expect(tabButton("Nháp").textContent).toContain("1");

    fireEvent.click(tabButton("Bị từ chối"));
    expect(await screen.findByText("Bị từ chối C")).toBeTruthy();
    expect(screen.queryByText("Sắp tới A")).toBeNull();

    fireEvent.click(tabButton("Đã qua"));
    expect(await screen.findByText("Đã qua B")).toBeTruthy();
  });

  it("a load failure shows an error with retry instead of an empty list", async () => {
    getMyEvents.mockRejectedValueOnce(new Error("network"));
    renderPage();
    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("Không tải được danh sách sự kiện");

    fireEvent.click(within(alert).getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.getByText("Sắp tới A")).toBeTruthy());
  });
});
