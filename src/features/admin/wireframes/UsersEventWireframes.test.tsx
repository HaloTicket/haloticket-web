// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";

import { AdministratorUsersPreview, CustomerUsersPreview, EventReportsPreview, OrganizerUsersPreview } from "./UsersEventWireframes";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (value: string) => value }) }));

afterEach(cleanup);

describe("user and event report wireframes", () => {
  it("filters customers and switches their detail preview tabs", () => {
    render(<CustomerUsersPreview />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Tìm khách hàng" }), { target: { value: "Minh Anh" } });
    expect(screen.getByRole("button", { name: "Xem chi tiết KH-001" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xem chi tiết KH-002" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết KH-001" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.click(within(dialog).getByRole("tab", { name: "Lịch sử mua vé" }));
    expect(within(dialog).getByText("Dữ liệu đơn hàng sẽ xuất hiện tại đây khi có API.")).toBeTruthy();
  });

  it("shows organizer documents as a read-only preview", () => {
    render(<OrganizerUsersPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết BTC-002" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Hồ sơ pháp lý · chỉ xem")).toBeTruthy();
    expect(within(dialog).getByText("Đang xử lý tự động")).toBeTruthy();
  });

  it("allows role selection without claiming to grant access", () => {
    render(<AdministratorUsersPreview />);
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết QT-002" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByRole("combobox", { name: "Chọn vai trò để xem bố cục" }), { target: { value: "Hỗ trợ" } });
    expect(within(dialog).getByText(/Đang xem bố cục cho vai trò:/).textContent).toContain("Hỗ trợ");
    expect(within(dialog).getByText(/Thay đổi này chỉ nằm trong bản xem trước/)).toBeTruthy();
  });

  it("filters event samples by date and opens report details", () => {
    render(<EventReportsPreview />);
    fireEvent.change(screen.getByLabelText("Từ ngày"), { target: { value: "2026-09-20" } });
    expect(screen.queryByRole("button", { name: "Xem chi tiết SK-001" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Xem chi tiết SK-003" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("112.400.000 đ")).toBeTruthy();
    expect(within(dialog).getByText("Bản xem trước báo cáo chi tiết · số liệu minh họa")).toBeTruthy();
  });
});
