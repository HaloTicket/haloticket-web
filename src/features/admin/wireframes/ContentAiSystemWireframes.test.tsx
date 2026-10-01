// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { AiAssistantPreview, EventCategoriesPreview, SystemSettingsPreview } from "./ContentAiSystemWireframes";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

afterEach(cleanup);

describe("content, AI, and system settings wireframes", () => {
  it("adds a category to the local preview table with no saved-data claim", () => {
    render(<EventCategoriesPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Thêm danh mục" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("textbox", { name: "Tên danh mục" }), { target: { value: "Hội chợ" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Lưu bản xem trước" }));
    expect(screen.getByRole("button", { name: "Xem chi tiết Hội chợ" })).toBeTruthy();
    expect(screen.getByText("Danh mục chỉ được cập nhật trong bản xem trước.")).toBeTruthy();
  });

  it("marks assistant responses as demo with no connected source", () => {
    render(<AiAssistantPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Tóm tắt đơn hàng hôm nay" }));
    expect(screen.getByText("DEMO · phản hồi minh họa")).toBeTruthy();
    expect(screen.getByText(/Chưa có mô hình hoặc nguồn dữ liệu được kết nối/)).toBeTruthy();
    expect(screen.getByText(/Nguồn: chưa kết nối/)).toBeTruthy();
  });

  it("shows a local preview notice after saving system settings", () => {
    render(<SystemSettingsPreview />);
    fireEvent.change(screen.getByRole("textbox", { name: "Tên nền tảng hiển thị" }), { target: { value: "HaloTicket Demo" } });
    fireEvent.click(screen.getByRole("button", { name: "Lưu bản xem trước" }));
    expect(screen.getByRole("status").textContent).toContain("Chưa gửi đến máy chủ");
  });
});
