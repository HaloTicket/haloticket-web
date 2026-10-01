// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { AdminPagination } from "@/components/admin/AdminPagination";
import { AdminDataState } from "@/components/admin/AdminDataState";
import { AdminStatusTabs } from "@/components/admin/AdminStatusTabs";
import { AdminSelect } from "@/components/admin/AdminSelect";

afterEach(cleanup);

describe("admin data controls", () => {
  it("does not describe a failed request as empty and exposes retry", () => {
    const retry = vi.fn();
    render(<AdminDataState state="error" onRetry={retry} />);
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.queryByText(/chưa có dữ liệu/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thử lại/i }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("clamps an out-of-range page to the server total", () => {
    const onPageChange = vi.fn();
    render(<AdminPagination currentPage={9} totalPages={3} totalItems={25} pageSize={10} onPageChange={onPageChange} onPageSizeChange={vi.fn()} />);
    expect(screen.getByText(/21-25/)).toBeInTheDocument();
    expect(screen.getByText("3 / 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /trang tiếp/i })).toBeDisabled();
  });

  it("does not show zero for an unavailable tab count", () => {
    render(<AdminStatusTabs value="pending" options={[{ value: "pending", label: "Chờ duyệt" }]} onChange={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Chờ duyệt" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("lets a keyboard user change the labeled status select", () => {
    const onChange = vi.fn();
    render(<AdminSelect value="pending" onChange={onChange} ariaLabel="Lọc trạng thái" options={[{ value: "pending", label: "Chờ duyệt" }, { value: "approved", label: "Đã duyệt" }]} />);
    const select = screen.getByRole("combobox", { name: "Lọc trạng thái" });
    fireEvent.change(select, { target: { value: "approved" } });
    expect(onChange).toHaveBeenCalledWith("approved");
  });
});
