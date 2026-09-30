// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";

import { AdminVenuesManagement } from "@/features/admin/AdminVenuesManagement";
import { venueApi } from "@/services/venueApi";
import type { VenueApiData } from "@/types";

vi.mock("@/services/venueApi", () => ({ venueApi: {
  getAdminVenues: vi.fn(), createVenue: vi.fn(), updateVenue: vi.fn(), toggleVerifyVenue: vi.fn(), deleteVenue: vi.fn(),
} }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));

const venue: VenueApiData = { id: 42, name: "Nhà hát A", address: "12 Đường A", city: "Hà Nội", ward: "", capacity: 20, type: "indoor", verified: false, eventsHosted: 0 };

beforeEach(() => {
  vi.mocked(venueApi.getAdminVenues).mockResolvedValue([venue]);
  vi.mocked(venueApi.createVenue).mockResolvedValue(venue);
  vi.mocked(venueApi.toggleVerifyVenue).mockResolvedValue({ ...venue, verified: true });
  vi.mocked(venueApi.deleteVenue).mockResolvedValue(true);
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("venue management", () => {
  it("shows a real empty state for an empty response", async () => {
    vi.mocked(venueApi.getAdminVenues).mockResolvedValueOnce([]);
    render(<AdminVenuesManagement />);
    expect(await screen.findByText(/Chưa có địa điểm/)).toBeTruthy();
    expect(screen.queryByText("Nhà hát A")).toBeNull();
  });

  it("shows load failure with retry instead of preset venues", async () => {
    vi.mocked(venueApi.getAdminVenues).mockRejectedValueOnce(new Error("offline"));
    render(<AdminVenuesManagement />);
    expect(await screen.findByText(/Không thể tải địa điểm/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Thử lại/ }));
    expect(await screen.findByText("Nhà hát A")).toBeTruthy();
  });

  it("does not change verification on failed response", async () => {
    vi.mocked(venueApi.toggleVerifyVenue).mockResolvedValueOnce(null);
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
    await waitFor(() => expect(venueApi.toggleVerifyVenue).toHaveBeenCalledWith("42"));
    expect(within(screen.getByText("Nhà hát A").closest("tr")!).getByText("Chưa xác minh")).toBeTruthy();
  });

  it("ignores a stale refresh after verification is accepted", async () => {
    let resolveOldRefresh: (value: VenueApiData[]) => void = () => undefined;
    vi.mocked(venueApi.getAdminVenues)
      .mockResolvedValueOnce([venue])
      .mockImplementationOnce(() => new Promise(resolve => { resolveOldRefresh = resolve; }))
      .mockResolvedValueOnce([{ ...venue, verified: true }]);
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: "Tải lại địa điểm" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác minh" }));
    await waitFor(() => expect(venueApi.getAdminVenues).toHaveBeenCalledTimes(3));
    resolveOldRefresh([venue]);
    await waitFor(() => expect(within(screen.getByText("Nhà hát A").closest("tr")!).getByText("Đã xác minh")).toBeTruthy());
  });

  it("keeps the form and values after failed save", async () => {
    vi.mocked(venueApi.createVenue).mockResolvedValueOnce(null);
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: /Thêm địa điểm mới/ }));
    fireEvent.change(screen.getByLabelText(/Tên địa điểm/), { target: { value: "Địa điểm B" } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ chi tiết/), { target: { value: "1 Đường B" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu Địa Điểm" }));
    expect(await screen.findByRole("alert", { name: /Không thể lưu địa điểm/ })).toBeTruthy();
    expect(screen.getByLabelText(/Tên địa điểm/)).toHaveProperty("value", "Địa điểm B");
  });

  it("keeps the row and dialog after failed delete", async () => {
    vi.mocked(venueApi.deleteVenue).mockResolvedValueOnce(false);
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: /Xóa địa điểm khỏi hệ thống/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa Địa Điểm" }));
    expect(await screen.findByRole("alert", { name: /Không thể xóa địa điểm/ })).toBeTruthy();
    expect(screen.getByText("Nhà hát A")).toBeTruthy();
  });

  it("submits a pending save only once", async () => {
    let resolveSave: (value: VenueApiData | null) => void = () => undefined;
    vi.mocked(venueApi.createVenue).mockImplementationOnce(() => new Promise(resolve => { resolveSave = resolve; }));
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: /Thêm địa điểm mới/ }));
    fireEvent.change(screen.getByLabelText(/Tên địa điểm/), { target: { value: "Địa điểm B" } });
    fireEvent.change(screen.getByLabelText(/Địa chỉ chi tiết/), { target: { value: "1 Đường B" } });
    const save = screen.getByRole("button", { name: "Lưu Địa Điểm" });
    fireEvent.click(save);
    fireEvent.click(save);
    expect(venueApi.createVenue).toHaveBeenCalledTimes(1);
    resolveSave(venue);
    await waitFor(() => expect(screen.queryByRole("button", { name: "Đang lưu..." })).toBeNull());
  });

  it("submits a pending delete only once", async () => {
    let resolveDelete: (value: boolean) => void = () => undefined;
    vi.mocked(venueApi.deleteVenue).mockImplementationOnce(() => new Promise(resolve => { resolveDelete = resolve; }));
    render(<AdminVenuesManagement />);
    await screen.findByText("Nhà hát A");
    fireEvent.click(screen.getByRole("button", { name: /Xóa địa điểm khỏi hệ thống/ }));
    const confirm = screen.getByRole("button", { name: "Xóa Địa Điểm" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(venueApi.deleteVenue).toHaveBeenCalledTimes(1);
    resolveDelete(false);
    expect(await screen.findByRole("alert", { name: /Không thể xóa địa điểm/ })).toBeTruthy();
  });

  it("returns to the last valid page after deleting the only row on page two", async () => {
    const nine = Array.from({ length: 9 }, (_, index) => ({ ...venue, id: index + 1, name: `Địa điểm ${index + 1}` }));
    vi.mocked(venueApi.getAdminVenues).mockResolvedValueOnce(nine).mockResolvedValueOnce(nine.slice(0, 8));
    render(<AdminVenuesManagement />);
    await screen.findByText("Địa điểm 1");
    fireEvent.click(screen.getByRole("button", { name: "Trang tiếp" }));
    expect(screen.getByText("Địa điểm 9")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Xóa địa điểm khỏi hệ thống/ }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa Địa Điểm" }));
    await waitFor(() => expect(screen.getByText("Địa điểm 1")).toBeTruthy());
    expect(screen.queryByText("Địa điểm 9")).toBeNull();
  });
});
