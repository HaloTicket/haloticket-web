// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const getApprovalEvents = vi.fn();
const getRiskBatch = vi.fn();

vi.mock("@/services/eventApi", () => ({ eventApi: { getApprovalEvents: (...a: unknown[]) => getApprovalEvents(...a) } }));
vi.mock("@/services/aiApi", () => ({ aiApi: { getRiskBatch: (...a: unknown[]) => getRiskBatch(...a) } }));

import "@/i18n";
import { EventApproval } from "@/features/admin/EventApproval";

const ev = (id: string, title: string, status = "PENDING", startTime = "2027-01-01T10:00:00") => ({ id, title, eventApprovalStatus: status, startTime, organizer: { name: "BTC" } });
const assess = (score: number, level: string, complete = true, ai = "ran") => ({
  risk_score: score, risk_level: level, complete, coverage: { rules: true, signals: { assessed: 6, total: 6, missing: [] }, ai },
});

function renderList() {
  return render(<MemoryRouter><EventApproval /></MemoryRouter>);
}
const titles = () => screen.getAllByRole("row").slice(1).map((row) => within(row).queryByText(/^Sự kiện [A-Z]$/)?.textContent).filter(Boolean);

async function choose(currentLabel: string, option: string) {
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${currentLabel}$`) }));
  fireEvent.pointerDown(await screen.findByText(option));
}

beforeEach(() => {
  getApprovalEvents.mockReset();
  getRiskBatch.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
  getApprovalEvents.mockResolvedValue([ev("a", "Sự kiện A", "PENDING", "2027-03-01T10:00:00"), ev("b", "Sự kiện B", "PENDING", "2027-02-01T10:00:00"), ev("c", "Sự kiện C", "PENDING", "2027-01-01T10:00:00"), ev("d", "Sự kiện D", "APPROVED")]);
  getRiskBatch.mockResolvedValue({
    assessments: { a: assess(10, "LOW"), b: assess(80, "HIGH", false, "skipped"), c: assess(40, "MEDIUM", false, "skipped") },
    missing: [],
  });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

describe("review queue risk", () => {
  it("asks for the waiting files only and shows a badge per row, highest risk first on the PENDING tab", async () => {
    renderList();
    await screen.findByTestId("risk-cell-b");
    await waitFor(() => expect(getRiskBatch).toHaveBeenCalled());
    expect(getRiskBatch.mock.calls[0][0].sort()).toEqual(["a", "b", "c"]); // the approved file is not scored
    await waitFor(() => expect(within(screen.getByTestId("risk-cell-b")).getByTestId("risk-badge").getAttribute("data-level")).toBe("HIGH"));
    expect(titles()).toEqual(["Sự kiện B", "Sự kiện C", "Sự kiện A"]);
  });

  it("filters by risk level and by 'not fully scored'", async () => {
    renderList();
    await waitFor(() => expect(within(screen.getByTestId("risk-cell-b")).getByTestId("risk-badge")).toBeTruthy());
    await choose("Mọi mức rủi ro", "Rủi ro cao");
    await waitFor(() => expect(titles()).toEqual(["Sự kiện B"]));
    await choose("Rủi ro cao", "Chưa chấm đủ");
    await waitFor(() => expect(titles()).toEqual(["Sự kiện B", "Sự kiện C"])); // complete === false
  });

  it("can switch back to the date order", async () => {
    renderList();
    await waitFor(() => expect(within(screen.getByTestId("risk-cell-b")).getByTestId("risk-badge")).toBeTruthy());
    await choose("Rủi ro cao trước", "Mới nhất trước");
    await waitFor(() => expect(titles()).toEqual(["Sự kiện A", "Sự kiện B", "Sự kiện C"]));
  });

  it("keeps the list working when the risk request fails, and retries", async () => {
    getRiskBatch.mockRejectedValueOnce({ response: { status: 503 } });
    renderList();
    await screen.findByText("Không tải được mức rủi ro của danh sách.");
    expect(titles()).toHaveLength(3); // the files are all there, only the badges are missing
    expect(within(screen.getByTestId("risk-cell-a")).getByText("Chưa chấm")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Thử lại" }));
    await waitFor(() => expect(screen.queryByText("Không tải được mức rủi ro của danh sách.")).toBeNull());
    await waitFor(() => expect(within(screen.getByTestId("risk-cell-a")).getByTestId("risk-badge").getAttribute("data-level")).toBe("LOW"));
  });

  it("scores in chunks of 30 files", async () => {
    getApprovalEvents.mockResolvedValue(Array.from({ length: 65 }, (_, i) => ev(`e${i}`, `Sự kiện ${i}`)));
    getRiskBatch.mockResolvedValue({ assessments: {}, missing: [] });
    renderList();
    await waitFor(() => expect(getRiskBatch).toHaveBeenCalledTimes(3));
    expect(getRiskBatch.mock.calls.map((c) => c[0].length)).toEqual([30, 30, 5]);
  });
});
