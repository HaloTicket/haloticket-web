// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import { PaymentTransactionsPreview, PricePolicyPreview } from "./FinanceMarketWireframes";

afterEach(cleanup);

describe("finance wireframes", () => {
  it("filters the transaction sample by status", () => {
    render(<PaymentTransactionsPreview />);
    fireEvent.click(screen.getByRole("tab", { name: "Thất bại" }));
    expect(screen.getByRole("button", { name: "Xem chi tiết GD-250824-029" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Xem chi tiết GD-250824-031" })).toBeNull();
  });

  it("recalculates the sample resale price cap without saving", () => {
    render(<PricePolicyPreview />);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Mức cộng tối đa so với giá gốc (%)" }), { target: { value: "20" } });
    expect(screen.getByText("1.440.000 ₫")).toBeTruthy();
    expect(screen.getByText(/không được lưu/i)).toBeTruthy();
  });
});
