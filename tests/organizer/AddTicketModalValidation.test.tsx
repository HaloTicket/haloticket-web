// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import "@/i18n";
import { AddTicketModal } from "@/features/organizer/components/create-event/AddTicketModal";

afterEach(cleanup);

function setup() {
  const onSave = vi.fn();
  const onClose = vi.fn();
  render(<AddTicketModal onSave={onSave} onClose={onClose} />);
  fireEvent.change(screen.getByPlaceholderText("Ví dụ: Vé VVIP, Vé GA, Early Bird..."), { target: { value: "VIP" } });
  return { onSave };
}

const quantity = () => document.getElementById("ticket-issued-qty") as HTMLInputElement;
const priceInput = () => screen.getByText(/Giá vé \(VNĐ\)/).parentElement!.querySelector("input") as HTMLInputElement;
const maxOrder = () => screen.getByText("Số vé tối đa/đơn").parentElement!.querySelector("input") as HTMLInputElement;
const save = () => fireEvent.click(screen.getByRole("button", { name: /^(Lưu|Thêm|Tạo|Xác nhận)/ }));

describe("AddTicketModal validation", () => {
  it("saves a valid ticket", () => {
    const { onSave } = setup();
    fireEvent.change(priceInput(), { target: { value: "500000" } });
    save();
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave.mock.calls[0][0]).toMatchObject({ name: "VIP", price: 500000, totalQuantity: 100 });
  });

  it("rejects a negative price, a zero quantity and a per-order limit above the quantity", () => {
    const { onSave } = setup();

    fireEvent.change(priceInput(), { target: { value: "-1" } });
    save();
    expect(screen.getByText("Giá vé không được âm!")).toBeTruthy();

    fireEvent.change(priceInput(), { target: { value: "1000" } });
    fireEvent.change(quantity(), { target: { value: "0" } });
    save();
    expect(screen.getByText("Số lượng vé phát hành phải là số nguyên từ 1 trở lên!")).toBeTruthy();

    fireEvent.change(quantity(), { target: { value: "3" } });
    fireEvent.change(maxOrder(), { target: { value: "5" } });
    save();
    expect(screen.getByText("Số vé tối đa/đơn không được vượt quá số lượng vé phát hành!")).toBeTruthy();

    expect(onSave).not.toHaveBeenCalled();
  });
});
