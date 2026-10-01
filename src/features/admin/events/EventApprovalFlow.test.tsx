// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { EventApproval } from "@/features/admin/EventApproval";
import { EventApprovalDetail } from "@/features/admin/events/EventApprovalDetail";
import { eventApi } from "@/services/eventApi";

vi.mock("@/services/eventApi", () => ({
  eventApi: {
    getApprovalEvents: vi.fn(),
    approveEvent: vi.fn(),
    rejectEvent: vi.fn(),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn() } }));
vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

const events = [
  { id: "event-1", title: "Sự kiện một", eventApprovalStatus: "PENDING", organizerName: "BTC Một" },
  { id: "event-2", title: "Sự kiện hai", eventApprovalStatus: "UPDATE_PENDING", organizerName: "BTC Hai" },
];

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return <><output data-testid="location">{location.pathname + location.search}</output><button type="button" onClick={() => navigate("/admin/events-approval/event-2")}>Next event</button><button type="button" onClick={() => navigate("/admin/events-approval?status=PENDING&page=2")}>Pending page</button></>;
}

function renderFlow(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LocationProbe />
      <Routes>
        <Route path="/admin/events-approval" element={<EventApproval />} />
        <Route path="/admin/events-approval/:eventId" element={<EventApprovalDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.mocked(eventApi.getApprovalEvents).mockResolvedValue(events);
  vi.mocked(eventApi.approveEvent).mockResolvedValue({ ok: true });
  vi.mocked(eventApi.rejectEvent).mockResolvedValue({ ok: true });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("event approval flow", () => {
  it("resets pagination when filters change and retains them through detail and Back", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockResolvedValue([
      ...Array.from({ length: 10 }, (_, index) => ({ id: `EV-${index}`, title: `Older event ${index}`, eventApprovalStatus: "PENDING", submittedAt: "2026-09-21T12:00:00Z" })),
      { id: "EV-22", title: "Jazz night", eventApprovalStatus: "PENDING", categoryName: "Âm nhạc", submittedAt: "2026-09-20T12:00:00Z" },
    ]);
    renderFlow("/admin/events-approval?status=PENDING&page=2&source=alert");

    await screen.findByText("Jazz night");
    fireEvent.change(screen.getByRole("searchbox", { name: /Tìm sự kiện/ }), { target: { value: "EV-22" } });
    expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=PENDING&source=alert&q=EV-22");
    fireEvent.change(screen.getByRole("combobox", { name: "Thể loại" }), { target: { value: "Âm nhạc" } });
    fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2026-09-20" } });
    fireEvent.click(screen.getByRole("link", { name: "Xem hồ sơ" }));
    expect(screen.getByTestId("location").textContent).toContain("category=%C3%82m+nh%E1%BA%A1c");
    expect(screen.getByTestId("location").textContent).toContain("from=2026-09-20");
    await screen.findByRole("heading", { name: "Jazz night" });
    fireEvent.click(await screen.findByRole("link", { name: /Quay lại/ }));
    await waitFor(() => expect(screen.getByTestId("location").textContent).toContain("/admin/events-approval?status=PENDING"));
    expect(screen.getByRole("searchbox", { name: /Tìm sự kiện/ })).toHaveProperty("value", "EV-22");
    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả bộ lọc" }));
    expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?source=alert");
  });

  it.each([
    ["from=2026-09-30&to=2026-09-01", "Ngày bắt đầu không được sau ngày kết thúc."],
    ["from=2026-02-30", "Ngày trong bộ lọc không hợp lệ."],
  ])("shows invalid date filters instead of unfiltered rows: %s", async (query, message) => {
    renderFlow(`/admin/events-approval?${query}`);
    expect(screen.getByRole("alert").textContent).toBe(message);
    await screen.findByText("Hãy chọn khoảng ngày hợp lệ.");
    expect(screen.queryByText("Sự kiện một")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xóa tất cả bộ lọc" }));
    await screen.findByText("Sự kiện một");
  });

  it("opens a legacy notification deep link on the detail route and keeps its filters for Back", async () => {
    renderFlow("/admin/events-approval?status=UPDATE_PENDING&q=Hai&page=2&eventId=event-2");

    await screen.findByRole("heading", { name: "Sự kiện hai" });
    expect(screen.getByTestId("location").textContent).toBe(
      "/admin/events-approval/event-2?status=UPDATE_PENDING&q=Hai&page=2",
    );
    fireEvent.click(screen.getByRole("link", { name: /Quay lại/ }));
    expect(screen.getByTestId("location").textContent).toBe(
      "/admin/events-approval?status=UPDATE_PENDING&q=Hai&page=2",
    );
  });

  it("keeps rejection notes and the dialog open when the API rejects", async () => {
    vi.mocked(eventApi.rejectEvent).mockRejectedValueOnce(new Error("Server unavailable"));
    renderFlow("/admin/events-approval/event-1?status=PENDING");

    await screen.findByRole("heading", { name: "Sự kiện một" });
    fireEvent.click(screen.getByRole("button", { name: "Từ chối duyệt" }));
    fireEvent.change(screen.getByLabelText("Ghi chú cho Ban Tổ Chức"), { target: { value: "Cần sửa ảnh" } });
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận từ chối" }));

    await screen.findByRole("alert", { name: "Không thể từ chối sự kiện" });
    expect(screen.getByLabelText("Ghi chú cho Ban Tổ Chức")).toHaveProperty("value", "Cần sửa ảnh");
    expect(screen.getByTestId("location").textContent).toContain("/event-1");
    expect(eventApi.rejectEvent).toHaveBeenCalledWith(
      "event-1",
      expect.any(String),
      JSON.stringify({ flaggedFields: ["posterImage"], noteText: "Cần sửa ảnh" }),
    );
  });

  it("sends only one approval while confirmation is pending", async () => {
    let resolveApproval: (value: unknown) => void = () => undefined;
    vi.mocked(eventApi.approveEvent).mockImplementationOnce(() => new Promise((resolve) => {
      resolveApproval = resolve;
    }));
    renderFlow("/admin/events-approval/event-1?status=PENDING");

    await screen.findByRole("heading", { name: "Sự kiện một" });
    fireEvent.click(screen.getByRole("button", { name: "Phê duyệt sự kiện" }));
    const confirm = screen.getByRole("button", { name: "Xác nhận phê duyệt" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    expect(eventApi.approveEvent).toHaveBeenCalledTimes(1);
    resolveApproval({ ok: true });
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=PENDING"));
  });

  it("ignores an older detail response after navigation to another event", async () => {
    let resolveFirst: (value: Record<string, unknown>[]) => void = () => undefined;
    vi.mocked(eventApi.getApprovalEvents)
      .mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }))
      .mockResolvedValueOnce(events);
    renderFlow("/admin/events-approval/event-1");

    await waitFor(() => expect(eventApi.getApprovalEvents).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByRole("button", { name: "Next event" }));
    await screen.findByRole("heading", { name: "Sự kiện hai" });
    resolveFirst(events);
    await waitFor(() => expect(screen.getByRole("heading", { name: "Sự kiện hai" })).toBeTruthy());
    expect(screen.queryByRole("heading", { name: "Sự kiện một" })).toBeNull();
  });

  it("does not display rows or correct the page using the previous status response", async () => {
    const approved = Array.from({ length: 5 }, (_, index) => ({ id: `approved-${index}`, title: `Approved ${index}`, eventApprovalStatus: "APPROVED" }));
    let resolvePending: (value: Record<string, unknown>[]) => void = () => undefined;
    vi.mocked(eventApi.getApprovalEvents)
      .mockResolvedValueOnce(approved)
      .mockImplementationOnce(() => new Promise((resolve) => { resolvePending = resolve; }));
    renderFlow("/admin/events-approval?status=APPROVED&page=2");

    await screen.findByText("Approved 4");
    fireEvent.click(screen.getByRole("button", { name: "Pending page" }));
    expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=PENDING&page=2");
    expect(screen.queryByText("Approved 4")).toBeNull();
    resolvePending([{ id: "pending-1", title: "Pending new", eventApprovalStatus: "PENDING" }]);
    await screen.findByText("Pending new");
    await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/admin/events-approval?status=PENDING"));
  });

  it("does not label a draft as pending or allow approval", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockResolvedValueOnce([{ id: "draft-1", title: "Bản ghi nháp", eventApprovalStatus: "DRAFT" }]);
    renderFlow("/admin/events-approval/draft-1");

    await screen.findByRole("heading", { name: "Bản ghi nháp" });
    expect(screen.getByText("Bản nháp")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Phê duyệt sự kiện" })).toHaveProperty("disabled", true);
  });

  it("renders the backend approval response fields without fabricated legal or ticket data", async () => {
    vi.mocked(eventApi.getApprovalEvents).mockResolvedValueOnce([{
      id: "event-3",
      title: "Trao đổi DevDay",
      organizer: { name: "Codex" },
      locationName: "SVĐ Quân Khu 7",
      categoryName: "Hội thảo",
      eventApprovalStatus: "PENDING",
      showtimes: [{ id: "show-1", name: "Buổi sáng", startTime: "2026-10-10T09:00:00" }],
      tickets: [{ name: "Vé thường", price: 150000, totalQuantity: 200 }],
      taxName: "Codex Events",
      taxCode: "0123456789",
      accountHolder: "Codex Events",
      customQuestions: [{ id: "question-1", title: "Tên người tham dự", description: "Theo giấy tờ", isRequired: true }],
    }]);
    renderFlow("/admin/events-approval/event-3");

    await screen.findByRole("heading", { name: "Trao đổi DevDay" });
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.getByText("SVĐ Quân Khu 7")).toBeTruthy();
    expect(screen.getByText("Buổi sáng")).toBeTruthy();
    expect(screen.getByText("Vé thường")).toBeTruthy();
    expect(screen.getAllByText("Codex Events")).toHaveLength(2);
    expect(screen.getByText(/Tên người tham dự/)).toBeTruthy();
    expect(screen.getByText("Theo giấy tờ")).toBeTruthy();
    expect(screen.queryByText("999988887777")).toBeNull();
  });
});
