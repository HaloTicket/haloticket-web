// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import "@/i18n";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { EventSchedule } from "@/features/events/components/detail/EventSchedule";
import type { EventDetailData } from "@/types";

afterEach(cleanup);

it.each(["2020-01-01T00:00:00", [2020, 1, 1, 0, 0]])("keeps closed sale prices collapsed for %j", (saleEndTime) => {
  const select = vi.fn();
  const event = {
    showtimes: [{ id: "closed", startTime: "2030-01-01T19:00:00", saleEndTime }],
    ticketTypes: [{ name: "Admission", price: 199000, totalQuantity: 10 }],
  } as unknown as EventDetailData;
  render(<EventSchedule event={event} onSelectTicket={select} />);
  const closedButton = screen.getByText("NGƯNG BÁN ONLINE");
  fireEvent.click(closedButton.parentElement!);
  expect(screen.queryByText("Thông tin vé")).not.toBeInTheDocument();
  expect(select).not.toHaveBeenCalled();
});
