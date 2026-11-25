// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const xlsxWriteSpy = vi.hoisted(() => vi.fn());

vi.mock("xlsx", async (importOriginal) => {
  const actual = await importOriginal<typeof import("xlsx")>();
  return {
    ...actual,
    writeFile: (...args: Parameters<typeof actual.writeFile>) => xlsxWriteSpy(...args),
  };
});

const rechartsPropsLog: {
  barChartLayouts: string[];
  animations: boolean[];
  renderedCharts: string[];
  tooltipFormatted: string[];
} = {
  barChartLayouts: [],
  animations: [],
  renderedCharts: [],
  tooltipFormatted: [],
};

vi.mock("recharts", () => {
  const ResponsiveContainer = ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="recharts-responsive">{children}</div>
  );
  const BarChart = ({
    children,
    layout = "horizontal",
    data,
  }: {
    children?: React.ReactNode;
    layout?: string;
    data?: unknown[];
  }) => {
    rechartsPropsLog.renderedCharts.push("BarChart");
    rechartsPropsLog.barChartLayouts.push(layout);
    return (
      <div data-testid="recharts-bar-chart" data-layout={layout} data-points={data?.length ?? 0}>
        {children}
      </div>
    );
  };
  const Bar = ({
    dataKey,
    name,
    isAnimationActive = true,
  }: {
    dataKey?: string;
    name?: string;
    isAnimationActive?: boolean;
  }) => {
    rechartsPropsLog.animations.push(Boolean(isAnimationActive));
    return (
      <div
        data-testid={`recharts-bar-${String(dataKey)}`}
        data-name={name}
        data-animated={String(isAnimationActive)}
      />
    );
  };
  const PieChart = ({ children }: { children?: React.ReactNode }) => {
    rechartsPropsLog.renderedCharts.push("PieChart");
    return <div data-testid="recharts-pie-chart">{children}</div>;
  };
  const Pie = ({
    children,
    data,
    isAnimationActive = true,
  }: {
    children?: React.ReactNode;
    data?: unknown[];
    isAnimationActive?: boolean;
  }) => {
    rechartsPropsLog.animations.push(Boolean(isAnimationActive));
    return (
      <div
        data-testid="recharts-pie"
        data-slices={data?.length ?? 0}
        data-animated={String(isAnimationActive)}
      >
        {children}
      </div>
    );
  };
  const LineChart = ({ children, data }: { children?: React.ReactNode; data?: unknown[] }) => {
    rechartsPropsLog.renderedCharts.push("LineChart");
    return (
      <div data-testid="recharts-line-chart" data-points={data?.length ?? 0}>
        {children}
      </div>
    );
  };
  const Line = ({
    dataKey,
    name,
    isAnimationActive = true,
  }: {
    dataKey?: string;
    name?: string;
    isAnimationActive?: boolean;
  }) => {
    rechartsPropsLog.animations.push(Boolean(isAnimationActive));
    return (
      <div
        data-testid={`recharts-line-${String(dataKey)}`}
        data-name={name}
        data-animated={String(isAnimationActive)}
      />
    );
  };
  const Tooltip = ({
    formatter,
  }: {
    formatter?: (value: number, name: string) => unknown;
  }) => {
    if (formatter) {
      const res = formatter(1500000, "test");
      const text = Array.isArray(res) ? String(res[0]) : String(res);
      rechartsPropsLog.tooltipFormatted.push(text);
    }
    return <div data-testid="recharts-tooltip" />;
  };
  const Null = () => null;
  return {
    ResponsiveContainer,
    BarChart,
    Bar,
    PieChart,
    Pie,
    Cell: Null,
    LineChart,
    Line,
    XAxis: Null,
    YAxis: Null,
    CartesianGrid: Null,
    Tooltip,
    Legend: Null,
  };
});

import * as XLSX from "xlsx";
import i18n from "@/i18n";
import type { OrganizerChatMessage } from "@/types/ai";
import { OrganizerAIChatMessage } from "@/components/common/OrganizerAIChatWidget/OrganizerAIChatMessage";

const renderMessage = (
  message: OrganizerChatMessage,
  props: { question?: string; isExpanded?: boolean; onChooseFollowUp?: (text: string) => void } = {},
) =>
  render(
    <MemoryRouter>
      <OrganizerAIChatMessage message={message} {...props} />
    </MemoryRouter>,
  );

const originalMatchMedia = window.matchMedia;
const originalCreateObjectURL = Object.getOwnPropertyDescriptor(URL, "createObjectURL");
const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(URL, "revokeObjectURL");

beforeEach(async () => {
  xlsxWriteSpy.mockReset();
  rechartsPropsLog.barChartLayouts = [];
  rechartsPropsLog.animations = [];
  rechartsPropsLog.renderedCharts = [];
  rechartsPropsLog.tooltipFormatted = [];
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: undefined,
  });
  await i18n.changeLanguage("vi");
});

afterEach(() => {
  cleanup();
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    configurable: true,
    value: originalMatchMedia,
  });
  if (originalCreateObjectURL) {
    Object.defineProperty(URL, "createObjectURL", originalCreateObjectURL);
  } else {
    Reflect.deleteProperty(URL, "createObjectURL");
  }
  if (originalRevokeObjectURL) {
    Object.defineProperty(URL, "revokeObjectURL", originalRevokeObjectURL);
  } else {
    Reflect.deleteProperty(URL, "revokeObjectURL");
  }
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("OrganizerAIChatMessage - Bubble Layout, User Avatar Removal, and Footer", () => {
  it("removes user avatar, constrains plain text bubbles to 85%, expands rich & markdown-table bubbles to full width, and formats HH:mm", () => {
    const userMsg: OrganizerChatMessage = {
      id: "u1",
      sender: "user",
      text: "So sánh doanh thu các hạng vé",
      timestamp: new Date("2026-11-25T09:05:00Z"),
    };
    const { container: userContainer, unmount: unmountUser } = renderMessage(userMsg);
    expect(userContainer.querySelector("svg.lucide-user")).toBeNull();
    expect(screen.getByTestId("organizer-user-bubble").className).toContain("max-w-[85%]");
    unmountUser();

    const plainAiMsg: OrganizerChatMessage = {
      id: "a1",
      sender: "ai",
      text: "Xin chào Ban tổ chức!",
      timestamp: new Date("2026-11-25T09:05:00Z"),
    };
    const { container: plainContainer, unmount: unmountPlain } = renderMessage(plainAiMsg);
    expect(plainContainer.querySelector('img[src="/assets/brand/logo-ai.png"]')).not.toBeNull();
    expect(screen.getByTestId("organizer-ai-bubble").className).toContain("max-w-[85%]");
    expect(screen.getByTestId("organizer-ai-time").textContent).toBe("16:05");
    unmountPlain();

    const mdTableMsg: OrganizerChatMessage = {
      id: "a-md-table",
      sender: "ai",
      text: "| Hạng vé | Đã bán |\n| --- | --- |\n| VIP | 120 |",
      timestamp: new Date("2026-11-25T09:05:00Z"),
    };
    renderMessage(mdTableMsg);
    expect(screen.getByTestId("organizer-ai-bubble").className).toContain("w-full");
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const tableEl = screen
      .getByRole("region", { name: /Bảng số liệu trong câu trả lời/i })
      .querySelector("table");
    expect(tableEl?.className).toContain("[&_tr>*:first-child]:sticky");
  });

  it("copies assistant reply text with feedback and resets after 2 seconds without colliding with draft copy", () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    const msg: OrganizerChatMessage = {
      id: "a-copy",
      sender: "ai",
      text: "Nhận xét phân tích quan trọng.",
      drafts: [{ title: "Thông báo khán giả", content: "Nội dung bản nháp thông báo." }],
      timestamp: new Date("2026-11-25T09:30:00Z"),
    };

    renderMessage(msg);

    const copyReplyBtn = screen.getByRole("button", { name: "Sao chép" });
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const copyDraftBtn = screen.getByRole("button", { name: /Sao chép bản nháp/i });

    fireEvent.click(copyReplyBtn);
    expect(writeText).toHaveBeenCalledWith("Nhận xét phân tích quan trọng.");
    expect(screen.getByText("Đã chép")).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(2100);
    });
    expect(screen.queryByText("Đã chép")).toBeNull();

    fireEvent.click(copyDraftBtn);
    expect(writeText).toHaveBeenCalledWith("Nội dung bản nháp thông báo.");
    expect(screen.getByText("Đã sao chép")).toBeTruthy();
  });
});

describe("OrganizerAIChatMessage - Reply details and follow-up", () => {
  it("renders inline bullet characters as separate list items and leaves inline code intact", () => {
    renderMessage({
      id: "inline-bullets", sender: "ai", timestamp: new Date(),
      text: "Doanh thu hôm nay chưa tăng.\n• **Quan sát:** Doanh thu là 0 đồng. • Có thể chưa có đơn.\n• Kiểm tra `A • B`.",
    });

    expect(screen.getAllByRole("listitem").map((item) => item.textContent?.trim())).toEqual([
      "Quan sát: Doanh thu là 0 đồng.",
      "Có thể chưa có đơn.",
      "Kiểm tra A • B.",
    ]);
    expect(screen.getByText("A • B").tagName).toBe("CODE");
  });

  it("keeps the first bullet readable when long list details are collapsed", () => {
    const first = "Doanh thu hôm nay chưa tăng.";
    const explanation = "Kiểm tra lại thời điểm khách đã thanh toán và trạng thái của các đơn trong hôm nay. ".repeat(5).trim();
    renderMessage({
      id: "long-inline-bullets", sender: "ai", timestamp: new Date(),
      text: `• ${first} • ${explanation}`,
    });

    expect(screen.getByRole("listitem").textContent).toBe(first);
    expect(screen.queryByText(explanation)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByText(explanation)).toBeTruthy();
  });

  it("shows a short summary, expands the full reply, and offers an editable follow-up", () => {
    const choose = vi.fn();
    const detail = "Chi tiết ngân sách cho từng kênh quảng bá. ".repeat(12);
    renderMessage({
      id: "long-analysis", sender: "ai", timestamp: new Date(),
      text: `**Ưu tiên thử nghiệm nhỏ.**\n\n${detail}`,
      followUp: {
        question: "Bạn muốn ưu tiên nhóm khán giả nào?",
        options: [{ label: "Sinh viên", message: "Khán giả chính là sinh viên" }],
      },
    }, { onChooseFollowUp: choose });

    expect(screen.getByText("Ưu tiên thử nghiệm nhỏ.")).toBeTruthy();
    expect(screen.getByText("Gợi ý")).toBeTruthy();
    expect(screen.queryByText(detail.trim())).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByText(detail.trim())).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Thu gọn chi tiết" }));
    expect(screen.queryByText(detail.trim())).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Sinh viên" }));
    expect(choose).toHaveBeenCalledWith("Khán giả chính là sinh viên");
  });
});

describe("OrganizerAIChatMessage - KPI Strip, True Period Delta, and Exclusive Boundaries", () => {
  it("renders open 2x2 KPI cards with true period delta only for complete nonzero baselines, excludes partial metrics from grouped period bars, and displays inclusive midnight dates", () => {
    const msg: OrganizerChatMessage = {
      id: "kpi-1",
      sender: "ai",
      text: "So sánh tuần trước và tuần này",
      totals: [
        {
          key: "ticket_sales_revenue",
          value: 50000000,
          unit: "VND",
          period: { from: "2026-11-08T00:00:00+07:00", to: "2026-11-15T00:00:00+07:00" },
          completeness: "complete",
        },
        {
          key: "ticket_sales_revenue",
          value: 40000000,
          unit: "VND",
          period: { from: "2026-11-01T00:00:00+07:00", to: "2026-11-08T00:00:00+07:00" },
          completeness: "complete",
        },
        {
          key: "tickets_sold",
          value: 180,
          unit: "count",
          period: { from: "2026-11-08T00:00:00+07:00", to: "2026-11-15T00:00:00+07:00" },
          completeness: "partial",
        },
        {
          key: "tickets_sold",
          value: 150,
          unit: "count",
          period: { from: "2026-11-01T00:00:00+07:00", to: "2026-11-08T00:00:00+07:00" },
          completeness: "complete",
        },
        {
          key: "paid_orders",
          value: 35,
          unit: "count",
          period: { from: "2026-11-08T00:00:00+07:00", to: "2026-11-15T00:00:00+07:00" },
          completeness: "complete",
        },
        {
          key: "paid_orders",
          value: 0,
          unit: "count",
          period: { from: "2026-11-01T00:00:00+07:00", to: "2026-11-08T00:00:00+07:00" },
          completeness: "complete",
        },
        {
          key: "check_ins",
          value: null,
          unit: "count",
          period: { from: "2026-11-08T00:00:00+07:00", to: "2026-11-15T00:00:00+07:00" },
          completeness: "missing",
        },
      ],
      timestamp: new Date("2026-11-15T03:00:00Z"),
    };

    renderMessage(msg, { question: "Tổng hợp doanh thu" });

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const totalsSection = screen.getByTestId("chat-totals-section");
    expect(totalsSection.tagName).not.toBe("DETAILS");

    const revCard = screen.getByTestId("chat-kpi-card-ticket_sales_revenue");
    expect(revCard.textContent).toContain("Giá trị vé bán trước voucher");
    expect(revCard.textContent).toContain("50.000.000");
    expect(revCard.textContent).toContain("+25%");
    expect(revCard.textContent).toContain("08/11/2026 - 14/11/2026");

    const soldCard = screen.getByTestId("chat-kpi-card-tickets_sold");
    expect(soldCard.textContent).toContain("Một phần");
    expect(soldCard.textContent).toContain("≥ 180");
    expect(soldCard.textContent).not.toMatch(/[+-]\d+(\.\d+)?%/);

    const ordersCard = screen.getByTestId("chat-kpi-card-paid_orders");
    expect(ordersCard.textContent).toContain("35");
    expect(ordersCard.textContent).not.toMatch(/[+-]\d+(\.\d+)?%/);

    const checkinCard = screen.getByTestId("chat-kpi-card-check_ins");
    expect(checkinCard.textContent).toContain("Thiếu dữ liệu");
    expect(checkinCard.textContent).not.toBe("0");

    expect(screen.getByTestId("recharts-bar-previousValue")).toBeTruthy();
    expect(screen.getByTestId("recharts-bar-currentValue")).toBeTruthy();
  });

  it("does not subtract a day when period end is an intraday timestamp", () => {
    const msg: OrganizerChatMessage = {
      id: "kpi-intraday",
      sender: "ai",
      text: "7 ngày qua",
      totals: [
        {
          key: "tickets_sold",
          value: 42,
          unit: "count",
          period: { from: "2026-11-18T14:20:00+07:00", to: "2026-11-25T14:20:00+07:00" },
          completeness: "complete",
        },
      ],
      timestamp: new Date("2026-11-25T07:20:00Z"),
    };

    renderMessage(msg);
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const soldCard = screen.getByTestId("chat-kpi-card-tickets_sold");
    expect(soldCard.textContent).toContain("18/11/2026 - 25/11/2026");
  });
});

describe("OrganizerAIChatMessage - Open Warnings, Empty UX, and Legacy Actions", () => {
  it("renders warnings openly with valid router action links for orders, showtimes, and overview", () => {
    const msg: OrganizerChatMessage = {
      id: "warn-1",
      sender: "ai",
      text: "Phát hiện 3 cảnh báo",
      warnings: [
        {
          code: "paid_order_missing_tickets",
          kind: "event",
          event_id: "evt-1",
          event_title: "Rock Fest",
          event_status: "LIVE",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: null,
          end_time: null,
          metrics: [{ key: "missing_tickets", value: 3, unit: "count", period: null, completeness: "partial" }],
        },
        {
          code: "low_stock",
          kind: "ticket_type",
          event_id: "evt-2",
          event_title: "Indie Night",
          event_status: "APPROVED",
          showtime_id: "st-1",
          showtime_title: "Suất Tối",
          ticket_type_id: "tt-vip",
          ticket_type_title: "VIP",
          start_time: null,
          end_time: null,
          metrics: [{ key: "available_tickets", value: 2, unit: "count", period: null, completeness: "complete" }],
        },
        {
          code: "slow_showtime",
          kind: "showtime",
          event_id: "evt-3",
          event_title: "Jazz Club",
          event_status: "APPROVED",
          showtime_id: "st-2",
          showtime_title: "Suất Chiều",
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: null,
          end_time: null,
          metrics: [{ key: "occupancy_rate", value: 12.5, unit: "percent", period: null, completeness: "complete" }],
        },
      ],
      timestamp: new Date("2026-11-25T09:00:00Z"),
    };

    renderMessage(msg);

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    const warningsSection = screen.getByTestId("chat-warnings-section");
    expect(warningsSection.tagName).not.toBe("DETAILS");

    const missingCard = screen.getByTestId("chat-warning-card-paid_order_missing_tickets");
    expect(missingCard.textContent).toContain("≥ 3");
    expect(missingCard.querySelector("a")?.getAttribute("href")).toBe("/organizer/events/evt-1/manage/orders");

    const lowStockCard = screen.getByTestId("chat-warning-card-low_stock");
    expect(lowStockCard.querySelector("a")?.getAttribute("href")).toBe("/organizer/events/evt-2/manage/showtimes");

    const slowCard = screen.getByTestId("chat-warning-card-slow_showtime");
    expect(slowCard.querySelector("a")?.getAttribute("href")).toBe("/organizer/events/evt-3/manage/overview");
  });

  it("keeps the natural empty reply and preserves legacy DISPLAY_VOUCHER_CARD / DISPLAY_KPI_SUMMARY actions", () => {
    const emptyMsg: OrganizerChatMessage = {
      id: "empty-1",
      sender: "ai",
      text: "Không có sự kiện khớp.",
      status: "empty",
      cards: [],
      actions: [
        {
          action: "DISPLAY_VOUCHER_CARD",
          database_data: {
            voucher_name: "Ưu đãi Mở Bán",
            voucher_code: "HALO20",
            discount_percent: 20,
            min_order_value: 200000,
            max_usage_count: 50,
          },
        },
      ],
      timestamp: new Date("2026-11-25T09:00:00Z"),
    };

    renderMessage(emptyMsg);

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.queryByTestId("chat-empty-status")).toBeNull();
    expect(screen.getByText(/Ưu đãi Mở Bán/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /HALO20/ })).toBeTruthy();
  });
});

describe("OrganizerInlineChart, Sticky Comparison Matrix, Progress Thresholds, and Exports", () => {
  it("renders Recharts inline chart for comparable ticket tiers, disables Trend tab even when cards have start_time, switches 210px/300px height, and renders sticky matrix with percent progress thresholds", () => {
    const msg: OrganizerChatMessage = {
      id: "chart-tiers",
      sender: "ai",
      text: "Cơ cấu doanh thu theo hạng vé",
      cards: [
        {
          kind: "event",
          event_id: "evt-10",
          event_title: "Đại nhạc hội Mùa Hè",
          event_status: "LIVE",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: "2026-12-20T19:00:00+07:00",
          end_time: "2026-12-20T22:00:00+07:00",
          metrics: [
            { key: "ticket_sales_revenue", value: 90000000, unit: "VND", period: null, completeness: "complete" },
            { key: "occupancy_rate", value: 85, unit: "percent", period: null, completeness: "complete" },
          ],
        },
        {
          kind: "ticket_type",
          event_id: "evt-10",
          event_title: "Đại nhạc hội Mùa Hè",
          event_status: "LIVE",
          showtime_id: "st-1",
          showtime_title: "Đêm 1",
          ticket_type_id: "tt-1",
          ticket_type_title: "Hạng vé VVIP Đặc Biệt",
          start_time: "2026-12-20T19:00:00+07:00",
          end_time: null,
          metrics: [
            { key: "ticket_sales_revenue", value: 60000000, unit: "VND", period: null, completeness: "complete" },
            { key: "occupancy_rate", value: 88, unit: "percent", period: null, completeness: "complete" },
          ],
        },
        {
          kind: "ticket_type",
          event_id: "evt-10",
          event_title: "Đại nhạc hội Mùa Hè",
          event_status: "LIVE",
          showtime_id: "st-1",
          showtime_title: "Đêm 1",
          ticket_type_id: "tt-2",
          ticket_type_title: "Standard",
          start_time: "2026-12-21T19:00:00+07:00",
          end_time: null,
          metrics: [
            { key: "ticket_sales_revenue", value: 25000000, unit: "VND", period: null, completeness: "complete" },
            { key: "occupancy_rate", value: 55, unit: "percent", period: null, completeness: "complete" },
          ],
        },
        {
          kind: "ticket_type",
          event_id: "evt-10",
          event_title: "Đại nhạc hội Mùa Hè",
          event_status: "LIVE",
          showtime_id: "st-1",
          showtime_title: "Đêm 1",
          ticket_type_id: "tt-3",
          ticket_type_title: "Early Bird",
          start_time: "2026-12-22T19:00:00+07:00",
          end_time: null,
          metrics: [
            { key: "ticket_sales_revenue", value: 5000000, unit: "VND", period: null, completeness: "complete" },
            { key: "occupancy_rate", value: 20, unit: "percent", period: null, completeness: "complete" },
          ],
        },
      ],
      timestamp: new Date("2026-11-25T09:00:00Z"),
    };

    const { rerender } = render(
      <MemoryRouter>
        <OrganizerAIChatMessage
          message={msg}
          question="So sánh doanh thu từng hạng vé"
          isExpanded={false}
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));
    expect(screen.getByTestId("organizer-inline-chart")).toBeTruthy();

    const viewport = screen.getByTestId("organizer-chart-viewport");
    expect(viewport.style.height).toBe("210px");
    const barChart = screen.getByTestId("recharts-bar-chart");
    expect(barChart.getAttribute("data-layout")).toBe("vertical");
    expect(barChart.getAttribute("data-points")).toBe("3");

    expect(rechartsPropsLog.tooltipFormatted.some((t) => t.includes("1.500.000"))).toBe(true);

    const tabBar = screen.getByRole("tab", { name: "Cột" }) as HTMLButtonElement;
    const tabDonut = screen.getByRole("tab", { name: "Tỷ trọng" }) as HTMLButtonElement;
    const tabLine = screen.getByRole("tab", { name: "Xu hướng" }) as HTMLButtonElement;
    const tabTable = screen.getByRole("tab", { name: "Bảng" }) as HTMLButtonElement;

    expect(tabBar.disabled).toBe(false);
    expect(tabDonut.disabled).toBe(false);
    expect(tabLine.disabled).toBe(true);
    expect(tabTable.disabled).toBe(false);

    fireEvent.click(tabDonut);
    expect(screen.getByTestId("recharts-pie").getAttribute("data-slices")).toBe("3");

    rerender(
      <MemoryRouter>
        <OrganizerAIChatMessage
          message={msg}
          question="So sánh doanh thu từng hạng vé"
          isExpanded={true}
        />
      </MemoryRouter>,
    );
    expect(screen.getByTestId("organizer-chart-viewport").style.height).toBe("300px");

    const cardsMatrix = screen.getByTestId("chat-cards-section");
    const firstHeader = cardsMatrix.querySelector("thead th");
    expect(firstHeader?.className).toContain("sticky");
    expect(firstHeader?.className).toContain("left-0");
    const numericCell = cardsMatrix.querySelector("tbody td");
    expect(numericCell?.className).toContain("text-right");
    expect(numericCell?.className).toContain("tabular-nums");

    const progressBars = cardsMatrix.querySelectorAll('[role="progressbar"]');
    expect(progressBars.length).toBeGreaterThanOrEqual(3);
    const barClasses = Array.from(progressBars).map((el) => el.innerHTML + " " + el.className);
    expect(barClasses.some((c) => c.includes("bg-emerald-500"))).toBe(true);
    expect(barClasses.some((c) => c.includes("bg-blue-500"))).toBe(true);
    expect(barClasses.some((c) => c.includes("bg-amber-500"))).toBe(true);
  });

  it("uses typed ISO YYYY-MM-DD daily DISPLAY_DATA_TABLE as the single primary chart (no duplicate fallback), localizes known metric keys, respects prefers-reduced-motion, and exports sanitized XLSX & CSV", async () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes("prefers-reduced-motion"),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    let capturedCsvBlob: Blob | null = null;
    const createObjectUrlMock = vi.fn((obj: Blob | MediaSource) => {
      capturedCsvBlob = obj as Blob;
      return "blob:haloticket-test";
    });
    const revokeObjectUrlMock = vi.fn();
    Object.defineProperty(URL, "createObjectURL", {
      configurable: true,
      writable: true,
      value: createObjectUrlMock,
    });
    Object.defineProperty(URL, "revokeObjectURL", {
      configurable: true,
      writable: true,
      value: revokeObjectUrlMock,
    });
    const anchorClickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    // Message includes BOTH cards/totals AND a typed daily DISPLAY_DATA_TABLE action!
    const dailyMsg: OrganizerChatMessage = {
      id: "dt-daily-1",
      sender: "ai",
      text: "Diễn biến doanh thu 3 ngày qua",
      totals: [
        {
          key: "ticket_sales_revenue",
          value: 45000000,
          unit: "VND",
          period: { from: "2026-11-19T00:00:00+07:00", to: "2026-11-22T00:00:00+07:00" },
          completeness: "complete",
        },
      ],
      cards: [
        {
          kind: "event",
          event_id: "e1",
          event_title: "Concert A",
          event_status: "LIVE",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: "2026-12-01T19:00:00+07:00",
          end_time: null,
          metrics: [{ key: "ticket_sales_revenue", value: 30000000, unit: "VND", period: null, completeness: "complete" }],
        },
        {
          kind: "event",
          event_id: "e2",
          event_title: "Concert B",
          event_status: "LIVE",
          showtime_id: null,
          showtime_title: null,
          ticket_type_id: null,
          ticket_type_title: null,
          start_time: "2026-12-02T19:00:00+07:00",
          end_time: null,
          metrics: [{ key: "ticket_sales_revenue", value: 15000000, unit: "VND", period: null, completeness: "complete" }],
        },
      ],
      actions: [
        {
          action: "DISPLAY_DATA_TABLE",
          database_data: [
            { date: "2026-11-19", ticket_sales_revenue: 12000000, "=note": "=HYPERLINK(\"http://bad\")" },
            { date: "2026-11-20", ticket_sales_revenue: 15000000, "=note": "ok" },
            { date: "2026-11-21", ticket_sales_revenue: 18000000, "=note": "+SUM(A1:A2)" },
          ],
        },
      ],
      timestamp: new Date("2026-11-25T09:00:00Z"),
    };

    renderMessage(dailyMsg, { question: "Diễn biến doanh thu theo ngày" });
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết" }));

    // Exactly ONE inline chart rendered (no duplicate fallback chart for DISPLAY_DATA_TABLE!)
    const allCharts = screen.getAllByTestId("organizer-inline-chart");
    expect(allCharts).toHaveLength(1);
    expect(allCharts[0].getAttribute("aria-label")).toBe("Giá trị vé bán trước voucher");

    const tabDonut = screen.getByRole("tab", { name: "Tỷ trọng" }) as HTMLButtonElement;
    const tabLine = screen.getByRole("tab", { name: "Xu hướng" }) as HTMLButtonElement;
    const tabTable = screen.getByRole("tab", { name: "Bảng" }) as HTMLButtonElement;
    expect(tabDonut.disabled).toBe(true);
    expect(tabLine.disabled).toBe(false);

    // Primary LineChart rendered with localized series name and reduced motion respected
    const lineSeries = screen.getByTestId("recharts-line-value");
    expect(lineSeries.getAttribute("data-name")).toBe("Giá trị vé bán trước voucher");
    expect(rechartsPropsLog.animations.every((active) => active === false)).toBe(true);

    // Switch to Bảng tab -> localized "Ngày" and "Giá trị vé bán trước voucher" headers
    fireEvent.click(tabTable);
    expect(allCharts[0].textContent).toContain("Ngày");
    expect(allCharts[0].textContent).toContain("Giá trị vé bán trước voucher");

    // Export XLSX & CSV -> formula injection neutralized on both column label `=note` and cell values!
    fireEvent.click(screen.getByRole("button", { name: /Xuất Excel/i }));
    expect(xlsxWriteSpy).toHaveBeenCalledTimes(1);
    const workbook = xlsxWriteSpy.mock.calls[0][0] as XLSX.WorkBook;
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    expect(firstSheet.A1.v).toBe("Ngày");
    expect(firstSheet.B1.v).toBe("Giá trị vé bán trước voucher");
    expect(firstSheet.C1.v).toBe("'=note");
    expect(firstSheet.C2.v).toBe("'=HYPERLINK(\"http://bad\")");

    fireEvent.click(screen.getByRole("button", { name: /Xuất CSV/i }));
    expect(anchorClickSpy).toHaveBeenCalledTimes(1);
    expect(createObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(revokeObjectUrlMock).toHaveBeenCalledTimes(1);
    expect(capturedCsvBlob).not.toBeNull();
    const csvText = await capturedCsvBlob!.text();
    expect(csvText).toContain("'=note");
    expect(csvText).toContain("'+SUM(A1:A2)");
  });
});
