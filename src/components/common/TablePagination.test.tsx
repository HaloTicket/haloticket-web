// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TablePagination } from "./TablePagination";

describe("TablePagination", () => {
  it("exposes the shared page sizes and delegates changes to its controlled owner", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const props = {
      currentPage: 1,
      totalPages: 1,
      totalItems: 3,
      pageSize: 10,
      onPageChange,
      onPageSizeChange,
    };
    const { rerender } = render(<TablePagination {...props} />);

    const selector = screen.getByRole("combobox", { name: "Số dòng trên trang" });
    expect([...selector.querySelectorAll("option")].map(option => option.value)).toEqual(["10", "20", "50"]);
    expect(screen.getByText("1 - 3")).toBeInTheDocument();
    fireEvent.change(selector, { target: { value: "20" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
    rerender(<TablePagination {...props} pageSize={20} />);
    expect(screen.getByRole("combobox", { name: "Số dòng trên trang" })).toHaveValue("20");
    rerender(<TablePagination {...props} pageSize={10} />);
    expect(screen.getByRole("combobox", { name: "Số dòng trên trang" })).toHaveValue("10");
  });
});
