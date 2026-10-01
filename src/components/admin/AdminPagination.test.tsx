// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AdminPagination } from "./AdminPagination";

vi.mock("react-i18next", () => ({ useTranslation: () => ({ t: (key: string) => key }) }));

describe("AdminPagination", () => {
  it("keeps page size controlled by the latest props and offers only shared sizes", () => {
    const onPageChange = vi.fn();
    const onPageSizeChange = vi.fn();
    const props = {
      currentPage: 1,
      totalItems: 3,
      pageSize: 10,
      onPageChange,
      onPageSizeChange,
    };
    const { rerender } = render(<AdminPagination {...props} />);
    const selector = screen.getByRole("combobox", { name: "Số dòng trên trang" });

    expect([...selector.querySelectorAll("option")].map(option => option.value)).toEqual(["10", "20", "50"]);
    expect(screen.getByText("1-3")).toBeInTheDocument();

    fireEvent.change(selector, { target: { value: "20" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);

    rerender(<AdminPagination {...props} pageSize={20} />);
    expect(screen.getByRole("combobox", { name: "Số dòng trên trang" })).toHaveValue("20");
    rerender(<AdminPagination {...props} pageSize={10} />);
    expect(screen.getByRole("combobox", { name: "Số dòng trên trang" })).toHaveValue("10");
  });
});
