// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";

import "@/i18n";
import CreateEventStepper from "@/features/organizer/components/create-event/CreateEventStepper";

afterEach(cleanup);

const titles = ["1. Thông tin sự kiện", "2. Thời gian & Loại vé", "3. Cài đặt", "4. Thông tin thanh toán"];

describe("CreateEventStepper flagged steps", () => {
  it("marks a flagged step with a visible text label, not only a colour, and leaves the others alone", () => {
    render(<CreateEventStepper stepTitles={titles} currentStep={3} onStepClick={() => {}} flaggedSteps={[1, 4]} />);
    expect(screen.getAllByText("Cần chỉnh sửa")).toHaveLength(2);
    const first = screen.getByRole("button", { name: /1\. Thông tin sự kiện/ });
    const second = screen.getByRole("button", { name: /2\. Thời gian/ });
    expect(first.textContent).toContain("Cần chỉnh sửa");
    expect(second.textContent).not.toContain("Cần chỉnh sửa");
  });

  it("shows nothing extra without flags and still navigates", () => {
    const onStepClick = vi.fn();
    render(<CreateEventStepper stepTitles={titles} currentStep={1} onStepClick={onStepClick} />);
    expect(screen.queryByText("Cần chỉnh sửa")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /3\. Cài đặt/ }));
    expect(onStepClick).toHaveBeenCalledWith(3);
  });
});
